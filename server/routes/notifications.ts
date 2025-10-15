import type { Express } from 'express';
import { db } from '../db.js';
import { notifications, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../auth/middleware.js';
import { auditFromRequest } from '../audit/logger.js';

export function registerNotificationRoutes(app: Express) {
  /**
   * GET /api/notifications
   * Listar notificações do usuário autenticado
   */
  app.get('/api/notifications', authenticate, async (req, res) => {
    try {
      const { lida, limit = 50 } = req.query;

      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.usuarioId, req.user!.userId))
        .orderBy(desc(notifications.dataEnvio))
        .limit(Number(limit));

      // Filtrar por lida/não lida
      if (lida !== undefined) {
        query = query.where(
          and(
            eq(notifications.usuarioId, req.user!.userId),
            eq(notifications.lida, lida === 'true')
          )
        );
      }

      const notificationsList = await query;

      // Enriquecer com dados do remetente
      const enrichedNotifications = await Promise.all(
        notificationsList.map(async (notification) => {
          if (!notification.remetenteId) {
            return { ...notification, remetente: null };
          }

          const [remetente] = await db
            .select({ id: users.id, nome: users.nome, email: users.email, fotoUrl: users.fotoUrl })
            .from(users)
            .where(eq(users.id, notification.remetenteId))
            .limit(1);

          return {
            ...notification,
            remetente,
          };
        })
      );

      res.json(enrichedNotifications);
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      res.status(500).json({ error: 'Erro ao listar notificações' });
    }
  });

  /**
   * GET /api/notifications/unread-count
   * Contar notificações não lidas
   */
  app.get('/api/notifications/unread-count', authenticate, async (req, res) => {
    try {
      const unreadNotifications = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.usuarioId, req.user!.userId),
            eq(notifications.lida, false)
          )
        );

      res.json({
        count: unreadNotifications.length,
      });
    } catch (error) {
      console.error('Erro ao contar notificações:', error);
      res.status(500).json({ error: 'Erro ao contar notificações' });
    }
  });

  /**
   * GET /api/notifications/:id
   * Buscar notificação por ID
   */
  app.get('/api/notifications/:id', authenticate, async (req, res) => {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, req.params.id))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      // Verificar se a notificação pertence ao usuário
      if (notification.usuarioId !== req.user!.userId) {
        return res.status(403).json({ error: 'Sem permissão para visualizar esta notificação' });
      }

      // Enriquecer com dados do remetente
      let remetente = null;
      if (notification.remetenteId) {
        const [remetenteData] = await db
          .select({ id: users.id, nome: users.nome, email: users.email, fotoUrl: users.fotoUrl })
          .from(users)
          .where(eq(users.id, notification.remetenteId))
          .limit(1);
        remetente = remetenteData;
      }

      res.json({
        ...notification,
        remetente,
      });
    } catch (error) {
      console.error('Erro ao buscar notificação:', error);
      res.status(500).json({ error: 'Erro ao buscar notificação' });
    }
  });

  /**
   * PUT /api/notifications/:id/read
   * Marcar notificação como lida
   */
  app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, req.params.id))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      // Verificar se a notificação pertence ao usuário
      if (notification.usuarioId !== req.user!.userId) {
        return res.status(403).json({ error: 'Sem permissão para modificar esta notificação' });
      }

      // Marcar como lida
      const [updatedNotification] = await db
        .update(notifications)
        .set({
          lida: true,
          dataLeitura: new Date(),
        })
        .where(eq(notifications.id, req.params.id))
        .returning();

      res.json({
        success: true,
        notification: updatedNotification,
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
    }
  });

  /**
   * PUT /api/notifications/read-all
   * Marcar todas as notificações como lidas
   */
  app.put('/api/notifications/read-all', authenticate, async (req, res) => {
    try {
      await db
        .update(notifications)
        .set({
          lida: true,
          dataLeitura: new Date(),
        })
        .where(
          and(
            eq(notifications.usuarioId, req.user!.userId),
            eq(notifications.lida, false)
          )
        );

      res.json({
        success: true,
        message: 'Todas as notificações foram marcadas como lidas',
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Deletar notificação
   */
  app.delete('/api/notifications/:id', authenticate, async (req, res) => {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, req.params.id))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      // Verificar se a notificação pertence ao usuário
      if (notification.usuarioId !== req.user!.userId) {
        return res.status(403).json({ error: 'Sem permissão para deletar esta notificação' });
      }

      await db.delete(notifications).where(eq(notifications.id, req.params.id));

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      res.status(500).json({ error: 'Erro ao deletar notificação' });
    }
  });

  /**
   * DELETE /api/notifications
   * Deletar todas as notificações lidas do usuário
   */
  app.delete('/api/notifications', authenticate, async (req, res) => {
    try {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.usuarioId, req.user!.userId),
            eq(notifications.lida, true)
          )
        );

      res.json({
        success: true,
        message: 'Todas as notificações lidas foram deletadas',
      });
    } catch (error) {
      console.error('Erro ao deletar notificações:', error);
      res.status(500).json({ error: 'Erro ao deletar notificações' });
    }
  });

  /**
   * POST /api/notifications/send
   * Enviar notificação manual (apenas admin)
   */
  app.post('/api/notifications/send', authenticate, async (req, res) => {
    try {
      // Apenas admin pode enviar notificações manuais
      if (req.user!.nivelPermissao !== 'administrador') {
        return res.status(403).json({ error: 'Apenas administradores podem enviar notificações' });
      }

      const { usuarioId, tipo, titulo, mensagem, entidade, entidadeId } = req.body;

      // Validações
      if (!usuarioId || !titulo || !mensagem) {
        return res.status(400).json({
          error: 'usuarioId, titulo e mensagem são obrigatórios',
        });
      }

      // Verificar se usuário existe
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, usuarioId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Criar notificação
      const [notification] = await db.insert(notifications).values({
        usuarioId,
        remetenteId: req.user!.userId,
        tipo: tipo || 'manual',
        titulo,
        mensagem,
        entidade: entidade || null,
        entidadeId: entidadeId || null,
        lida: false,
      }).returning();

      // Audit log
      await auditFromRequest(req, {
        acao: 'notification_send',
        entidade: 'notification',
        entidadeId: notification.id,
        descricao: `Notificação enviada para ${targetUser.nome}`,
        dadosNovos: { titulo, mensagem },
      });

      res.status(201).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      res.status(500).json({ error: 'Erro ao enviar notificação' });
    }
  });
}
