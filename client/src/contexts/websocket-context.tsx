import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketNotification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
  timestamp: string;
  remetente?: {
    id: string;
    nome: string;
    fotoUrl?: string;
  };
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadCount: number;
  lastNotification: WebSocketNotification | null;
  markAsRead: (notificationId: string) => void;
  clearLastNotification: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<WebSocketNotification | null>(null);

  // Conectar ao WebSocket quando autenticado
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Criar conexão WebSocket
    const socketInstance = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Handlers de conexão
    socketInstance.on('connect', () => {
      console.log('[WebSocket] Conectado:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('connected', (data) => {
      console.log('[WebSocket] Confirmação de conexão:', data);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[WebSocket] Desconectado:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[WebSocket] Erro de conexão:', error.message);
      setIsConnected(false);
    });

    // Handler para novas notificações
    socketInstance.on('notification:new', (notification: WebSocketNotification) => {
      console.log('[WebSocket] Nova notificação:', notification);

      // Atualizar contador
      setUnreadCount((prev) => prev + 1);

      // Salvar última notificação
      setLastNotification(notification);

      // Mostrar toast
      toast({
        title: notification.titulo,
        description: notification.mensagem,
        duration: 5000,
      });

      // Invalidar cache de notificações
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Handler para notificações de broadcast
    socketInstance.on('notification:broadcast', (notification) => {
      console.log('[WebSocket] Broadcast:', notification);

      toast({
        title: notification.titulo,
        description: notification.mensagem,
        duration: 5000,
      });
    });

    // Handler para atualizações de entidade
    socketInstance.on('entity:update', (data) => {
      console.log('[WebSocket] Atualização de entidade:', data);

      // Invalidar cache relevante
      switch (data.entityType) {
        case 'client':
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          break;
        case 'appointment':
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          break;
        case 'visit':
          queryClient.invalidateQueries({ queryKey: ['visits'] });
          break;
        case 'notification':
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          break;
      }
    });

    // Handler de pong (keep-alive)
    socketInstance.on('pong', (data) => {
      console.log('[WebSocket] Pong recebido:', data);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token, toast]);

  // Buscar contagem inicial de notificações não lidas
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Erro ao buscar contagem de notificações:', error);
      }
    };

    fetchUnreadCount();
  }, [isAuthenticated, token]);

  // Marcar notificação como lida
  const markAsRead = useCallback((notificationId: string) => {
    if (socket) {
      socket.emit('notification:read', notificationId);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [socket]);

  // Limpar última notificação
  const clearLastNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadCount,
        lastNotification,
        markAsRead,
        clearLastNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
