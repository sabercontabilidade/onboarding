import type { Express } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users, auditLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateTokenPair, verifyToken, extractTokenFromHeader } from '../auth/jwt.js';
import { authenticate } from '../auth/middleware.js';
import { createAuditLog, getClientIp, AuditActions } from '../audit/logger.js';
import { deleteCache, CACHE_KEYS } from '../cache.js';

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/register
   * Registrar novo usuário (apenas admin)
   */
  app.post('/api/auth/register', authenticate, async (req, res) => {
    try {
      // Apenas admin pode criar usuários
      if (req.user?.nivelPermissao !== 'administrador') {
        return res.status(403).json({ error: 'Apenas administradores podem criar usuários' });
      }

      const { nome, email, senha, funcao, nivelPermissao, telefone, fotoUrl } = req.body;

      // Validações
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      // Verificar se email já existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Criar usuário
      const [newUser] = await db.insert(users).values({
        nome,
        email,
        senhaHash,
        funcao: funcao || 'onboarding',
        nivelPermissao: nivelPermissao || 'operador',
        telefone,
        fotoUrl,
        ativo: true,
        bloqueado: false,
        tentativasLogin: 0,
      }).returning();

      // Audit log
      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: AuditActions.USER_CREATE,
        entidade: 'user',
        entidadeId: newUser.id,
        descricao: `Usuário ${newUser.nome} criado`,
        dadosNovos: { nome, email, funcao, nivelPermissao },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      // Remover dados sensíveis
      const { senhaHash: _, token, refreshToken, ...userWithoutPassword } = newUser;

      res.status(201).json({
        success: true,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  });

  /**
   * POST /api/auth/login
   * Autenticar usuário e gerar tokens
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      // Buscar usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // Audit log - tentativa de login falhada
        await createAuditLog({
          acao: AuditActions.LOGIN_FAILED,
          entidade: 'user',
          descricao: `Tentativa de login com email não encontrado: ${email}`,
          ipOrigem: getClientIp(req),
          userAgent: req.headers['user-agent'],
        });

        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      // Verificar se usuário está bloqueado
      if (user.bloqueado) {
        return res.status(403).json({ error: 'Usuário bloqueado. Entre em contato com o administrador.' });
      }

      // Verificar se usuário está ativo
      if (!user.ativo) {
        return res.status(403).json({ error: 'Usuário desativado. Entre em contato com o administrador.' });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, user.senhaHash);

      if (!senhaValida) {
        // Incrementar tentativas de login
        const novasTentativas = user.tentativasLogin + 1;
        const devBloquear = novasTentativas >= 5;

        await db
          .update(users)
          .set({
            tentativasLogin: novasTentativas,
            bloqueado: devBloquear,
          })
          .where(eq(users.id, user.id));

        // Audit log
        await createAuditLog({
          usuarioId: user.id,
          acao: AuditActions.LOGIN_FAILED,
          entidade: 'user',
          entidadeId: user.id,
          descricao: `Tentativa de login falhada (${novasTentativas}/5)${devBloquear ? ' - Usuário bloqueado' : ''}`,
          ipOrigem: getClientIp(req),
          userAgent: req.headers['user-agent'],
        });

        if (devBloquear) {
          return res.status(403).json({
            error: 'Usuário bloqueado após 5 tentativas falhadas. Entre em contato com o administrador.',
          });
        }

        return res.status(401).json({
          error: 'Email ou senha incorretos',
          tentativasRestantes: 5 - novasTentativas,
        });
      }

      // Login bem-sucedido - resetar tentativas
      await db
        .update(users)
        .set({
          tentativasLogin: 0,
          ultimoLogin: new Date(),
        })
        .where(eq(users.id, user.id));

      // Remover dados sensíveis
      const { senhaHash, ...userWithoutPassword } = user;

      // Gerar tokens
      const tokens = generateTokenPair(userWithoutPassword);

      // Salvar refresh token no banco
      await db
        .update(users)
        .set({ refreshToken: tokens.refreshToken })
        .where(eq(users.id, user.id));

      // Audit log
      await createAuditLog({
        usuarioId: user.id,
        acao: AuditActions.LOGIN,
        entidade: 'user',
        entidadeId: user.id,
        descricao: `Login realizado com sucesso`,
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        user: userWithoutPassword,
        ...tokens,
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro ao realizar login' });
    }
  });

  /**
   * POST /api/auth/refresh
   * Renovar access token usando refresh token
   */
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token não fornecido' });
      }

      // Verificar refresh token
      const payload = verifyToken(refreshToken);

      // Buscar usuário e verificar se refresh token é válido
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }

      if (!user.ativo || user.bloqueado) {
        return res.status(403).json({ error: 'Usuário inativo ou bloqueado' });
      }

      // Remover dados sensíveis
      const { senhaHash, ...userWithoutPassword } = user;

      // Gerar novos tokens
      const tokens = generateTokenPair(userWithoutPassword);

      // Salvar novo refresh token
      await db
        .update(users)
        .set({ refreshToken: tokens.refreshToken })
        .where(eq(users.id, user.id));

      // Audit log
      await createAuditLog({
        usuarioId: user.id,
        acao: AuditActions.TOKEN_REFRESH,
        entidade: 'user',
        entidadeId: user.id,
        descricao: 'Token renovado',
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        ...tokens,
      });
    } catch (error: any) {
      if (error.message === 'TOKEN_EXPIRED') {
        return res.status(401).json({ error: 'Refresh token expirado. Faça login novamente.' });
      }
      console.error('Erro ao renovar token:', error);
      res.status(401).json({ error: 'Falha ao renovar token' });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout e revogar tokens
   */
  app.post('/api/auth/logout', authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Revogar refresh token
      await db
        .update(users)
        .set({ refreshToken: null, token: null })
        .where(eq(users.id, req.user.userId));

      // Invalidar cache do usuário
      await deleteCache(CACHE_KEYS.USER(req.user.userId));

      // Audit log
      await createAuditLog({
        usuarioId: req.user.userId,
        acao: AuditActions.LOGOUT,
        entidade: 'user',
        entidadeId: req.user.userId,
        descricao: 'Logout realizado',
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({ error: 'Erro ao realizar logout' });
    }
  });

  /**
   * GET /api/auth/me
   * Obter dados do usuário autenticado
   */
  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar dados atualizados do usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Remover dados sensíveis
      const { senhaHash, token, refreshToken, ...userWithoutPassword } = user;

      res.json({
        success: true,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Solicitar recuperação de senha
   */
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório' });
      }

      // Buscar usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Sempre retornar sucesso para não revelar se o email existe
      if (!user) {
        return res.json({
          success: true,
          message: 'Se o email existir, você receberá instruções para recuperar sua senha.',
        });
      }

      // TODO: Implementar envio de email com token de recuperação
      // Por enquanto, apenas criar audit log

      await createAuditLog({
        usuarioId: user.id,
        acao: AuditActions.PASSWORD_RESET_REQUEST,
        entidade: 'user',
        entidadeId: user.id,
        descricao: 'Solicitação de recuperação de senha',
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Se o email existir, você receberá instruções para recuperar sua senha.',
      });
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      res.status(500).json({ error: 'Erro ao solicitar recuperação de senha' });
    }
  });

  /**
   * POST /api/auth/change-password
   * Alterar senha (usuário autenticado)
   */
  app.post('/api/auth/change-password', authenticate, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { senhaAtual, novaSenha } = req.body;

      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
      }

      // Buscar usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, user.senhaHash);

      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      // Hash da nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha
      await db
        .update(users)
        .set({ senhaHash: novaSenhaHash })
        .where(eq(users.id, user.id));

      // Audit log
      await createAuditLog({
        usuarioId: user.id,
        acao: AuditActions.PASSWORD_RESET,
        entidade: 'user',
        entidadeId: user.id,
        descricao: 'Senha alterada',
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({ error: 'Erro ao alterar senha' });
    }
  });
}
