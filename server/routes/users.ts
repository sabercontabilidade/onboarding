import type { Express, Request, Response } from "express";
import { db } from "../db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../auth/middleware.js";
import { createAuditLog } from "../audit/logger.js";
import bcrypt from "bcrypt";

export function registerUserRoutes(app: Express) {
  // Listar todos os usuários (apenas Admin)
  app.get("/api/users", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        nome: users.nome,
        email: users.email,
        funcao: users.funcao,
        nivelPermissao: users.nivelPermissao,
        fotoUrl: users.fotoUrl,
        telefone: users.telefone,
        ativo: users.ativo,
        bloqueado: users.bloqueado,
        ultimoLogin: users.ultimoLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);

      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // Buscar usuário específico (apenas Admin ou próprio usuário)
  app.get("/api/users/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const requestingUser = (req as any).user;

      // Verificar se é admin ou o próprio usuário
      if (requestingUser.nivelPermissao !== 'administrador' && requestingUser.id !== userId) {
        return res.status(403).json({ error: "Sem permissão para acessar este usuário" });
      }

      const [user] = await db.select({
        id: users.id,
        nome: users.nome,
        email: users.email,
        funcao: users.funcao,
        nivelPermissao: users.nivelPermissao,
        fotoUrl: users.fotoUrl,
        telefone: users.telefone,
        dataNascimento: users.dataNascimento,
        ativo: users.ativo,
        bloqueado: users.bloqueado,
        ultimoLogin: users.ultimoLogin,
        permissoes: users.permissoes,
        preferencias: users.preferencias,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  });

  // Criar novo usuário (apenas Admin)
  app.post("/api/users", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, funcao, nivelPermissao, telefone, fotoUrl } = req.body;

      // Validações
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }

      // Verificar se email já existe
      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(409).json({ error: "Email já cadastrado" });
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
      }).returning();

      // Criar log de auditoria
      const requestingUser = (req as any).user;
      await createAuditLog({
        usuarioId: requestingUser.id,
        acao: "create",
        entidade: "users",
        entidadeId: newUser.id,
        descricao: `Usuário ${newUser.nome} criado`,
        dadosNovos: {
          nome: newUser.nome,
          email: newUser.email,
          funcao: newUser.funcao,
          nivelPermissao: newUser.nivelPermissao,
        },
        ipOrigem: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Remover senhaHash da resposta
      const { senhaHash: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  // Atualizar usuário (apenas Admin ou próprio usuário)
  app.put("/api/users/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const requestingUser = (req as any).user;
      const { nome, email, senha, funcao, nivelPermissao, telefone, fotoUrl, ativo, bloqueado } = req.body;

      // Verificar se é admin ou o próprio usuário
      const isAdmin = requestingUser.nivelPermissao === 'administrador';
      const isOwnProfile = requestingUser.id === userId;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({ error: "Sem permissão para atualizar este usuário" });
      }

      // Usuários não-admin só podem atualizar alguns campos próprios
      if (!isAdmin && (funcao || nivelPermissao !== undefined || ativo !== undefined || bloqueado !== undefined)) {
        return res.status(403).json({ error: "Sem permissão para alterar esses campos" });
      }

      // Buscar usuário atual
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!currentUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Preparar dados para atualização
      const updateData: any = { updatedAt: new Date() };
      if (nome) updateData.nome = nome;
      if (email) updateData.email = email;
      if (telefone !== undefined) updateData.telefone = telefone;
      if (fotoUrl !== undefined) updateData.fotoUrl = fotoUrl;

      // Campos apenas para admin
      if (isAdmin) {
        if (funcao) updateData.funcao = funcao;
        if (nivelPermissao) updateData.nivelPermissao = nivelPermissao;
        if (ativo !== undefined) updateData.ativo = ativo;
        if (bloqueado !== undefined) updateData.bloqueado = bloqueado;
      }

      // Atualizar senha se fornecida
      if (senha) {
        updateData.senhaHash = await bcrypt.hash(senha, 10);
      }

      // Atualizar usuário
      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Criar log de auditoria
      await createAuditLog({
        usuarioId: requestingUser.id,
        acao: "update",
        entidade: "users",
        entidadeId: userId,
        descricao: `Usuário ${updatedUser.nome} atualizado`,
        dadosAnteriores: {
          nome: currentUser.nome,
          email: currentUser.email,
          funcao: currentUser.funcao,
          nivelPermissao: currentUser.nivelPermissao,
        },
        dadosNovos: {
          nome: updatedUser.nome,
          email: updatedUser.email,
          funcao: updatedUser.funcao,
          nivelPermissao: updatedUser.nivelPermissao,
        },
        ipOrigem: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Remover senhaHash da resposta
      const { senhaHash: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // Atualizar perfil do próprio usuário
  app.put("/api/users/:id/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const requestingUser = (req as any).user;

      // Verificar se é o próprio usuário
      if (requestingUser.userId !== userId) {
        return res.status(403).json({ error: "Você só pode editar seu próprio perfil" });
      }

      const { nome, telefone } = req.body;

      // Validação
      if (!nome || nome.length < 2) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
      }

      // Buscar usuário atual
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!currentUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Atualizar perfil
      const [updatedUser] = await db.update(users)
        .set({
          nome,
          telefone: telefone || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      // Criar log de auditoria
      await createAuditLog({
        usuarioId: userId,
        acao: "profile_update",
        entidade: "users",
        entidadeId: userId,
        descricao: `Perfil atualizado`,
        dadosAnteriores: { nome: currentUser.nome, telefone: currentUser.telefone },
        dadosNovos: { nome, telefone },
        ipOrigem: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Remover senhaHash da resposta
      const { senhaHash: _, refreshToken, token, ...userResponse } = updatedUser;
      res.json({ success: true, user: userResponse });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // Atualizar preferências do usuário
  app.put("/api/users/:id/preferences", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const requestingUser = (req as any).user;

      // Verificar se é o próprio usuário
      if (requestingUser.userId !== userId) {
        return res.status(403).json({ error: "Você só pode editar suas próprias preferências" });
      }

      const { notificacoes, emailNotificacoes, tema, idioma } = req.body;

      // Buscar usuário atual
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!currentUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Mesclar preferências existentes com novas
      const newPreferences = {
        ...currentUser.preferencias,
        notificacoes: notificacoes ?? currentUser.preferencias?.notificacoes ?? true,
        emailNotificacoes: emailNotificacoes ?? currentUser.preferencias?.emailNotificacoes ?? true,
        tema: tema ?? currentUser.preferencias?.tema ?? 'system',
        idioma: idioma ?? currentUser.preferencias?.idioma ?? 'pt-BR',
      };

      // Atualizar preferências
      const [updatedUser] = await db.update(users)
        .set({
          preferencias: newPreferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      // Criar log de auditoria
      await createAuditLog({
        usuarioId: userId,
        acao: "preferences_update",
        entidade: "users",
        entidadeId: userId,
        descricao: `Preferências atualizadas`,
        dadosAnteriores: { preferencias: currentUser.preferencias },
        dadosNovos: { preferencias: newPreferences },
        ipOrigem: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Remover senhaHash da resposta
      const { senhaHash: _, refreshToken, token, ...userResponse } = updatedUser;
      res.json({ success: true, user: userResponse });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Erro ao atualizar preferências" });
    }
  });

  // Deletar usuário (apenas Admin)
  app.delete("/api/users/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const requestingUser = (req as any).user;

      // Não permitir deletar a si mesmo
      if (requestingUser.id === userId) {
        return res.status(400).json({ error: "Você não pode deletar sua própria conta" });
      }

      // Buscar usuário antes de deletar
      const [userToDelete] = await db.select().from(users).where(eq(users.id, userId));
      if (!userToDelete) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Deletar usuário
      await db.delete(users).where(eq(users.id, userId));

      // Criar log de auditoria
      await createAuditLog({
        usuarioId: requestingUser.id,
        acao: "delete",
        entidade: "users",
        entidadeId: userId,
        descricao: `Usuário ${userToDelete.nome} deletado`,
        dadosAnteriores: {
          nome: userToDelete.nome,
          email: userToDelete.email,
        },
        ipOrigem: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  });
}
