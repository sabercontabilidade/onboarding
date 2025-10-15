import type { Express } from 'express';
import { db } from '../db.js';
import { comments, users, notifications } from '@shared/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { authenticate } from '../auth/middleware.js';
import { auditFromRequest, AuditActions } from '../audit/logger.js';

export function registerCommentRoutes(app: Express) {
  /**
   * POST /api/comments
   * Criar novo comentário
   */
  app.post('/api/comments', authenticate, async (req, res) => {
    try {
      const { entidadeTipo, entidadeId, conteudo, privado } = req.body;

      // Validações
      if (!entidadeTipo || !entidadeId || !conteudo) {
        return res.status(400).json({
          error: 'entidadeTipo, entidadeId e conteudo são obrigatórios',
        });
      }

      if (conteudo.trim().length === 0) {
        return res.status(400).json({ error: 'Comentário não pode estar vazio' });
      }

      // Criar comentário
      const [comment] = await db.insert(comments).values({
        usuarioId: req.user!.userId,
        entidadeTipo,
        entidadeId,
        conteudo: conteudo.trim(),
        privado: privado || false,
      }).returning();

      // Buscar dados do usuário para retornar
      const [user] = await db
        .select({ id: users.id, nome: users.nome, email: users.email, fotoUrl: users.fotoUrl })
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);

      // TODO: Notificar usuários envolvidos no processo
      // (usuário atribuído, criador do processo, etc.)

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.COMMENT_CREATE,
        entidade: 'comment',
        entidadeId: comment.id,
        descricao: `Comentário criado em ${entidadeTipo} (${entidadeId})`,
        dadosNovos: { entidadeTipo, entidadeId, conteudo: conteudo.substring(0, 100) },
      });

      res.status(201).json({
        success: true,
        comment: {
          ...comment,
          usuario: user,
        },
      });
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      res.status(500).json({ error: 'Erro ao criar comentário' });
    }
  });

  /**
   * GET /api/comments/:entidadeTipo/:entidadeId
   * Listar comentários de uma entidade
   */
  app.get('/api/comments/:entidadeTipo/:entidadeId', authenticate, async (req, res) => {
    try {
      const { entidadeTipo, entidadeId } = req.params;

      // Buscar comentários
      let query = db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.entidadeTipo, entidadeTipo),
            eq(comments.entidadeId, entidadeId)
          )
        )
        .orderBy(desc(comments.createdAt));

      // Se não for admin, filtrar comentários privados que não são do usuário
      if (req.user!.nivelPermissao !== 'administrador') {
        // Comentários públicos + comentários privados do próprio usuário
        query = query.where(
          and(
            eq(comments.entidadeTipo, entidadeTipo),
            eq(comments.entidadeId, entidadeId),
            or(
              eq(comments.privado, false),
              and(
                eq(comments.privado, true),
                eq(comments.usuarioId, req.user!.userId)
              )
            )
          )
        );
      }

      const commentsList = await query;

      // Enriquecer com dados dos usuários
      const enrichedComments = await Promise.all(
        commentsList.map(async (comment) => {
          const [user] = await db
            .select({ id: users.id, nome: users.nome, email: users.email, fotoUrl: users.fotoUrl })
            .from(users)
            .where(eq(users.id, comment.usuarioId))
            .limit(1);

          return {
            ...comment,
            usuario: user,
          };
        })
      );

      res.json(enrichedComments);
    } catch (error) {
      console.error('Erro ao listar comentários:', error);
      res.status(500).json({ error: 'Erro ao listar comentários' });
    }
  });

  /**
   * GET /api/comments/:id
   * Buscar comentário por ID
   */
  app.get('/api/comments/:id', authenticate, async (req, res) => {
    try {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, req.params.id))
        .limit(1);

      if (!comment) {
        return res.status(404).json({ error: 'Comentário não encontrado' });
      }

      // Se for privado, verificar permissão
      if (comment.privado) {
        if (
          req.user!.nivelPermissao !== 'administrador' &&
          comment.usuarioId !== req.user!.userId
        ) {
          return res.status(403).json({ error: 'Sem permissão para visualizar este comentário' });
        }
      }

      // Enriquecer com dados do usuário
      const [user] = await db
        .select({ id: users.id, nome: users.nome, email: users.email, fotoUrl: users.fotoUrl })
        .from(users)
        .where(eq(users.id, comment.usuarioId))
        .limit(1);

      res.json({
        ...comment,
        usuario: user,
      });
    } catch (error) {
      console.error('Erro ao buscar comentário:', error);
      res.status(500).json({ error: 'Erro ao buscar comentário' });
    }
  });

  /**
   * PUT /api/comments/:id
   * Editar comentário (apenas autor ou admin)
   */
  app.put('/api/comments/:id', authenticate, async (req, res) => {
    try {
      const { conteudo } = req.body;

      if (!conteudo || conteudo.trim().length === 0) {
        return res.status(400).json({ error: 'Conteúdo não pode estar vazio' });
      }

      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, req.params.id))
        .limit(1);

      if (!comment) {
        return res.status(404).json({ error: 'Comentário não encontrado' });
      }

      // Apenas autor ou admin pode editar
      if (
        req.user!.nivelPermissao !== 'administrador' &&
        comment.usuarioId !== req.user!.userId
      ) {
        return res.status(403).json({ error: 'Apenas o autor ou administrador pode editar' });
      }

      // Atualizar comentário
      const [updatedComment] = await db
        .update(comments)
        .set({
          conteudo: conteudo.trim(),
          editado: true,
          updatedAt: new Date(),
        })
        .where(eq(comments.id, req.params.id))
        .returning();

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.COMMENT_UPDATE,
        entidade: 'comment',
        entidadeId: comment.id,
        descricao: `Comentário editado em ${comment.entidadeTipo} (${comment.entidadeId})`,
        dadosAnteriores: { conteudo: comment.conteudo },
        dadosNovos: { conteudo: conteudo.substring(0, 100) },
      });

      res.json({
        success: true,
        comment: updatedComment,
      });
    } catch (error) {
      console.error('Erro ao editar comentário:', error);
      res.status(500).json({ error: 'Erro ao editar comentário' });
    }
  });

  /**
   * DELETE /api/comments/:id
   * Deletar comentário (apenas autor ou admin)
   */
  app.delete('/api/comments/:id', authenticate, async (req, res) => {
    try {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, req.params.id))
        .limit(1);

      if (!comment) {
        return res.status(404).json({ error: 'Comentário não encontrado' });
      }

      // Apenas autor ou admin pode deletar
      if (
        req.user!.nivelPermissao !== 'administrador' &&
        comment.usuarioId !== req.user!.userId
      ) {
        return res.status(403).json({ error: 'Apenas o autor ou administrador pode deletar' });
      }

      await db.delete(comments).where(eq(comments.id, req.params.id));

      // Audit log
      await auditFromRequest(req, {
        acao: AuditActions.COMMENT_DELETE,
        entidade: 'comment',
        entidadeId: comment.id,
        descricao: `Comentário deletado em ${comment.entidadeTipo} (${comment.entidadeId})`,
        dadosAnteriores: comment,
      });

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
  });

  /**
   * GET /api/comments/count/:entidadeTipo/:entidadeId
   * Contar comentários de uma entidade
   */
  app.get('/api/comments/count/:entidadeTipo/:entidadeId', authenticate, async (req, res) => {
    try {
      const { entidadeTipo, entidadeId } = req.params;

      const commentsList = await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.entidadeTipo, entidadeTipo),
            eq(comments.entidadeId, entidadeId),
            eq(comments.privado, false) // Apenas públicos para contagem
          )
        );

      res.json({
        count: commentsList.length,
        entidadeTipo,
        entidadeId,
      });
    } catch (error) {
      console.error('Erro ao contar comentários:', error);
      res.status(500).json({ error: 'Erro ao contar comentários' });
    }
  });
}
