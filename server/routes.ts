import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertClientSchema, insertAppointmentSchema, insertVisitSchema } from "@shared/schema";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAssignmentRoutes } from "./routes/assignments.js";
import { registerCommentRoutes } from "./routes/comments.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerExportRoutes } from "./routes/export.js";
import { registerTwoFactorRoutes } from "./routes/two-factor.js";
import integrationsRouter from "./routes/integrations.js";
import setoresRouter from "./routes/setores.js";
import perfisRouter from "./routes/perfis.js";
import { authenticate, requireAdmin, requirePermissao } from "./auth/middleware.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // ========================================
  // ROTAS DE AUTENTICAÇÃO (SEM PROTEÇÃO)
  // ========================================
  registerAuthRoutes(app);

  // ========================================
  // ROTAS DE ATRIBUIÇÕES (PROTEGIDAS)
  // ========================================
  registerAssignmentRoutes(app);

  // ========================================
  // ROTAS DE COMENTÁRIOS (PROTEGIDAS)
  // ========================================
  registerCommentRoutes(app);

  // ========================================
  // ROTAS DE NOTIFICAÇÕES (PROTEGIDAS)
  // ========================================
  registerNotificationRoutes(app);

  // ========================================
  // ROTAS DE USUÁRIOS (PROTEGIDAS)
  // ========================================
  registerUserRoutes(app);

  // ========================================
  // ROTAS DE AUDITORIA (PROTEGIDAS)
  // ========================================
  registerAuditRoutes(app);

  // ========================================
  // ROTAS DE ARQUIVOS (PROTEGIDAS)
  // ========================================
  registerFileRoutes(app);

  // ========================================
  // ROTAS DE EXPORTAÇÃO (CSV/PDF)
  // ========================================
  registerExportRoutes(app);

  // ========================================
  // ROTAS DE 2FA/TOTP
  // ========================================
  registerTwoFactorRoutes(app);

  // ========================================
  // ROTAS DE INTEGRAÇÕES (Google OAuth2, Calendar)
  // ========================================
  app.use('/api/integrations', integrationsRouter);

  // ========================================
  // ROTAS DE SETORES E PERFIS (PROTEGIDAS)
  // ========================================
  app.use('/api/setores', setoresRouter);
  app.use('/api/perfis', perfisRouter);

  // ========================================
  // ROTAS EXISTENTES (PROTEGIDAS)
  // ========================================
  // Dashboard routes
  app.get("/api/dashboard/metrics", authenticate, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Dashboard counts (para sidebar e estatísticas gerais)
  app.get("/api/dashboard/counts", authenticate, async (req, res) => {
    try {
      const counts = await storage.getDashboardCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching dashboard counts:", error);
      res.status(500).json({ error: "Failed to fetch dashboard counts" });
    }
  });

  // Dashboard - Estatísticas de Satisfação
  app.get("/api/dashboard/satisfaction", authenticate, async (req, res) => {
    try {
      const satisfactionStats = await storage.getSatisfactionStats();
      res.json(satisfactionStats);
    } catch (error) {
      console.error("Error fetching satisfaction stats:", error);
      res.status(500).json({ error: "Failed to fetch satisfaction statistics" });
    }
  });

  // Dashboard - Clientes sem Contato Recente
  app.get("/api/dashboard/clients-without-contact", authenticate, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const clientsWithoutContact = await storage.getClientsWithoutRecentContact(days);
      res.json(clientsWithoutContact);
    } catch (error) {
      console.error("Error fetching clients without contact:", error);
      res.status(500).json({ error: "Failed to fetch clients without recent contact" });
    }
  });

  // Client routes
  app.get("/api/clients", authenticate, async (req, res) => {
    try {
      const search = req.query.search as string;
      const clients = await storage.getClientsWithDetails(search);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", authenticate, async (req, res) => {
    try {
      const client = await storage.getClientWithDetails(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", authenticate, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      
      // Validação adicional para campos de contato obrigatórios
      if (!clientData.contactName?.trim()) {
        return res.status(422).json({ error: "Nome do contato é obrigatório e não pode estar vazio" });
      }
      
      if (!clientData.contactEmail?.trim()) {
        return res.status(422).json({ error: "Email do contato é obrigatório e não pode estar vazio" });
      }
      
      // Validação básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientData.contactEmail.trim())) {
        return res.status(422).json({ error: "Email do contato deve ter formato válido" });
      }
      
      if (!clientData.contactPhone?.trim()) {
        return res.status(422).json({ error: "Telefone do contato é obrigatório e não pode estar vazio" });
      }
      
      if (!clientData.companyName?.trim()) {
        return res.status(422).json({ error: "Nome da empresa é obrigatório e não pode estar vazio" });
      }
      
      console.log('✅ Validação de contatos passou - criando cliente:', {
        companyName: clientData.companyName,
        contactName: clientData.contactName,
        contactEmail: clientData.contactEmail,
        contactPhone: clientData.contactPhone
      });
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      if (error.code === 'DUPLICATE_CNPJ') {
        res.status(409).json({ error: error.message });
      } else if (error.name === 'ZodError') {
        res.status(422).json({ error: "Dados inválidos: " + error.issues.map((i: any) => i.message).join(', ') });
      } else {
        res.status(400).json({ error: "Dados do cliente inválidos" });
      }
    }
  });

  app.put("/api/clients/:id", authenticate, async (req, res) => {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, updates);
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", authenticate, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete client" });
    }
  });

  app.post("/api/clients/:id/start-onboarding", authenticate, async (req, res) => {
    try {
      const clientId = req.params.id;
      const { assigneeId } = req.body;
      
      await storage.startOnboarding(clientId, assigneeId);
      
      res.status(200).json({ 
        success: true, 
        message: "Processo de onboarding iniciado com sucesso" 
      });
    } catch (error: any) {
      console.error('Erro ao iniciar onboarding:', error);
      if (error.message.includes('não encontrado')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('já foi iniciado')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Falha ao iniciar processo de onboarding" });
      }
    }
  });

  // Appointment routes
  app.get("/api/appointments", authenticate, async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsWithDetails();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/upcoming", authenticate, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const appointments = await storage.getUpcomingAppointments(limit);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming appointments" });
    }
  });

  app.post("/api/appointments", authenticate, async (req, res) => {
    try {
      // Convert date strings to Date objects if necessary
      if (req.body.scheduledStart && typeof req.body.scheduledStart === 'string') {
        req.body.scheduledStart = new Date(req.body.scheduledStart);
      }
      if (req.body.scheduledEnd && typeof req.body.scheduledEnd === 'string') {
        req.body.scheduledEnd = new Date(req.body.scheduledEnd);
      }
      
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ error: "Invalid appointment data" });
    }
  });

  app.put("/api/appointments/:id", authenticate, async (req, res) => {
    try {
      const updates = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, updates);
      res.json(appointment);
    } catch (error) {
      res.status(400).json({ error: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", authenticate, async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete appointment" });
    }
  });

  // Google Calendar availability route
  app.get("/api/v1/agendamentos/disponibilidade/:userId", authenticate, async (req, res) => {
    try {
      const userId = req.params.userId;
      const daysAhead = parseInt(req.query.days_ahead as string) || 7;

      // TODO: Implementar integração real com Google Calendar API
      // Por enquanto retorna erro indicando que a integração não está configurada
      res.status(501).json({
        error: "Integração com Google Calendar não implementada",
        message: "Para usar esta funcionalidade, configure as credenciais OAuth2 do Google Calendar e implemente a autenticação do usuário.",
        userId: userId,
        daysAhead: daysAhead
      });
    } catch (error) {
      console.error("Error fetching calendar availability:", error);
      res.status(500).json({
        error: "Erro ao buscar disponibilidade do calendário"
      });
    }
  });

  // Onboarding routes
  app.get("/api/clients/:id/onboarding", authenticate, async (req, res) => {
    try {
      const stages = await storage.getOnboardingStages(req.params.id);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding stages" });
    }
  });

  // Progresso de onboarding de um cliente específico
  app.get("/api/clients/:id/onboarding-progress", authenticate, async (req, res) => {
    try {
      const progress = await storage.getOnboardingProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching onboarding progress:", error);
      res.status(500).json({ error: "Failed to fetch onboarding progress" });
    }
  });

  // Estatísticas gerais de onboarding
  app.get("/api/onboarding/stats", authenticate, async (req, res) => {
    try {
      const stats = await storage.getOnboardingStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching onboarding stats:", error);
      res.status(500).json({ error: "Failed to fetch onboarding stats" });
    }
  });

  app.put("/api/onboarding/:id", authenticate, async (req, res) => {
    try {
      const updates = req.body;
      const stage = await storage.updateOnboardingStage(req.params.id, updates);
      res.json(stage);
    } catch (error) {
      res.status(400).json({ error: "Failed to update onboarding stage" });
    }
  });

  // Activity routes
  app.get("/api/activities", authenticate, async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (clientId) {
        const activities = await storage.getActivities(clientId);
        res.json(activities);
      } else {
        const activities = await storage.getRecentActivities(limit);
        res.json(activities);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Integration routes
  app.get("/api/integrations", authenticate, async (req, res) => {
    try {
      const integrations = await storage.getIntegrations();
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  // Visit routes
  app.get("/api/visits", authenticate, async (req, res) => {
    try {
      const visits = await storage.getVisits();
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  app.get("/api/clients/:id/visits", authenticate, async (req, res) => {
    try {
      const visits = await storage.getVisits(req.params.id);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client visits" });
    }
  });

  app.get("/api/clients/:id/appointments", authenticate, async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByClient(req.params.id);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client appointments" });
    }
  });

  app.post("/api/visits", authenticate, async (req, res) => {
    try {
      // Convert date string to Date object if necessary
      if (req.body.date && typeof req.body.date === 'string') {
        req.body.date = new Date(req.body.date);
      }
      
      const visitData = insertVisitSchema.parse(req.body);
      const visit = await storage.createVisit(visitData);
      res.status(201).json(visit);
    } catch (error) {
      console.error("Visit validation error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: "Invalid visit data", details: errorMessage });
    }
  });

  app.put("/api/visits/:id", authenticate, async (req, res) => {
    try {
      const updates = insertVisitSchema.partial().parse(req.body);
      const visit = await storage.updateVisit(req.params.id, updates);
      res.json(visit);
    } catch (error) {
      res.status(400).json({ error: "Failed to update visit" });
    }
  });

  app.delete("/api/visits/:id", authenticate, async (req, res) => {
    try {
      await storage.deleteVisit(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete visit" });
    }
  });

  // Dashboard relacionamento routes
  app.get("/api/relacionamento/metricas", authenticate, async (req, res) => {
    try {
      const clients = await storage.getClients();
      const appointments = await storage.getAppointments();
      const visits = await storage.getVisits();
      
      // Debug logs
      console.log("🔍 Debug Dashboard Metrics:");
      console.log("Total clients found:", clients.length);
      console.log("Clients data:", clients.map(c => ({ id: c.id, name: c.companyName, status: c.status })));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Calcular métricas
      const totalClientes = clients.length;
      const clientesAtivos = clients.filter((c: any) => c.status === 'active' || c.status === 'onboarding').length;
      
      const reunioesToday = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledStart);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      }).length;
      
      // Total de atas salvas
      const totalAtasSalvas = visits.length;
      
      res.json({
        resumo: {
          total_clientes: totalClientes,
          clientes_ativos: clientesAtivos,
          total_atas_salvas: totalAtasSalvas
        },
        hoje: {
          reunioes_hoje: reunioesToday
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/relacionamento/proximos-contatos", authenticate, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      const clients = await storage.getClients();
      
      const now = new Date();
      const upcomingAppointments = appointments
        .filter((apt: any) => new Date(apt.scheduledStart) > now && apt.status === 'scheduled')
        .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
        .slice(0, 10)
        .map((apt: any) => {
          const client = clients.find((c: any) => c.id === apt.clientId);
          return {
            id: apt.id,
            titulo: apt.title || `Reunião com ${client?.companyName || 'Cliente'}`,
            data_agendada: apt.scheduledStart,
            tipo: apt.type,
            cliente: client
          };
        });
      
      res.json(upcomingAppointments);
    } catch (error) {
      console.error("Error fetching upcoming contacts:", error);
      res.status(500).json({ error: "Failed to fetch upcoming contacts" });
    }
  });

  app.get("/api/relacionamento/agendamentos-atrasados", authenticate, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      const clients = await storage.getClients();
      
      const now = new Date();
      const overdueAppointments = appointments
        .filter((apt: any) => new Date(apt.scheduledStart) < now && apt.status === 'scheduled')
        .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
        .slice(0, 10)
        .map((apt: any) => {
          const client = clients.find((c: any) => c.id === apt.clientId);
          return {
            id: apt.id,
            titulo: apt.title || `Reunião com ${client?.companyName || 'Cliente'}`,
            data_agendada: apt.scheduledStart,
            tipo: apt.type,
            cliente: client
          };
        });
      
      res.json(overdueAppointments);
    } catch (error) {
      console.error("Error fetching overdue appointments:", error);
      res.status(500).json({ error: "Failed to fetch overdue appointments" });
    }
  });

  app.get("/api/relacionamento/visitas-recentes", authenticate, async (req, res) => {
    try {
      const visits = await storage.getVisits();
      const clients = await storage.getClients();
      
      const recentVisits = visits
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((visit: any) => {
          const client = clients.find((c: any) => c.id === visit.clientId);
          return {
            id: visit.id,
            data: visit.date,
            tipo_visita: visit.type,
            satisfacao: visit.satisfaction_rating || 0,
            cliente: {
              nome: client?.companyName || 'Cliente'
            }
          };
        });
      
      res.json(recentVisits);
    } catch (error) {
      console.error("Error fetching recent visits:", error);
      res.status(500).json({ error: "Failed to fetch recent visits" });
    }
  });

  // CNPJ lookup route
  app.get("/api/cnpj/:cnpj", authenticate, async (req, res) => {
    try {
      const cnpj = req.params.cnpj.replace(/\D/g, ''); // Remove non-digits
      
      if (cnpj.length !== 14) {
        return res.status(400).json({ error: "CNPJ deve ter 14 dígitos" });
      }

      const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
      const data = await response.json();
      
      if (data.status === 'ERROR') {
        return res.status(404).json({ error: "CNPJ não encontrado na Receita Federal" });
      }
      
      // Normalize data format
      const normalizedData = {
        nome: data.nome,
        cnpj: data.cnpj,
        email: data.email || '',
        telefone: data.telefone || '',
        situacao: data.situacao,
        atividade_principal: data.atividade_principal?.[0]?.text || '',
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
      };
      
      res.json(normalizedData);
    } catch (error) {
      console.error('Error fetching CNPJ data:', error);
      res.status(500).json({ error: "Erro ao consultar CNPJ na Receita Federal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
