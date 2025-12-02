import type { Express, Request, Response } from "express";
import { db } from "../db.js";
import { auditLogs, users } from "@shared/schema";
import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";
import { authenticate, requireAdmin } from "../auth/middleware.js";

export function registerAuditRoutes(app: Express) {
  // Listar logs de auditoria (apenas Admin)
  app.get("/api/audit-logs", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '50',
        usuarioId,
        acao,
        entidade,
        startDate,
        endDate,
        search
      } = req.query;

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Construir condições de filtro
      const conditions = [];

      if (usuarioId) {
        conditions.push(eq(auditLogs.usuarioId, usuarioId as string));
      }

      if (acao) {
        conditions.push(eq(auditLogs.acao, acao as string));
      }

      if (entidade) {
        conditions.push(eq(auditLogs.entidade, entidade as string));
      }

      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
      }

      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));
      }

      if (search) {
        conditions.push(
          or(
            like(auditLogs.descricao, `%${search}%`),
            like(auditLogs.acao, `%${search}%`),
            like(auditLogs.entidade, `%${search}%`)
          )
        );
      }

      // Buscar logs com join de usuários
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select({
          id: auditLogs.id,
          acao: auditLogs.acao,
          entidade: auditLogs.entidade,
          entidadeId: auditLogs.entidadeId,
          descricao: auditLogs.descricao,
          dadosAnteriores: auditLogs.dadosAnteriores,
          dadosNovos: auditLogs.dadosNovos,
          ipOrigem: auditLogs.ipOrigem,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          usuario: {
            id: users.id,
            nome: users.nome,
            email: users.email,
            fotoUrl: users.fotoUrl,
          }
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.usuarioId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limitNumber)
        .offset(offset);

      // Contar total de logs
      const [{ count }] = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(whereClause) as any;

      const totalLogs = parseInt(count || '0');
      const totalPages = Math.ceil(totalLogs / limitNumber);

      res.json({
        logs,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalLogs,
          totalPages,
        }
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Erro ao buscar logs de auditoria" });
    }
  });

  // Buscar log específico (apenas Admin)
  app.get("/api/audit-logs/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const [log] = await db
        .select({
          id: auditLogs.id,
          acao: auditLogs.acao,
          entidade: auditLogs.entidade,
          entidadeId: auditLogs.entidadeId,
          descricao: auditLogs.descricao,
          dadosAnteriores: auditLogs.dadosAnteriores,
          dadosNovos: auditLogs.dadosNovos,
          ipOrigem: auditLogs.ipOrigem,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          usuario: {
            id: users.id,
            nome: users.nome,
            email: users.email,
            fotoUrl: users.fotoUrl,
          }
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.usuarioId, users.id))
        .where(eq(auditLogs.id, req.params.id));

      if (!log) {
        return res.status(404).json({ error: "Log de auditoria não encontrado" });
      }

      res.json(log);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ error: "Erro ao buscar log de auditoria" });
    }
  });

  // Estatísticas de auditoria (apenas Admin)
  app.get("/api/audit-logs/stats/summary", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const conditions = [];
      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total de logs
      const [{ total }] = await db
        .select({ total: auditLogs.id })
        .from(auditLogs)
        .where(whereClause) as any;

      // Logs por ação
      const logsByAction = await db
        .select({
          acao: auditLogs.acao,
          count: auditLogs.id
        })
        .from(auditLogs)
        .where(whereClause) as any;

      // Logs por entidade
      const logsByEntity = await db
        .select({
          entidade: auditLogs.entidade,
          count: auditLogs.id
        })
        .from(auditLogs)
        .where(whereClause) as any;

      // Usuários mais ativos
      const mostActiveUsers = await db
        .select({
          usuarioId: auditLogs.usuarioId,
          nome: users.nome,
          email: users.email,
          count: auditLogs.id
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.usuarioId, users.id))
        .where(whereClause)
        .limit(10) as any;

      res.json({
        total: parseInt(total || '0'),
        byAction: logsByAction,
        byEntity: logsByEntity,
        mostActiveUsers,
      });
    } catch (error) {
      console.error("Error fetching audit stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas de auditoria" });
    }
  });
}
