/**
 * Serviço de WebSocket para notificações em tempo real
 */
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

// Mapa de usuários conectados: userId -> Set<socketId>
const connectedUsers = new Map<string, Set<string>>();

// Instância do servidor Socket.io
let io: SocketServer | null = null;

/**
 * Inicializar servidor WebSocket
 */
export function initializeWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticação
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Token de autenticação não fornecido'));
    }

    try {
      const decoded = jwt.verify(token as string, JWT_SECRET) as { userId: string; email: string };
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (error) {
      return next(new Error('Token inválido ou expirado'));
    }
  });

  // Handler de conexão
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    console.log(`[WebSocket] Usuário conectado: ${userId} (socket: ${socket.id})`);

    // Registrar usuário conectado
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Entrar na sala do usuário (para notificações direcionadas)
    socket.join(`user:${userId}`);

    // Enviar confirmação de conexão
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Handler para marcar notificação como lida
    socket.on('notification:read', async (notificationId: string) => {
      try {
        // A lógica de marcar como lida é feita via API REST
        // Este evento é apenas para sincronização em tempo real
        socket.emit('notification:read:ack', { notificationId, success: true });
      } catch (error) {
        socket.emit('notification:read:ack', { notificationId, success: false, error: 'Erro ao processar' });
      }
    });

    // Handler para solicitar contagem de notificações não lidas
    socket.on('notifications:unread:count', async () => {
      // Este evento pode ser usado para sincronizar o contador
      // A contagem real vem do backend via API
      socket.emit('notifications:unread:count:response', { count: 0 });
    });

    // Handler para ping/pong (keep-alive)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handler de desconexão
    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Usuário desconectado: ${userId} (socket: ${socket.id}, reason: ${reason})`);

      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }
    });

    // Handler de erros
    socket.on('error', (error) => {
      console.error(`[WebSocket] Erro no socket ${socket.id}:`, error);
    });
  });

  console.log('[WebSocket] Servidor inicializado');

  return io;
}

/**
 * Obter instância do servidor Socket.io
 */
export function getSocketServer(): SocketServer | null {
  return io;
}

/**
 * Verificar se um usuário está online
 */
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Obter lista de usuários online
 */
export function getOnlineUsers(): string[] {
  return Array.from(connectedUsers.keys());
}

/**
 * Enviar notificação para um usuário específico
 */
export function sendNotificationToUser(userId: string, notification: {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
  remetente?: {
    id: string;
    nome: string;
    fotoUrl?: string;
  };
}): boolean {
  if (!io) {
    console.warn('[WebSocket] Servidor não inicializado');
    return false;
  }

  // Emitir para a sala do usuário
  io.to(`user:${userId}`).emit('notification:new', {
    ...notification,
    timestamp: new Date().toISOString(),
  });

  console.log(`[WebSocket] Notificação enviada para usuário ${userId}: ${notification.titulo}`);
  return true;
}

/**
 * Enviar notificação para múltiplos usuários
 */
export function sendNotificationToUsers(userIds: string[], notification: {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
}): void {
  userIds.forEach((userId) => {
    sendNotificationToUser(userId, notification);
  });
}

/**
 * Broadcast para todos os usuários conectados
 */
export function broadcastNotification(notification: {
  tipo: string;
  titulo: string;
  mensagem: string;
}): void {
  if (!io) return;

  io.emit('notification:broadcast', {
    ...notification,
    timestamp: new Date().toISOString(),
  });

  console.log(`[WebSocket] Broadcast enviado: ${notification.titulo}`);
}

/**
 * Notificar sobre atualização de entidade (para sincronização de UI)
 */
export function notifyEntityUpdate(entityType: string, entityId: string, action: 'create' | 'update' | 'delete'): void {
  if (!io) return;

  io.emit('entity:update', {
    entityType,
    entityId,
    action,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Enviar evento personalizado para um usuário
 */
export function sendEventToUser(userId: string, event: string, data: any): boolean {
  if (!io) return false;

  io.to(`user:${userId}`).emit(event, data);
  return true;
}

/**
 * Obter estatísticas de conexões
 */
export function getConnectionStats(): {
  totalConnections: number;
  uniqueUsers: number;
  users: { userId: string; connections: number }[];
} {
  const users = Array.from(connectedUsers.entries()).map(([userId, sockets]) => ({
    userId,
    connections: sockets.size,
  }));

  return {
    totalConnections: users.reduce((sum, u) => sum + u.connections, 0),
    uniqueUsers: users.length,
    users,
  };
}
