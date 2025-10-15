import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, type TokenPayload } from './jwt.js';
import { db } from '../db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getCache, setCache, CACHE_TTL, CACHE_KEYS } from '../cache.js';

// Estender o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

/**
 * Middleware para autenticar requisições com JWT
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: 'Token não fornecido',
        code: 'NO_TOKEN',
      });
    }

    // Verificar token
    const payload = verifyToken(token);

    // Verificar se usuário existe e está ativo (com cache)
    const cachedUser = await getCache(CACHE_KEYS.USER(payload.userId));

    let user = cachedUser;
    if (!user) {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!dbUser) {
        return res.status(401).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      user = dbUser;
      // Cachear por 1 hora
      await setCache(CACHE_KEYS.USER(payload.userId), user, CACHE_TTL.ONE_HOUR);
    }

    if (!user.ativo) {
      return res.status(403).json({
        error: 'Usuário desativado',
        code: 'USER_INACTIVE',
      });
    }

    if (user.bloqueado) {
      return res.status(403).json({
        error: 'Usuário bloqueado',
        code: 'USER_BLOCKED',
      });
    }

    // Adicionar dados do usuário na request
    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      funcao: payload.funcao,
      nivelPermissao: payload.nivelPermissao,
    };

    next();
  } catch (error: any) {
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.message === 'TOKEN_INVALID') {
      return res.status(401).json({
        error: 'Token inválido',
        code: 'TOKEN_INVALID',
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(401).json({
      error: 'Falha na autenticação',
      code: 'AUTH_FAILED',
    });
  }
}

/**
 * Middleware para verificar se usuário tem permissão de administrador
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (req.user.nivelPermissao !== 'administrador') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores.',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
}

/**
 * Middleware para verificar função específica
 */
export function requireFuncao(...funcoesPermitidas: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Admin tem acesso a tudo
    if (req.user.nivelPermissao === 'administrador') {
      return next();
    }

    const funcaoUsuario = req.user.funcao;
    if (!funcaoUsuario || !funcoesPermitidas.includes(funcaoUsuario)) {
      return res.status(403).json({
        error: `Acesso negado. Funções permitidas: ${funcoesPermitidas.join(', ')}`,
        code: 'FUNCAO_REQUIRED',
        requiredFuncoes: funcoesPermitidas,
      });
    }

    next();
  };
}

/**
 * Middleware para verificar nível de permissão mínimo
 */
export function requirePermissao(nivelMinimo: 'administrador' | 'operador' | 'analista') {
  const hierarquia: Record<string, number> = {
    administrador: 3,
    operador: 2,
    analista: 1,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const nivelUsuario = req.user.nivelPermissao || 'analista';
    const nivelRequerido = hierarquia[nivelMinimo];
    const nivelAtual = hierarquia[nivelUsuario];

    if (nivelAtual < nivelRequerido) {
      return res.status(403).json({
        error: `Acesso negado. Nível mínimo requerido: ${nivelMinimo}`,
        code: 'PERMISSION_DENIED',
        required: nivelMinimo,
        current: nivelUsuario,
      });
    }

    next();
  };
}

/**
 * Middleware para verificar se usuário pode editar (atribuído ou admin)
 */
export async function canEdit(
  entityType: string,
  getAssignedUserId: (req: Request) => Promise<string | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Admin pode editar tudo
    if (req.user.nivelPermissao === 'administrador') {
      return next();
    }

    // Verificar se usuário está atribuído
    const assignedUserId = await getAssignedUserId(req);

    if (!assignedUserId || assignedUserId !== req.user.userId) {
      return res.status(403).json({
        error: 'Você não tem permissão para editar este item. Apenas o usuário atribuído pode editar.',
        code: 'NOT_ASSIGNED',
      });
    }

    next();
  };
}

/**
 * Middleware opcional - não requer autenticação mas adiciona user se token válido
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyToken(token);
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        funcao: payload.funcao,
        nivelPermissao: payload.nivelPermissao,
      };
    }
  } catch (error) {
    // Ignora erros - não é obrigatório estar autenticado
  }

  next();
}
