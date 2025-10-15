import type { Express } from 'express';
import { db } from '../db.js';
import { processAssignments, users, clients, onboardingStages, appointments, visits, notifications } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { authenticate, requirePermissao } from '../auth/middleware.js';
import { auditFromRequest, AuditActions } from '../audit/logger.js';

export function registerAssignmentRoutes(app: Express) {
  /**
   * POST /api/assignments
   * Criar nova atribuição de processo/etapa
   */
  app.post('/api/assignments', authenticate, requirePermissao('operador'), async (req, res) => {
    try {
      const { processoTipo, processoId, stageId, assignedTo, funcaoNecessaria, notas } = req.body;

      // Validações
      if (!processoTipo || !processoId || !assignedTo) {
        return res.status(400).json({
          error: 'processoTipo, processoId e assignedTo são obrigatórios',
        });
      }

      // Verificar se usuário a ser atribuído existe
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, assignedTo))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!targetUser.ativo) {
        return res.status(400).json({ error: 'Usuário está inativo' });
      }

      // Se função necessária especificada, validar se usuário tem a função
      if (funcaoNecessaria && targetUser.funcao !== funcaoNecessaria) {
        return res.status(400).json({
          error: `Usuário não possui a função necessária: ${funcaoNecessaria}`,
          userFuncao: targetUser.funcao,
        });
      }

      // Verificar se já existe atribuição ativa para este processo
      const existingAssignment = await db
        .select()
        .from(processAssignments)
        .where(
          and(
            eq(processAssignments.processoTipo, processoTipo),
            eq(processAssignments.processoId, processoId),
            or(
              eq(processAssignments.status, 'pending'),
              eq(processAssignments.status, 'signed')
            )
          )
        )
        .limit(1);

      if (existingAssignment.length > 0) {
        return res.status(409).json({
          error: 'Já existe uma atribuição ativa para este processo',
          assignment: existingAssignment[0],
        });
      }

      // Criar atribuição
      const [assignment] = await db.insert(processAssignments).values({
        processoTipo,
        processoId,
        stageId: stageId || null,
        assignedTo,
        assignedBy: req.user!.userId,
        funcaoNecessaria: funcaoNecessaria || null,
        status: 'pending',
        notas: notas || null,
      }).returning();

      // Criar notificação para o usuário atribuído
      await db.insert(notifications).values({
        usuarioId: assignedTo,
        remetenteId: req.user!.userId,
        tipo: 'assignment',
        titulo: 'Nova atribuição',
        mensagem: `Você foi atribuído a: ${processoTipo} (${processoId})`,
        entidade: processoTipo,
        entidadeId: processoId,
        lida: false,
      });

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.ASSIGNMENT_CREATE,
        entidade: 'assignment',
        entidadeId: assignment.id,
        descricao: `Atribuição criada: ${processoTipo} (${processoId}) -> ${targetUser.nome}`,
        dadosNovos: assignment,
      });

      res.status(201).json({
        success: true,
        assignment,
      });
    } catch (error) {
      console.error('Erro ao criar atribuição:', error);
      res.status(500).json({ error: 'Erro ao criar atribuição' });
    }
  });

  /**
   * GET /api/assignments
   * Listar atribuições (filtros: status, assignedTo, processoTipo)
   */
  app.get('/api/assignments', authenticate, async (req, res) => {
    try {
      const { status, assignedTo, processoTipo } = req.query;

      let query = db.select().from(processAssignments);

      // Admin e operador podem ver todas
      // Analista só vê as suas
      if (req.user!.nivelPermissao === 'analista') {
        query = query.where(eq(processAssignments.assignedTo, req.user!.userId));
      } else {
        // Aplicar filtros
        const conditions = [];
        if (status) conditions.push(eq(processAssignments.status, status as any));
        if (assignedTo) conditions.push(eq(processAssignments.assignedTo, assignedTo as string));
        if (processoTipo) conditions.push(eq(processAssignments.processoTipo, processoTipo as string));

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      const assignments = await query;

      // Enriquecer com dados de usuários
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const [assignedUser] = await db
            .select({ id: users.id, nome: users.nome, email: users.email, funcao: users.funcao })
            .from(users)
            .where(eq(users.id, assignment.assignedTo))
            .limit(1);

          const [assignedByUser] = await db
            .select({ id: users.id, nome: users.nome, email: users.email })
            .from(users)
            .where(eq(users.id, assignment.assignedBy))
            .limit(1);

          return {
            ...assignment,
            assignedUser,
            assignedByUser,
          };
        })
      );

      res.json(enrichedAssignments);
    } catch (error) {
      console.error('Erro ao listar atribuições:', error);
      res.status(500).json({ error: 'Erro ao listar atribuições' });
    }
  });

  /**
   * GET /api/assignments/my
   * Listar minhas atribuições
   */
  app.get('/api/assignments/my', authenticate, async (req, res) => {
    try {
      const { status } = req.query;

      let query = db
        .select()
        .from(processAssignments)
        .where(eq(processAssignments.assignedTo, req.user!.userId));

      if (status) {
        query = query.where(
          and(
            eq(processAssignments.assignedTo, req.user!.userId),
            eq(processAssignments.status, status as any)
          )
        );
      }

      const assignments = await query;

      res.json(assignments);
    } catch (error) {
      console.error('Erro ao listar minhas atribuições:', error);
      res.status(500).json({ error: 'Erro ao listar minhas atribuições' });
    }
  });

  /**
   * GET /api/assignments/:id
   * Buscar atribuição por ID
   */
  app.get('/api/assignments/:id', authenticate, async (req, res) => {
    try {
      const [assignment] = await db
        .select()
        .from(processAssignments)
        .where(eq(processAssignments.id, req.params.id))
        .limit(1);

      if (!assignment) {
        return res.status(404).json({ error: 'Atribuição não encontrada' });
      }

      // Verificar permissão
      if (
        req.user!.nivelPermissao !== 'administrador' &&
        assignment.assignedTo !== req.user!.userId &&
        assignment.assignedBy !== req.user!.userId
      ) {
        return res.status(403).json({ error: 'Sem permissão para visualizar esta atribuição' });
      }

      // Enriquecer com dados
      const [assignedUser] = await db
        .select({ id: users.id, nome: users.nome, email: users.email, funcao: users.funcao })
        .from(users)
        .where(eq(users.id, assignment.assignedTo))
        .limit(1);

      const [assignedByUser] = await db
        .select({ id: users.id, nome: users.nome, email: users.email })
        .from(users)
        .where(eq(users.id, assignment.assignedBy))
        .limit(1);

      res.json({
        ...assignment,
        assignedUser,
        assignedByUser,
      });
    } catch (error) {
      console.error('Erro ao buscar atribuição:', error);
      res.status(500).json({ error: 'Erro ao buscar atribuição' });
    }
  });

  /**
   * POST /api/assignments/:id/sign
   * Assinar atribuição (aceitar responsabilidade)
   */
  app.post('/api/assignments/:id/sign', authenticate, async (req, res) => {
    try {
      const [assignment] = await db
        .select()
        .from(processAssignments)
        .where(eq(processAssignments.id, req.params.id))
        .limit(1);

      if (!assignment) {
        return res.status(404).json({ error: 'Atribuição não encontrada' });
      }

      // Apenas o usuário atribuído pode assinar
      if (assignment.assignedTo !== req.user!.userId) {
        return res.status(403).json({ error: 'Apenas o usuário atribuído pode assinar' });
      }

      // Verificar se já foi assinada
      if (assignment.status !== 'pending') {
        return res.status(400).json({
          error: `Atribuição já está com status: ${assignment.status}`,
        });
      }

      // Assinar
      const [updatedAssignment] = await db
        .update(processAssignments)
        .set({
          status: 'signed',
          signedAt: new Date(),
        })
        .where(eq(processAssignments.id, req.params.id))
        .returning();

      // Notificar quem atribuiu
      await db.insert(notifications).values({
        usuarioId: assignment.assignedBy,
        remetenteId: req.user!.userId,
        tipo: 'assignment_signed',
        titulo: 'Atribuição assinada',
        mensagem: `${req.user!.email} aceitou a atribuição: ${assignment.processoTipo} (${assignment.processoId})`,
        entidade: assignment.processoTipo,
        entidadeId: assignment.processoId,
        lida: false,
      });

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.ASSIGNMENT_SIGN,
        entidade: 'assignment',
        entidadeId: assignment.id,
        descricao: `Atribuição assinada: ${assignment.processoTipo} (${assignment.processoId})`,
        dadosAnteriores: assignment,
        dadosNovos: updatedAssignment,
      });

      res.json({
        success: true,
        assignment: updatedAssignment,
      });
    } catch (error) {
      console.error('Erro ao assinar atribuição:', error);
      res.status(500).json({ error: 'Erro ao assinar atribuição' });
    }
  });

  /**
   * POST /api/assignments/:id/reject
   * Rejeitar atribuição
   */
  app.post('/api/assignments/:id/reject', authenticate, async (req, res) => {
    try {
      const { motivoRejeicao } = req.body;

      if (!motivoRejeicao) {
        return res.status(400).json({ error: 'Motivo de rejeição é obrigatório' });
      }

      const [assignment] = await db
        .select()
        .from(processAssignments)
        .where(eq(processAssignments.id, req.params.id))
        .limit(1);

      if (!assignment) {
        return res.status(404).json({ error: 'Atribuição não encontrada' });
      }

      // Apenas o usuário atribuído pode rejeitar
      if (assignment.assignedTo !== req.user!.userId) {
        return res.status(403).json({ error: 'Apenas o usuário atribuído pode rejeitar' });
      }

      // Verificar se pode rejeitar
      if (assignment.status === 'completed') {
        return res.status(400).json({ error: 'Não é possível rejeitar atribuição já concluída' });
      }

      // Rejeitar
      const [updatedAssignment] = await db
        .update(processAssignments)
        .set({
          status: 'rejected',
          rejectedAt: new Date(),
          motivoRejeicao,
        })
        .where(eq(processAssignments.id, req.params.id))
        .returning();

      // Notificar quem atribuiu
      await db.insert(notifications).values({
        usuarioId: assignment.assignedBy,
        remetenteId: req.user!.userId,
        tipo: 'assignment_rejected',
        titulo: 'Atribuição rejeitada',
        mensagem: `${req.user!.email} rejeitou a atribuição: ${assignment.processoTipo} (${assignment.processoId}). Motivo: ${motivoRejeicao}`,
        entidade: assignment.processoTipo,
        entidadeId: assignment.processoId,
        lida: false,
      });

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.ASSIGNMENT_REJECT,
        entidade: 'assignment',
        entidadeId: assignment.id,
        descricao: `Atribuição rejeitada: ${assignment.processoTipo} (${assignment.processoId})`,
        dadosAnteriores: assignment,
        dadosNovos: updatedAssignment,
      });

      res.json({
        success: true,
        assignment: updatedAssignment,
      });
    } catch (error) {
      console.error('Erro ao rejeitar atribuição:', error);
      res.status(500).json({ error: 'Erro ao rejeitar atribuição' });
    }
  });

  /**
   * POST /api/assignments/:id/complete
   * Marcar atribuição como concluída
   */
  app.post('/api/assignments/:id/complete', authenticate, async (req, res) => {
    try {
      const [assignment] = await db
        .select()
        .from(processAssignments)
        .where(eq(processAssignments.id, req.params.id))
        .limit(1);

      if (!assignment) {
        return res.status(404).json({ error: 'Atribuição não encontrada' });
      }

      // Apenas o usuário atribuído ou admin pode completar
      if (
        req.user!.nivelPermissao !== 'administrador' &&
        assignment.assignedTo !== req.user!.userId
      ) {
        return res.status(403).json({
          error: 'Apenas o usuário atribuído ou administrador pode completar',
        });
      }

      // Verificar se foi assinada
      if (assignment.status !== 'signed') {
        return res.status(400).json({
          error: 'Atribuição precisa estar assinada antes de ser concluída',
        });
      }

      // Completar
      const [updatedAssignment] = await db
        .update(processAssignments)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(processAssignments.id, req.params.id))
        .returning();

      // Notificar quem atribuiu
      await db.insert(notifications).values({
        usuarioId: assignment.assignedBy,
        remetenteId: req.user!.userId,
        tipo: 'assignment_completed',
        titulo: 'Atribuição concluída',
        mensagem: `${req.user!.email} concluiu a atribuição: ${assignment.processoTipo} (${assignment.processoId})`,
        entidade: assignment.processoTipo,
        entidadeId: assignment.processoId,
        lida: false,
      });

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.ASSIGNMENT_COMPLETE,
        entidade: 'assignment',
        entidadeId: assignment.id,
        descricao: `Atribuição concluída: ${assignment.processoTipo} (${assignment.processoId})`,
        dadosAnteriores: assignment,
        dadosNovos: updatedAssignment,
      });

      res.json({
        success: true,
        assignment: updatedAssignment,
      });
    } catch (error) {
      console.error('Erro ao completar atribuição:', error);
      res.status(500).json({ error: 'Erro ao completar atribuição' });
    }
  });

  /**
   * DELETE /api/assignments/:id
   * Deletar atribuição (apenas admin ou quem criou)
   */
  app.delete('/api/assignments/:id', authenticate, async (req, res) => {
    try {
      const [assignment] = await db
        .select()
        .from(processAssignments)
        .where(eq(processAssignments.id, req.params.id))
        .limit(1);

      if (!assignment) {
        return res.status(404).json({ error: 'Atribuição não encontrada' });
      }

      // Apenas admin ou quem criou pode deletar
      if (
        req.user!.nivelPermissao !== 'administrador' &&
        assignment.assignedBy !== req.user!.userId
      ) {
        return res.status(403).json({
          error: 'Apenas administrador ou quem criou pode deletar',
        });
      }

      // Não permitir deletar atribuição concluída
      if (assignment.status === 'completed') {
        return res.status(400).json({
          error: 'Não é possível deletar atribuição concluída',
        });
      }

      await db
        .delete(processAssignments)
        .where(eq(processAssignments.id, req.params.id));

      // Audit log
      await auditFromRequest(req, {
        acao: 'assignment_delete',
        entidade: 'assignment',
        entidadeId: assignment.id,
        descricao: `Atribuição deletada: ${assignment.processoTipo} (${assignment.processoId})`,
        dadosAnteriores: assignment,
      });

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar atribuição:', error);
      res.status(500).json({ error: 'Erro ao deletar atribuição' });
    }
  });

  /**
   * GET /api/assignments/check/:processoTipo/:processoId
   * Verificar se existe atribuição ativa para um processo
   */
  app.get('/api/assignments/check/:processoTipo/:processoId', authenticate, async (req, res) => {
    try {
      const { processoTipo, processoId } = req.params;

      const [assignment] = await db
        .select()
        .from(processAssignments)
        .where(
          and(
            eq(processAssignments.processoTipo, processoTipo),
            eq(processAssignments.processoId, processoId),
            or(
              eq(processAssignments.status, 'pending'),
              eq(processAssignments.status, 'signed')
            )
          )
        )
        .limit(1);

      if (!assignment) {
        return res.json({
          hasAssignment: false,
          canEdit: req.user!.nivelPermissao === 'administrador',
        });
      }

      const canEdit =
        req.user!.nivelPermissao === 'administrador' ||
        assignment.assignedTo === req.user!.userId;

      res.json({
        hasAssignment: true,
        assignment,
        canEdit,
        isAssignedToMe: assignment.assignedTo === req.user!.userId,
      });
    } catch (error) {
      console.error('Erro ao verificar atribuição:', error);
      res.status(500).json({ error: 'Erro ao verificar atribuição' });
    }
  });
}
