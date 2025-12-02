/**
 * Rotas de exportação de dados (CSV/PDF)
 */
import type { Express, Request, Response } from 'express';
import { db } from '../db.js';
import { clients, appointments, visits, users, auditLogs } from '@shared/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../auth/middleware.js';
import { createAuditLog, getClientIp, AuditActions } from '../audit/logger.js';
import {
  generateCSV,
  clientColumns,
  appointmentColumns,
  visitColumns,
  userColumns,
  auditLogColumns,
} from '../services/export/csv-generator.js';
import {
  generateClientsPDF,
  generateAppointmentsPDF,
  generateVisitsPDF,
  generateAuditLogsPDF,
} from '../services/export/pdf-generator.js';

// Adicionar ação de exportação ao AuditActions
const EXPORT_ACTION = 'data_export';

export function registerExportRoutes(app: Express) {
  /**
   * GET /api/export/clients/csv
   * Exportar clientes em CSV
   */
  app.get('/api/export/clients/csv', authenticate, async (req: Request, res: Response) => {
    try {
      const { status, startDate, endDate } = req.query;

      // Buscar clientes com relacionamentos
      let query = db
        .select({
          id: clients.id,
          companyName: clients.companyName,
          cnpj: clients.cnpj,
          sector: clients.sector,
          contactName: clients.contactName,
          contactEmail: clients.contactEmail,
          contactPhone: clients.contactPhone,
          status: clients.status,
          notes: clients.notes,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
          assignee: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(clients)
        .leftJoin(users, eq(clients.assigneeId, users.id));

      // Aplicar filtros
      const conditions = [];
      if (status) {
        conditions.push(eq(clients.status, status as any));
      }
      if (startDate) {
        conditions.push(gte(clients.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(clients.createdAt, new Date(endDate as string)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(clients.createdAt));

      // Gerar CSV
      const csv = generateCSV(data, clientColumns);

      // Audit log
      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'clients',
        descricao: `Exportação de ${data.length} clientes em CSV`,
        dadosNovos: { format: 'csv', count: data.length, filters: { status, startDate, endDate } },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      // Enviar arquivo
      const filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Erro ao exportar clientes CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/clients/pdf
   * Exportar clientes em PDF
   */
  app.get('/api/export/clients/pdf', authenticate, async (req: Request, res: Response) => {
    try {
      const { status, startDate, endDate } = req.query;

      // Buscar clientes
      let query = db
        .select({
          id: clients.id,
          companyName: clients.companyName,
          cnpj: clients.cnpj,
          sector: clients.sector,
          contactName: clients.contactName,
          contactEmail: clients.contactEmail,
          contactPhone: clients.contactPhone,
          status: clients.status,
          notes: clients.notes,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
          assignee: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(clients)
        .leftJoin(users, eq(clients.assigneeId, users.id));

      const conditions = [];
      if (status) {
        conditions.push(eq(clients.status, status as any));
      }
      if (startDate) {
        conditions.push(gte(clients.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(clients.createdAt, new Date(endDate as string)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(clients.createdAt));

      // Gerar subtítulo com filtros
      let subtitle = '';
      if (status || startDate || endDate) {
        const parts = [];
        if (status) parts.push(`Status: ${status}`);
        if (startDate) parts.push(`De: ${new Date(startDate as string).toLocaleDateString('pt-BR')}`);
        if (endDate) parts.push(`Até: ${new Date(endDate as string).toLocaleDateString('pt-BR')}`);
        subtitle = parts.join(' | ');
      }

      // Gerar PDF
      const pdfBuffer = await generateClientsPDF(data, { subtitle });

      // Audit log
      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'clients',
        descricao: `Exportação de ${data.length} clientes em PDF`,
        dadosNovos: { format: 'pdf', count: data.length, filters: { status, startDate, endDate } },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      // Enviar arquivo
      const filename = `clientes_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao exportar clientes PDF:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/appointments/csv
   * Exportar agendamentos em CSV
   */
  app.get('/api/export/appointments/csv', authenticate, async (req: Request, res: Response) => {
    try {
      const { status, type, startDate, endDate, clientId } = req.query;

      let query = db
        .select({
          id: appointments.id,
          title: appointments.title,
          description: appointments.description,
          type: appointments.type,
          scheduledStart: appointments.scheduledStart,
          scheduledEnd: appointments.scheduledEnd,
          location: appointments.location,
          meetingUrl: appointments.meetingUrl,
          status: appointments.status,
          createdAt: appointments.createdAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
          },
          assignee: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(users, eq(appointments.assigneeId, users.id));

      const conditions = [];
      if (status) {
        conditions.push(eq(appointments.status, status as any));
      }
      if (type) {
        conditions.push(eq(appointments.type, type as any));
      }
      if (clientId) {
        conditions.push(eq(appointments.clientId, clientId as string));
      }
      if (startDate) {
        conditions.push(gte(appointments.scheduledStart, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(appointments.scheduledStart, new Date(endDate as string)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(appointments.scheduledStart));

      const csv = generateCSV(data, appointmentColumns);

      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'appointments',
        descricao: `Exportação de ${data.length} agendamentos em CSV`,
        dadosNovos: { format: 'csv', count: data.length },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      const filename = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Erro ao exportar agendamentos CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/appointments/pdf
   * Exportar agendamentos em PDF
   */
  app.get('/api/export/appointments/pdf', authenticate, async (req: Request, res: Response) => {
    try {
      const { status, type, startDate, endDate, clientId } = req.query;

      let query = db
        .select({
          id: appointments.id,
          title: appointments.title,
          description: appointments.description,
          type: appointments.type,
          scheduledStart: appointments.scheduledStart,
          scheduledEnd: appointments.scheduledEnd,
          location: appointments.location,
          meetingUrl: appointments.meetingUrl,
          status: appointments.status,
          createdAt: appointments.createdAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
          },
          assignee: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(users, eq(appointments.assigneeId, users.id));

      const conditions = [];
      if (status) conditions.push(eq(appointments.status, status as any));
      if (type) conditions.push(eq(appointments.type, type as any));
      if (clientId) conditions.push(eq(appointments.clientId, clientId as string));
      if (startDate) conditions.push(gte(appointments.scheduledStart, new Date(startDate as string)));
      if (endDate) conditions.push(lte(appointments.scheduledStart, new Date(endDate as string)));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(appointments.scheduledStart));

      let subtitle = '';
      if (startDate || endDate) {
        const parts = [];
        if (startDate) parts.push(`De: ${new Date(startDate as string).toLocaleDateString('pt-BR')}`);
        if (endDate) parts.push(`Até: ${new Date(endDate as string).toLocaleDateString('pt-BR')}`);
        subtitle = parts.join(' | ');
      }

      const pdfBuffer = await generateAppointmentsPDF(data, { subtitle });

      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'appointments',
        descricao: `Exportação de ${data.length} agendamentos em PDF`,
        dadosNovos: { format: 'pdf', count: data.length },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      const filename = `agendamentos_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao exportar agendamentos PDF:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/visits/csv
   * Exportar visitas em CSV
   */
  app.get('/api/export/visits/csv', authenticate, async (req: Request, res: Response) => {
    try {
      const { status, type, startDate, endDate, clientId } = req.query;

      let query = db
        .select({
          id: visits.id,
          date: visits.date,
          participants: visits.participants,
          description: visits.description,
          type: visits.type,
          status: visits.status,
          location: visits.location,
          satisfaction_rating: visits.satisfaction_rating,
          notes: visits.notes,
          createdAt: visits.createdAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
          },
          assignee: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(visits)
        .leftJoin(clients, eq(visits.clientId, clients.id))
        .leftJoin(users, eq(visits.assigneeId, users.id));

      const conditions = [];
      if (status) conditions.push(eq(visits.status, status as any));
      if (type) conditions.push(eq(visits.type, type as any));
      if (clientId) conditions.push(eq(visits.clientId, clientId as string));
      if (startDate) conditions.push(gte(visits.date, new Date(startDate as string)));
      if (endDate) conditions.push(lte(visits.date, new Date(endDate as string)));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(visits.date));

      const csv = generateCSV(data, visitColumns);

      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'visits',
        descricao: `Exportação de ${data.length} visitas em CSV`,
        dadosNovos: { format: 'csv', count: data.length },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      const filename = `visitas_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Erro ao exportar visitas CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/visits/pdf
   * Exportar visitas em PDF
   */
  app.get('/api/export/visits/pdf', authenticate, async (req: Request, res: Response) => {
    try {
      const { status, type, startDate, endDate, clientId } = req.query;

      let query = db
        .select({
          id: visits.id,
          date: visits.date,
          participants: visits.participants,
          description: visits.description,
          type: visits.type,
          status: visits.status,
          location: visits.location,
          satisfaction_rating: visits.satisfaction_rating,
          notes: visits.notes,
          createdAt: visits.createdAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
          },
          assignee: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(visits)
        .leftJoin(clients, eq(visits.clientId, clients.id))
        .leftJoin(users, eq(visits.assigneeId, users.id));

      const conditions = [];
      if (status) conditions.push(eq(visits.status, status as any));
      if (type) conditions.push(eq(visits.type, type as any));
      if (clientId) conditions.push(eq(visits.clientId, clientId as string));
      if (startDate) conditions.push(gte(visits.date, new Date(startDate as string)));
      if (endDate) conditions.push(lte(visits.date, new Date(endDate as string)));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(visits.date));

      let subtitle = '';
      if (startDate || endDate) {
        const parts = [];
        if (startDate) parts.push(`De: ${new Date(startDate as string).toLocaleDateString('pt-BR')}`);
        if (endDate) parts.push(`Até: ${new Date(endDate as string).toLocaleDateString('pt-BR')}`);
        subtitle = parts.join(' | ');
      }

      const pdfBuffer = await generateVisitsPDF(data, { subtitle });

      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'visits',
        descricao: `Exportação de ${data.length} visitas em PDF`,
        dadosNovos: { format: 'pdf', count: data.length },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      const filename = `visitas_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao exportar visitas PDF:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/users/csv
   * Exportar usuários em CSV (apenas admin)
   */
  app.get('/api/export/users/csv', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { funcao, ativo } = req.query;

      let query = db
        .select({
          id: users.id,
          nome: users.nome,
          email: users.email,
          telefone: users.telefone,
          funcao: users.funcao,
          nivelPermissao: users.nivelPermissao,
          ativo: users.ativo,
          bloqueado: users.bloqueado,
          ultimoLogin: users.ultimoLogin,
          createdAt: users.createdAt,
        })
        .from(users);

      const conditions = [];
      if (funcao) {
        conditions.push(eq(users.funcao, funcao as any));
      }
      if (ativo !== undefined) {
        conditions.push(eq(users.ativo, ativo === 'true'));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(users.nome);

      const csv = generateCSV(data, userColumns);

      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: EXPORT_ACTION,
        entidade: 'users',
        descricao: `Exportação de ${data.length} usuários em CSV`,
        dadosNovos: { format: 'csv', count: data.length },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      const filename = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Erro ao exportar usuários CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/audit/csv
   * Exportar logs de auditoria em CSV (apenas admin)
   */
  app.get('/api/export/audit/csv', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, acao, usuarioId } = req.query;

      let query = db
        .select({
          id: auditLogs.id,
          acao: auditLogs.acao,
          entidade: auditLogs.entidade,
          entidadeId: auditLogs.entidadeId,
          descricao: auditLogs.descricao,
          ipOrigem: auditLogs.ipOrigem,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          usuario: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.usuarioId, users.id));

      const conditions = [];
      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));
      }
      if (acao) {
        conditions.push(eq(auditLogs.acao, acao as string));
      }
      if (usuarioId) {
        conditions.push(eq(auditLogs.usuarioId, usuarioId as string));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(auditLogs.createdAt)).limit(10000);

      const csv = generateCSV(data, auditLogColumns);

      const filename = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Erro ao exportar auditoria CSV:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });

  /**
   * GET /api/export/audit/pdf
   * Exportar logs de auditoria em PDF (apenas admin)
   */
  app.get('/api/export/audit/pdf', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, acao, usuarioId } = req.query;

      let query = db
        .select({
          id: auditLogs.id,
          acao: auditLogs.acao,
          entidade: auditLogs.entidade,
          entidadeId: auditLogs.entidadeId,
          descricao: auditLogs.descricao,
          ipOrigem: auditLogs.ipOrigem,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          usuario: {
            id: users.id,
            nome: users.nome,
          },
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.usuarioId, users.id));

      const conditions = [];
      if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
      if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));
      if (acao) conditions.push(eq(auditLogs.acao, acao as string));
      if (usuarioId) conditions.push(eq(auditLogs.usuarioId, usuarioId as string));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const data = await query.orderBy(desc(auditLogs.createdAt)).limit(5000);

      let subtitle = '';
      if (startDate || endDate) {
        const parts = [];
        if (startDate) parts.push(`De: ${new Date(startDate as string).toLocaleDateString('pt-BR')}`);
        if (endDate) parts.push(`Até: ${new Date(endDate as string).toLocaleDateString('pt-BR')}`);
        subtitle = parts.join(' | ');
      }

      const pdfBuffer = await generateAuditLogsPDF(data, { subtitle });

      const filename = `auditoria_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao exportar auditoria PDF:', error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  });
}
