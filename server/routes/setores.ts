import { Router } from 'express';
import { db } from '../db.js';
import { setores, perfis, userSetores, users, type Setor, type Perfil, type UserSetor, insertSetorSchema, insertUserSetorSchema } from '@shared/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../auth/middleware.js';
import { logAudit } from '../audit/logger.js';

const router = Router();

// ========================================
// ROTAS DE SETORES
// ========================================

// GET /api/setores - Listar todos os setores
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db
      .select()
      .from(setores)
      .orderBy(asc(setores.ordem));

    res.json(result);
  } catch (error: any) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ error: 'Erro ao listar setores' });
  }
});

// GET /api/setores/:id - Obter setor específico
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(setores)
      .where(eq(setores.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Erro ao obter setor:', error);
    res.status(500).json({ error: 'Erro ao obter setor' });
  }
});

// POST /api/setores - Criar setor (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const parsed = insertSetorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors });
    }

    // Verificar se código já existe
    const existing = await db
      .select()
      .from(setores)
      .where(eq(setores.codigo, parsed.data.codigo))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Código de setor já existe' });
    }

    const result = await db.insert(setores).values(parsed.data).returning();

    await logAudit({
      usuarioId: req.user!.id,
      acao: 'create',
      entidade: 'setores',
      entidadeId: result[0].id,
      descricao: `Setor "${result[0].nome}" criado`,
      dadosNovos: result[0],
      req,
    });

    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Erro ao criar setor:', error);
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
});

// PUT /api/setores/:id - Atualizar setor (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar setor atual
    const current = await db.select().from(setores).where(eq(setores.id, id)).limit(1);
    if (current.length === 0) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    // Não permitir alterar setor Sistema
    if (current[0].isSystem) {
      return res.status(403).json({ error: 'Não é permitido alterar o setor Sistema' });
    }

    const { id: _, createdAt, updatedAt, ...updateData } = req.body;

    const result = await db
      .update(setores)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(setores.id, id))
      .returning();

    await logAudit({
      usuarioId: req.user!.id,
      acao: 'update',
      entidade: 'setores',
      entidadeId: id,
      descricao: `Setor "${result[0].nome}" atualizado`,
      dadosAnteriores: current[0],
      dadosNovos: result[0],
      req,
    });

    res.json(result[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar setor:', error);
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
});

// DELETE /api/setores/:id - Desativar setor (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar setor atual
    const current = await db.select().from(setores).where(eq(setores.id, id)).limit(1);
    if (current.length === 0) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    // Não permitir deletar setor Sistema
    if (current[0].isSystem) {
      return res.status(403).json({ error: 'Não é permitido desativar o setor Sistema' });
    }

    // Soft delete - apenas desativa
    const result = await db
      .update(setores)
      .set({ ativo: false, updatedAt: new Date() })
      .where(eq(setores.id, id))
      .returning();

    await logAudit({
      usuarioId: req.user!.id,
      acao: 'delete',
      entidade: 'setores',
      entidadeId: id,
      descricao: `Setor "${result[0].nome}" desativado`,
      dadosAnteriores: current[0],
      dadosNovos: result[0],
      req,
    });

    res.json({ message: 'Setor desativado com sucesso', setor: result[0] });
  } catch (error: any) {
    console.error('Erro ao desativar setor:', error);
    res.status(500).json({ error: 'Erro ao desativar setor' });
  }
});

// GET /api/setores/:id/usuarios - Listar usuários do setor
router.get('/:id/usuarios', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .select({
        userId: userSetores.userId,
        setorId: userSetores.setorId,
        perfilId: userSetores.perfilId,
        principal: userSetores.principal,
        createdAt: userSetores.createdAt,
        usuario: {
          id: users.id,
          nome: users.nome,
          email: users.email,
          fotoUrl: users.fotoUrl,
          ativo: users.ativo,
        },
        perfil: {
          id: perfis.id,
          nome: perfis.nome,
          codigo: perfis.codigo,
          nivelHierarquico: perfis.nivelHierarquico,
        },
      })
      .from(userSetores)
      .innerJoin(users, eq(userSetores.userId, users.id))
      .innerJoin(perfis, eq(userSetores.perfilId, perfis.id))
      .where(eq(userSetores.setorId, id))
      .orderBy(asc(perfis.nivelHierarquico), asc(users.nome));

    res.json(result);
  } catch (error: any) {
    console.error('Erro ao listar usuários do setor:', error);
    res.status(500).json({ error: 'Erro ao listar usuários do setor' });
  }
});


// ========================================
// ROTAS DE USER_SETORES
// ========================================

