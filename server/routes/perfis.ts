import { Router } from 'express';
import { db } from '../db.js';
import { perfis, type Perfil } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticate } from '../auth/middleware.js';

const router = Router();

// GET /api/perfis - Listar todos os perfis
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db
      .select()
      .from(perfis)
      .where(eq(perfis.ativo, true))
      .orderBy(asc(perfis.nivelHierarquico));

    res.json(result);
  } catch (error: any) {
    console.error('Erro ao listar perfis:', error);
    res.status(500).json({ error: 'Erro ao listar perfis' });
  }
});

// GET /api/perfis/:id - Obter perfil específico
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(perfis)
      .where(eq(perfis.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({ error: 'Erro ao obter perfil' });
  }
});

export default router;
