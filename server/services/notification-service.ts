/**
 * Serviço centralizado para envio de notificações
 */
import { db } from '../db.js';
import { notifications, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendNotificationToUser, sendNotificationToUsers } from './websocket/socket-server.js';

export interface NotificationData {
  usuarioId: string;
  remetenteId?: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
}

/**
 * Criar e enviar notificação para um usuário
 */
export async function createNotification(data: NotificationData): Promise<string | null> {
  try {
    // Verificar se o usuário existe
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.usuarioId))
      .limit(1);

    if (!user) {
      console.warn(`[Notification] Usuário não encontrado: ${data.usuarioId}`);
      return null;
    }

    // Criar notificação no banco
    const [notification] = await db.insert(notifications).values({
      usuarioId: data.usuarioId,
      remetenteId: data.remetenteId || null,
      tipo: data.tipo,
      titulo: data.titulo,
      mensagem: data.mensagem,
      entidade: data.entidade || null,
      entidadeId: data.entidadeId || null,
      lida: false,
    }).returning();

    // Buscar dados do remetente para WebSocket
    let remetente = undefined;
    if (data.remetenteId) {
      const [sender] = await db
        .select({ id: users.id, nome: users.nome, fotoUrl: users.fotoUrl })
        .from(users)
        .where(eq(users.id, data.remetenteId))
        .limit(1);

      if (sender) {
        remetente = {
          id: sender.id,
          nome: sender.nome,
          fotoUrl: sender.fotoUrl || undefined,
        };
      }
    }

    // Enviar via WebSocket
    sendNotificationToUser(data.usuarioId, {
      id: notification.id,
      tipo: notification.tipo,
      titulo: notification.titulo,
      mensagem: notification.mensagem,
      entidade: notification.entidade || undefined,
      entidadeId: notification.entidadeId || undefined,
      remetente,
    });

    console.log(`[Notification] Enviada para ${user.nome}: ${data.titulo}`);
    return notification.id;
  } catch (error) {
    console.error('[Notification] Erro ao criar notificação:', error);
    return null;
  }
}

/**
 * Criar e enviar notificações para múltiplos usuários
 */
export async function createNotifications(
  userIds: string[],
  data: Omit<NotificationData, 'usuarioId'>
): Promise<string[]> {
  const notificationIds: string[] = [];

  for (const userId of userIds) {
    const id = await createNotification({
      ...data,
      usuarioId: userId,
    });

    if (id) {
      notificationIds.push(id);
    }
  }

  return notificationIds;
}

/**
 * Notificar sobre atribuição
 */
export async function notifyAssignment(
  assignedToId: string,
  assignedById: string,
  entityType: string,
  entityId: string,
  entityName: string
): Promise<string | null> {
  return createNotification({
    usuarioId: assignedToId,
    remetenteId: assignedById,
    tipo: 'assignment',
    titulo: 'Nova Atribuição',
    mensagem: `Você foi atribuído(a) a: ${entityName}`,
    entidade: entityType,
    entidadeId: entityId,
  });
}

/**
 * Notificar sobre comentário
 */
export async function notifyComment(
  targetUserId: string,
  commenterId: string,
  entityType: string,
  entityId: string,
  entityName: string
): Promise<string | null> {
  return createNotification({
    usuarioId: targetUserId,
    remetenteId: commenterId,
    tipo: 'comment',
    titulo: 'Novo Comentário',
    mensagem: `Novo comentário em: ${entityName}`,
    entidade: entityType,
    entidadeId: entityId,
  });
}

/**
 * Notificar sobre mudança de status
 */
export async function notifyStatusChange(
  targetUserId: string,
  entityType: string,
  entityId: string,
  entityName: string,
  oldStatus: string,
  newStatus: string
): Promise<string | null> {
  return createNotification({
    usuarioId: targetUserId,
    tipo: 'status_change',
    titulo: 'Status Alterado',
    mensagem: `${entityName}: ${oldStatus} -> ${newStatus}`,
    entidade: entityType,
    entidadeId: entityId,
  });
}

/**
 * Notificar lembrete
 */
export async function notifyReminder(
  targetUserId: string,
  titulo: string,
  mensagem: string,
  entityType?: string,
  entityId?: string
): Promise<string | null> {
  return createNotification({
    usuarioId: targetUserId,
    tipo: 'reminder',
    titulo,
    mensagem,
    entidade: entityType,
    entidadeId: entityId,
  });
}

/**
 * Notificar sobre onboarding
 */
export async function notifyOnboardingUpdate(
  targetUserId: string,
  clientName: string,
  stageName: string,
  action: 'started' | 'completed' | 'pending'
): Promise<string | null> {
  const messages = {
    started: `Etapa "${stageName}" iniciada para ${clientName}`,
    completed: `Etapa "${stageName}" concluída para ${clientName}`,
    pending: `Etapa "${stageName}" aguardando ação para ${clientName}`,
  };

  return createNotification({
    usuarioId: targetUserId,
    tipo: 'onboarding',
    titulo: 'Atualização de Onboarding',
    mensagem: messages[action],
    entidade: 'client',
  });
}