// GET /api/users/:id/setores - Listar setores do usuário
router.get('/users/:userId/setores', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db
      .select({
        id: userSetores.id,
        userId: userSetores.userId,
        setorId: userSetores.setorId,
        perfilId: userSetores.perfilId,
        principal: userSetores.principal,
        createdAt: userSetores.createdAt,
        setor: {
          id: setores.id,
          nome: setores.nome,
          codigo: setores.codigo,
          cor: setores.cor,
          icone: setores.icone,
        },
        perfil: {
          id: perfis.id,
          nome: perfis.nome,
          codigo: perfis.codigo,
          nivelHierarquico: perfis.nivelHierarquico,
        },
      })
      .from(userSetores)
      .innerJoin(setores, eq(userSetores.setorId, setores.id))
      .innerJoin(perfis, eq(userSetores.perfilId, perfis.id))
      .where(eq(userSetores.userId, userId))
      .orderBy(desc(userSetores.principal), asc(setores.ordem));

    res.json(result);
  } catch (error: any) {
    console.error('Erro ao listar setores do usuário:', error);
    res.status(500).json({ error: 'Erro ao listar setores do usuário' });
  }
});

// POST /api/users/:userId/setores - Atribuir setor ao usuário
router.post('/users/:userId/setores', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { setorId, perfilId, principal } = req.body;

    if (!setorId || !perfilId) {
      return res.status(400).json({ error: 'setorId e perfilId são obrigatórios' });
    }

    // Verificar se usuário existe
    const userExists = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userExists.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se setor existe
    const setorExists = await db.select().from(setores).where(eq(setores.id, setorId)).limit(1);
    if (setorExists.length === 0) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    // Verificar se perfil existe
    const perfilExists = await db.select().from(perfis).where(eq(perfis.id, perfilId)).limit(1);
    if (perfilExists.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    // Verificar se já existe a relação
    const existing = await db
      .select()
      .from(userSetores)
      .where(and(eq(userSetores.userId, userId), eq(userSetores.setorId, setorId)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Usuário já está atribuído a este setor' });
    }

    // Se for principal, remover flag de outros setores
    if (principal) {
      await db
        .update(userSetores)
        .set({ principal: false })
        .where(eq(userSetores.userId, userId));
    }

    const result = await db
      .insert(userSetores)
      .values({ userId, setorId, perfilId, principal: principal || false })
      .returning();

    await logAudit({
      usuarioId: req.user!.id,
      acao: 'create',
      entidade: 'user_setores',
      entidadeId: result[0].id,
      descricao: `Usuário "${userExists[0].nome}" atribuído ao setor "${setorExists[0].nome}" como ${perfilExists[0].nome}`,
      dadosNovos: result[0],
      req,
    });

    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Erro ao atribuir setor ao usuário:', error);
    res.status(500).json({ error: 'Erro ao atribuir setor ao usuário' });
  }
});

// PUT /api/users/:userId/setores/:setorId - Atualizar perfil do usuário no setor
router.put('/users/:userId/setores/:setorId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, setorId } = req.params;
    const { perfilId, principal } = req.body;

    // Buscar relação atual
    const current = await db
      .select()
      .from(userSetores)
      .where(and(eq(userSetores.userId, userId), eq(userSetores.setorId, setorId)))
      .limit(1);

    if (current.length === 0) {
      return res.status(404).json({ error: 'Relação usuário-setor não encontrada' });
    }

    // Se for principal, remover flag de outros setores
    if (principal) {
      await db
        .update(userSetores)
        .set({ principal: false })
        .where(eq(userSetores.userId, userId));
    }

    const updateData: any = {};
    if (perfilId) updateData.perfilId = perfilId;
    if (typeof principal === 'boolean') updateData.principal = principal;

    const result = await db
      .update(userSetores)
      .set(updateData)
      .where(and(eq(userSetores.userId, userId), eq(userSetores.setorId, setorId)))
      .returning();

    await logAudit({
      usuarioId: req.user!.id,
      acao: 'update',
      entidade: 'user_setores',
      entidadeId: current[0].id,
      descricao: `Atribuição de usuário no setor atualizada`,
      dadosAnteriores: current[0],
      dadosNovos: result[0],
      req,
    });

    res.json(result[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar atribuição:', error);
    res.status(500).json({ error: 'Erro ao atualizar atribuição' });
  }
});

// DELETE /api/users/:userId/setores/:setorId - Remover usuário do setor
router.delete('/users/:userId/setores/:setorId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, setorId } = req.params;

    // Buscar relação atual
    const current = await db
      .select()
      .from(userSetores)
      .where(and(eq(userSetores.userId, userId), eq(userSetores.setorId, setorId)))
      .limit(1);

    if (current.length === 0) {
      return res.status(404).json({ error: 'Relação usuário-setor não encontrada' });
    }

    await db
      .delete(userSetores)
      .where(and(eq(userSetores.userId, userId), eq(userSetores.setorId, setorId)));

    await logAudit({
      usuarioId: req.user!.id,
      acao: 'delete',
      entidade: 'user_setores',
      entidadeId: current[0].id,
      descricao: `Usuário removido do setor`,
      dadosAnteriores: current[0],
      req,
    });

    res.json({ message: 'Usuário removido do setor com sucesso' });
  } catch (error: any) {
    console.error('Erro ao remover usuário do setor:', error);
    res.status(500).json({ error: 'Erro ao remover usuário do setor' });
  }
});

export default router;
