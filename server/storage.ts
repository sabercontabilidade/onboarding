import { type User, type InsertUser, type Client, type InsertClient, type OnboardingStage, type InsertOnboardingStage, type Appointment, type InsertAppointment, type Activity, type InsertActivity, type Integration, type InsertIntegration, type Visit, type InsertVisit, type ClientWithDetails, type AppointmentWithDetails, type ActivityWithDetails, type DashboardMetrics, users, clients, onboardingStages, appointments, activities, integrations, visits } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Função para formatar CNPJ
function formatCnpj(cnpj: string | null): string | null {
  if (!cnpj) return null;
  
  // Remove caracteres não numéricos
  const cnpjNums = cnpj.replace(/\D/g, '');
  
  if (cnpjNums.length !== 14) return cnpj; // Retorna como está se não tiver 14 dígitos
  
  // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
  return `${cnpjNums.slice(0, 2)}.${cnpjNums.slice(2, 5)}.${cnpjNums.slice(5, 8)}/${cnpjNums.slice(8, 12)}-${cnpjNums.slice(12, 14)}`;
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Client methods
  getClients(): Promise<Client[]>;
  getClientsWithDetails(): Promise<ClientWithDetails[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientWithDetails(id: string): Promise<ClientWithDetails | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Onboarding methods
  getOnboardingStages(clientId: string): Promise<OnboardingStage[]>;
  createOnboardingStage(stage: InsertOnboardingStage): Promise<OnboardingStage>;
  updateOnboardingStage(id: string, updates: Partial<InsertOnboardingStage>): Promise<OnboardingStage>;

  // Appointment methods
  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  getAppointmentsWithDetails(): Promise<AppointmentWithDetails[]>;
  getUpcomingAppointments(limit?: number): Promise<AppointmentWithDetails[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;

  // Activity methods
  getActivities(clientId?: string): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<ActivityWithDetails[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Integration methods
  getIntegrations(): Promise<Integration[]>;
  getIntegration(name: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, updates: Partial<InsertIntegration>): Promise<Integration>;

  // Visit methods
  getVisits(clientId?: string): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, updates: Partial<InsertVisit>): Promise<Visit>;
  deleteVisit(id: string): Promise<void>;

  // Dashboard methods
  getDashboardMetrics(): Promise<DashboardMetrics>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private clients: Map<string, Client> = new Map();
  private onboardingStages: Map<string, OnboardingStage> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private activities: Map<string, Activity> = new Map();
  private integrations: Map<string, Integration> = new Map();
  private visits: Map<string, Visit> = new Map();

  constructor() {
    // Initialize with a default user
    const defaultUser: User = {
      id: "user-1",
      username: "admin",
      password: "admin123",
      name: "João Silva",
      email: "joao@saber.com.br",
      role: "contador",
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || "contador",
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClientsWithDetails(search?: string): Promise<ClientWithDetails[]> {
    let clients = Array.from(this.clients.values());

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      clients = clients.filter(client =>
        client.companyName.toLowerCase().includes(searchLower) ||
        (client.cnpj && client.cnpj.toLowerCase().includes(searchLower)) ||
        (client.contactName && client.contactName.toLowerCase().includes(searchLower)) ||
        (client.contactEmail && client.contactEmail.toLowerCase().includes(searchLower))
      );
    }

    const clientsWithDetails: ClientWithDetails[] = [];

    for (const client of clients) {
      const assignee = client.assigneeId ? this.users.get(client.assigneeId) : undefined;
      const stages = Array.from(this.onboardingStages.values()).filter(s => s.clientId === client.id);
      const currentStage = stages.find(s => s.status !== "completed");
      const clientActivities = Array.from(this.activities.values()).filter(a => a.clientId === client.id);
      const lastActivity = clientActivities
        .filter(a => a.createdAt)
        .sort((a, b) => (b.createdAt!.getTime() - a.createdAt!.getTime()))[0];
      const clientAppointments = Array.from(this.appointments.values()).filter(a => a.clientId === client.id && a.scheduledStart > new Date());
      const nextAppointment = clientAppointments.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())[0];

      // Calculate onboarding progress (only for clients in onboarding)
      let onboardingProgress = 0;
      if (client.status === 'onboarding' && stages.length > 0) {
        const completedStages = stages.filter(s => s.status === 'completed').length;
        onboardingProgress = Math.round((completedStages / stages.length) * 100);
      }

      clientsWithDetails.push({
        ...client,
        assignee,
        currentStage,
        lastActivity,
        nextAppointment,
        onboardingProgress,
      });
    }

    return clientsWithDetails;
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientWithDetails(id: string): Promise<ClientWithDetails | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const assignee = client.assigneeId ? this.users.get(client.assigneeId) : undefined;
    const stages = Array.from(this.onboardingStages.values()).filter(s => s.clientId === client.id);
    const currentStage = stages.find(s => s.status !== "completed");
    const clientActivities = Array.from(this.activities.values()).filter(a => a.clientId === client.id);
    const lastActivity = clientActivities
      .filter(a => a.createdAt)
      .sort((a, b) => (b.createdAt!.getTime() - a.createdAt!.getTime()))[0];
    const clientAppointments = Array.from(this.appointments.values()).filter(a => a.clientId === client.id && a.scheduledStart > new Date());
    const nextAppointment = clientAppointments.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())[0];

    // Calculate onboarding progress (only for clients in onboarding)
    let onboardingProgress = 0;
    if (client.status === 'onboarding' && stages.length > 0) {
      const completedStages = stages.filter(s => s.status === 'completed').length;
      onboardingProgress = Math.round((completedStages / stages.length) * 100);
    }

    return {
      ...client,
      assignee,
      currentStage,
      lastActivity,
      nextAppointment,
      onboardingProgress,
    };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    // Verificar se já existe cliente com o mesmo CNPJ (normalizado)
    if (insertClient.cnpj) {
      const normalizedNewCnpj = insertClient.cnpj.replace(/\D/g, '');
      const existingClient = Array.from(this.clients.values()).find(
        client => client.cnpj && client.cnpj.replace(/\D/g, '') === normalizedNewCnpj
      );
      if (existingClient) {
        const error = new Error(`Cliente com CNPJ ${insertClient.cnpj} já está cadastrado`);
        (error as any).code = 'DUPLICATE_CNPJ';
        throw error;
      }
    }

    const id = randomUUID();
    const client: Client = {
      ...insertClient,
      cnpj: formatCnpj(insertClient.cnpj || null), // Formatar CNPJ antes de salvar
      status: insertClient.status || "pending",
      sector: insertClient.sector || null,
      assigneeId: insertClient.assigneeId || null,
      notes: insertClient.notes || null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(id, client);

    // Create activity for client creation (but no onboarding stages)
    await this.createActivity({
      clientId: id,
      userId: insertClient.assigneeId,
      type: "client_created",
      description: `Cliente ${insertClient.companyName} adicionado ao sistema`,
    });

    return client;
  }

  async startOnboarding(clientId: string, assigneeId?: string): Promise<void> {
    // Verificar se cliente existe
    const client = this.clients.get(clientId);
    if (!client) throw new Error("Cliente não encontrado");
    
    // Verificar se o cliente já tem status 'onboarding'
    if (client.status === 'onboarding') {
      throw new Error("Onboarding já foi iniciado para este cliente");
    }

    // Atualizar status do cliente para 'onboarding'
    await this.updateClient(clientId, { status: 'onboarding' });

    // Criar etapa inicial de onboarding
    await this.createOnboardingStage({
      clientId: clientId,
      stage: "initial_meeting",
      status: "pending",
    });

    // Criar agendamento inicial (1 semana a partir de hoje)
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7);
    appointmentDate.setHours(14, 0, 0, 0); // 14:00

    const endDate = new Date(appointmentDate);
    endDate.setHours(15, 0, 0, 0); // 15:00

    await this.createAppointment({
      clientId: clientId,
      assigneeId: assigneeId || client.assigneeId,
      title: `Reunião inicial - ${client.companyName}`,
      description: "Reunião de onboarding inicial para apresentação da empresa e coleta de documentos",
      type: "meeting",
      scheduledStart: appointmentDate,
      scheduledEnd: endDate,
      status: "scheduled",
      location: null,
      meetingUrl: null,
      googleEventId: null,
    });

    // Criar atividade
    await this.createActivity({
      clientId: clientId,
      userId: assigneeId || client.assigneeId,
      type: "onboarding_started",
      description: `Processo de onboarding iniciado para ${client.companyName}`,
    });
  }

  async resetOnboarding(clientId: string): Promise<void> {
    // Limpar todas as etapas de onboarding para este cliente
    Array.from(this.onboardingStages.entries()).forEach(([key, stage]) => {
      if (stage.clientId === clientId) {
        this.onboardingStages.delete(key);
      }
    });
    
    // Voltar status do cliente para 'pending'
    await this.updateClient(clientId, { status: 'pending' });
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const client = this.clients.get(id);
    if (!client) throw new Error("Client not found");

    const updated: Client = {
      ...client,
      ...updates,
      cnpj: updates.cnpj !== undefined ? formatCnpj(updates.cnpj) : client.cnpj, // Formatar CNPJ se foi atualizado
      updatedAt: new Date(),
    };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    this.clients.delete(id);
    // Clean up related data
    Array.from(this.onboardingStages.entries()).forEach(([key, stage]) => {
      if (stage.clientId === id) this.onboardingStages.delete(key);
    });
    Array.from(this.appointments.entries()).forEach(([key, appointment]) => {
      if (appointment.clientId === id) this.appointments.delete(key);
    });
    Array.from(this.activities.entries()).forEach(([key, activity]) => {
      if (activity.clientId === id) this.activities.delete(key);
    });
  }

  async getOnboardingStages(clientId: string): Promise<OnboardingStage[]> {
    return Array.from(this.onboardingStages.values()).filter(s => s.clientId === clientId);
  }

  async createOnboardingStage(insertStage: InsertOnboardingStage): Promise<OnboardingStage> {
    const id = randomUUID();
    const stage: OnboardingStage = {
      ...insertStage,
      status: insertStage.status || "pending",
      notes: insertStage.notes || null,
      scheduledDate: insertStage.scheduledDate || null,
      completedDate: insertStage.completedDate || null,
      id,
      createdAt: new Date(),
    };
    this.onboardingStages.set(id, stage);
    return stage;
  }

  async updateOnboardingStage(id: string, updates: Partial<InsertOnboardingStage>): Promise<OnboardingStage> {
    const stage = this.onboardingStages.get(id);
    if (!stage) throw new Error("Onboarding stage not found");

    const updated: OnboardingStage = { ...stage, ...updates };
    this.onboardingStages.set(id, updated);
    return updated;
  }

  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(a => a.clientId === clientId);
  }

  async getAppointmentsWithDetails(): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointments.values());
    return appointments.map(appointment => {
      const client = this.clients.get(appointment.clientId)!;
      const assignee = appointment.assigneeId ? this.users.get(appointment.assigneeId) : undefined;
      return { ...appointment, client, assignee };
    });
  }

  async getUpcomingAppointments(limit = 10): Promise<AppointmentWithDetails[]> {
    const appointments = await this.getAppointmentsWithDetails();
    return appointments
      .filter(a => a.scheduledStart > new Date())
      .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())
      .slice(0, limit);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = {
      ...insertAppointment,
      status: insertAppointment.status || "scheduled",
      assigneeId: insertAppointment.assigneeId || null,
      description: insertAppointment.description || null,
      location: insertAppointment.location || null,
      meetingUrl: insertAppointment.meetingUrl || null,
      googleEventId: insertAppointment.googleEventId || null,
      id,
      createdAt: new Date(),
    };
    this.appointments.set(id, appointment);

    // Create activity
    const client = this.clients.get(insertAppointment.clientId);
    if (client) {
      await this.createActivity({
        clientId: insertAppointment.clientId,
        userId: insertAppointment.assigneeId,
        type: "meeting_scheduled",
        description: `Reunião agendada: ${insertAppointment.title} para ${client.companyName}`,
      });
    }

    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    const appointment = this.appointments.get(id);
    if (!appointment) throw new Error("Appointment not found");

    const updated: Appointment = { ...appointment, ...updates };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: string): Promise<void> {
    this.appointments.delete(id);
  }

  async getActivities(clientId?: string): Promise<Activity[]> {
    const activities = Array.from(this.activities.values());
    return clientId ? activities.filter(a => a.clientId === clientId) : activities;
  }

  async getRecentActivities(limit = 10): Promise<ActivityWithDetails[]> {
    const activities = Array.from(this.activities.values())
      .filter(a => a.createdAt)
      .sort((a, b) => (b.createdAt!.getTime() - a.createdAt!.getTime()))
      .slice(0, limit);

    return activities.map(activity => {
      const client = activity.clientId ? this.clients.get(activity.clientId) : undefined;
      const user = activity.userId ? this.users.get(activity.userId) : undefined;
      return { ...activity, client, user };
    });
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = {
      ...insertActivity,
      clientId: insertActivity.clientId || null,
      userId: insertActivity.userId || null,
      metadata: insertActivity.metadata || null,
      id,
      createdAt: new Date(),
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getIntegrations(): Promise<Integration[]> {
    return Array.from(this.integrations.values());
  }

  async getIntegration(name: string): Promise<Integration | undefined> {
    return Array.from(this.integrations.values()).find(i => i.name === name);
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const id = randomUUID();
    const integration: Integration = {
      ...insertIntegration,
      status: insertIntegration.status || "disconnected",
      credentials: insertIntegration.credentials || null,
      lastSync: insertIntegration.lastSync || null,
      id,
      createdAt: new Date(),
    };
    this.integrations.set(id, integration);
    return integration;
  }

  async updateIntegration(id: string, updates: Partial<InsertIntegration>): Promise<Integration> {
    const integration = this.integrations.get(id);
    if (!integration) throw new Error("Integration not found");

    const updated: Integration = { ...integration, ...updates };
    this.integrations.set(id, updated);
    return updated;
  }

  async getVisits(clientId?: string): Promise<Visit[]> {
    const visits = Array.from(this.visits.values());
    return clientId ? visits.filter(v => v.clientId === clientId) : visits;
  }

  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const id = randomUUID();
    const visit: Visit = {
      ...insertVisit,
      type: insertVisit.type || "technical_visit",
      status: insertVisit.status || "completed",
      location: insertVisit.location || null,
      decisions: insertVisit.decisions || null,
      pending_actions: insertVisit.pending_actions || null,
      satisfaction_rating: insertVisit.satisfaction_rating || null,
      attachments: insertVisit.attachments || null,
      notes: insertVisit.notes || null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.visits.set(id, visit);

    // Create activity
    const client = this.clients.get(insertVisit.clientId);
    if (client) {
      await this.createActivity({
        clientId: insertVisit.clientId,
        userId: "user-1",
        type: "visit_completed",
        description: `ATA de visita registrada para ${client.companyName}`,
      });
    }

    return visit;
  }

  async updateVisit(id: string, updates: Partial<InsertVisit>): Promise<Visit> {
    const visit = this.visits.get(id);
    if (!visit) throw new Error("Visit not found");

    const updated: Visit = { ...visit, ...updates, updatedAt: new Date() };
    this.visits.set(id, updated);
    return updated;
  }

  async deleteVisit(id: string): Promise<void> {
    this.visits.delete(id);
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const clients = await this.getClientsWithDetails();
    const upcomingAppointments = await this.getUpcomingAppointments(5);
    const recentActivities = await this.getRecentActivities(5);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeetings = upcomingAppointments.filter(
      a => a.scheduledStart >= today && a.scheduledStart < tomorrow
    ).length;

    const scheduledVisits = upcomingAppointments.filter(
      a => a.type === "visit"
    ).length;

    return {
      activeClients: clients.filter(c => c.status === "active").length,
      onboardingClients: clients.filter(c => c.status === "onboarding").length,
      todayMeetings,
      scheduledVisits,
      onboardingClientsList: clients.filter(c => c.status === "onboarding").slice(0, 3),
      upcomingAppointments: upcomingAppointments.slice(0, 3),
      recentActivities: recentActivities.slice(0, 4),
    };
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientsWithDetails(search?: string): Promise<ClientWithDetails[]> {
    const clientsData = await db.select().from(clients).orderBy(desc(clients.createdAt));
    const clientsWithDetails: ClientWithDetails[] = [];

    for (const client of clientsData) {
      // Get assignee
      const assignee = client.assigneeId
        ? (await db.select().from(users).where(eq(users.id, client.assigneeId)))[0]
        : undefined;

      // Get current stage
      const stages = await db.select().from(onboardingStages).where(eq(onboardingStages.clientId, client.id));
      const currentStage = stages.find(s => s.status !== "completed");

      // Get last activity
      const lastActivityList = await db.select().from(activities)
        .where(eq(activities.clientId, client.id))
        .orderBy(desc(activities.createdAt))
        .limit(1);
      const lastActivity = lastActivityList[0];

      // Get next appointment
      const nextAppointmentList = await db.select().from(appointments)
        .where(and(eq(appointments.clientId, client.id)))
        .orderBy(asc(appointments.scheduledStart))
        .limit(1);
      const nextAppointment = nextAppointmentList[0];

      // Get onboarding progress (only for clients in onboarding)
      let onboardingProgress = 0;
      if (client.status === 'onboarding') {
        const progress = await this.getOnboardingProgress(client.id);
        onboardingProgress = progress.progress;
      }

      clientsWithDetails.push({
        ...client,
        assignee,
        currentStage,
        lastActivity,
        nextAppointment,
        onboardingProgress,
      });
    }

    return clientsWithDetails;
  }

  async getClientWithDetails(id: string): Promise<ClientWithDetails | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;

    const assignee = client.assigneeId
      ? (await db.select().from(users).where(eq(users.id, client.assigneeId)))[0]
      : undefined;

    const stages = await db.select().from(onboardingStages).where(eq(onboardingStages.clientId, client.id));
    const currentStage = stages.find(s => s.status !== "completed");

    const clientActivities = await db.select().from(activities)
      .where(eq(activities.clientId, client.id))
      .orderBy(desc(activities.createdAt));
    const lastActivity = clientActivities[0];

    const clientAppointments = await db.select().from(appointments)
      .where(and(eq(appointments.clientId, client.id)))
      .orderBy(asc(appointments.scheduledStart));
    const nextAppointment = clientAppointments[0];

    // Get onboarding progress (only for clients in onboarding)
    let onboardingProgress = 0;
    if (client.status === 'onboarding') {
      const progress = await this.getOnboardingProgress(client.id);
      onboardingProgress = progress.progress;
    }

    return {
      ...client,
      assignee,
      currentStage,
      lastActivity,
      nextAppointment,
      onboardingProgress,
    };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    // Verificar se já existe cliente com o mesmo CNPJ (normalizado)
    if (insertClient.cnpj) {
      const normalizedNewCnpj = insertClient.cnpj.replace(/\D/g, '');
      const existingClients = await db.select().from(clients);
      const existingClient = existingClients.find(
        client => client.cnpj && client.cnpj.replace(/\D/g, '') === normalizedNewCnpj
      );
      if (existingClient) {
        const error = new Error(`Cliente com CNPJ ${insertClient.cnpj} já está cadastrado`);
        (error as any).code = 'DUPLICATE_CNPJ';
        throw error;
      }
    }

    const clientData = {
      ...insertClient,
      cnpj: formatCnpj(insertClient.cnpj || null), // Formatar CNPJ antes de salvar
    };

    const [client] = await db.insert(clients).values(clientData).returning();

    // Create activity for client creation
    await this.createActivity({
      clientId: client.id,
      userId: insertClient.assigneeId,
      type: "client_created",
      description: `Cliente ${insertClient.companyName} adicionado ao sistema`,
    });

    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const updateData = {
      ...updates,
      cnpj: updates.cnpj !== undefined ? formatCnpj(updates.cnpj) : undefined,
    };
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    const [client] = await db.update(clients)
      .set(cleanData)
      .where(eq(clients.id, id))
      .returning();
    
    if (!client) throw new Error("Client not found");
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Continue with other methods... (implementar nos próximos edits)
  // Onboarding methods
  async getOnboardingStages(clientId: string): Promise<OnboardingStage[]> {
    return await db.select().from(onboardingStages)
      .where(eq(onboardingStages.clientId, clientId))
      .orderBy(asc(onboardingStages.createdAt));
  }

  async createOnboardingStage(insertStage: InsertOnboardingStage): Promise<OnboardingStage> {
    const [stage] = await db.insert(onboardingStages).values(insertStage).returning();
    return stage;
  }

  async updateOnboardingStage(id: string, updates: Partial<InsertOnboardingStage>): Promise<OnboardingStage> {
    const [stage] = await db.update(onboardingStages)
      .set(updates)
      .where(eq(onboardingStages.id, id))
      .returning();
    
    if (!stage) throw new Error("Onboarding stage not found");
    return stage;
  }

  // Appointment methods
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsWithDetails(): Promise<AppointmentWithDetails[]> {
    const appointmentsData = await db.select().from(appointments).orderBy(asc(appointments.scheduledStart));
    const appointmentsWithDetails: AppointmentWithDetails[] = [];

    for (const appointment of appointmentsData) {
      const client = appointment.clientId 
        ? (await db.select().from(clients).where(eq(clients.id, appointment.clientId)))[0]
        : undefined;
      
      const assignee = appointment.assigneeId 
        ? (await db.select().from(users).where(eq(users.id, appointment.assigneeId)))[0]
        : undefined;

      if (client) {
        appointmentsWithDetails.push({
          ...appointment,
          client,
          assignee,
        });
      }
    }

    return appointmentsWithDetails;
  }

  async getUpcomingAppointments(limit?: number): Promise<AppointmentWithDetails[]> {
    const now = new Date();
    const appointmentsData = await db.select().from(appointments)
      .orderBy(asc(appointments.scheduledStart))
      .limit(limit || 10);
    
    const upcomingAppointments = appointmentsData.filter(apt => apt.scheduledStart > now);
    const appointmentsWithDetails: AppointmentWithDetails[] = [];

    for (const appointment of upcomingAppointments) {
      const client = appointment.clientId 
        ? (await db.select().from(clients).where(eq(clients.id, appointment.clientId)))[0]
        : undefined;
      
      const assignee = appointment.assigneeId 
        ? (await db.select().from(users).where(eq(users.id, appointment.assigneeId)))[0]
        : undefined;

      if (client) {
        appointmentsWithDetails.push({
          ...appointment,
          client,
          assignee,
        });
      }
    }

    return appointmentsWithDetails.slice(0, limit || 10);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    const [appointment] = await db.update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    
    if (!appointment) throw new Error("Appointment not found");
    return appointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Activity methods
  async getActivities(clientId?: string): Promise<Activity[]> {
    if (clientId) {
      return await db.select().from(activities)
        .where(eq(activities.clientId, clientId))
        .orderBy(desc(activities.createdAt));
    }
    return await db.select().from(activities).orderBy(desc(activities.createdAt));
  }

  async getRecentActivities(limit?: number): Promise<ActivityWithDetails[]> {
    const activitiesData = await db.select().from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit || 10);
    
    const activitiesWithDetails: ActivityWithDetails[] = [];

    for (const activity of activitiesData) {
      const client = activity.clientId 
        ? (await db.select().from(clients).where(eq(clients.id, activity.clientId)))[0]
        : undefined;
      
      const user = activity.userId 
        ? (await db.select().from(users).where(eq(users.id, activity.userId)))[0]
        : undefined;

      activitiesWithDetails.push({
        ...activity,
        client,
        user,
      });
    }

    return activitiesWithDetails;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Integration methods
  async getIntegrations(): Promise<Integration[]> {
    return await db.select().from(integrations).orderBy(desc(integrations.createdAt));
  }

  async getIntegration(name: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.name, name));
    return integration || undefined;
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const [integration] = await db.insert(integrations).values(insertIntegration).returning();
    return integration;
  }

  async updateIntegration(id: string, updates: Partial<InsertIntegration>): Promise<Integration> {
    const [integration] = await db.update(integrations)
      .set(updates)
      .where(eq(integrations.id, id))
      .returning();
    
    if (!integration) throw new Error("Integration not found");
    return integration;
  }

  // Visit methods
  async getVisits(clientId?: string): Promise<Visit[]> {
    if (clientId) {
      return await db.select().from(visits)
        .where(eq(visits.clientId, clientId))
        .orderBy(desc(visits.createdAt));
    }
    return await db.select().from(visits).orderBy(desc(visits.createdAt));
  }

  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const [visit] = await db.insert(visits).values(insertVisit).returning();
    return visit;
  }

  async updateVisit(id: string, updates: Partial<InsertVisit>): Promise<Visit> {
    const [visit] = await db.update(visits)
      .set(updates)
      .where(eq(visits.id, id))
      .returning();
    
    if (!visit) throw new Error("Visit not found");
    return visit;
  }

  async deleteVisit(id: string): Promise<void> {
    await db.delete(visits).where(eq(visits.id, id));
  }

  // Dashboard methods
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const clientsData = await this.getClientsWithDetails();
    const upcomingAppointments = await this.getUpcomingAppointments(5);
    const recentActivities = await this.getRecentActivities(5);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeetings = upcomingAppointments.filter(
      a => a.scheduledStart >= today && a.scheduledStart < tomorrow
    ).length;

    const scheduledVisits = upcomingAppointments.filter(
      a => a.type === "visit"
    ).length;

    return {
      activeClients: clientsData.filter(c => c.status === "active").length,
      onboardingClients: clientsData.filter(c => c.status === "onboarding").length,
      todayMeetings,
      scheduledVisits,
      onboardingClientsList: clientsData.filter(c => c.status === "onboarding").slice(0, 3),
      upcomingAppointments: upcomingAppointments.slice(0, 3),
      recentActivities: recentActivities.slice(0, 4),
    };
  }

  // Método para iniciar onboarding
  async startOnboarding(clientId: string, assigneeId?: string): Promise<void> {
    // Verificar se cliente existe
    const client = await this.getClient(clientId);
    if (!client) throw new Error("Cliente não encontrado");

    // Verificar se o cliente já tem status 'onboarding'
    if (client.status === 'onboarding') {
      throw new Error("Onboarding já foi iniciado para este cliente");
    }

    // Atualizar status do cliente para 'onboarding'
    await this.updateClient(clientId, { status: 'onboarding' });

    // Criar etapas padrão de onboarding (8 etapas)
    await this.createDefaultOnboardingStages(clientId, assigneeId);

    // Criar agendamento inicial (1 semana a partir de hoje)
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7);
    const appointmentEndDate = new Date(appointmentDate);
    appointmentEndDate.setHours(appointmentEndDate.getHours() + 1);

    await this.createAppointment({
      clientId: clientId,
      assigneeId: assigneeId || client.assigneeId,
      title: `Reunião Inicial - ${client.companyName}`,
      description: 'Reunião inicial do processo de onboarding',
      type: 'meeting',
      scheduledStart: appointmentDate,
      scheduledEnd: appointmentEndDate,
      status: 'scheduled',
      location: null,
      meetingUrl: null,
      googleEventId: null,
    });

    // Criar agendamentos automáticos de follow-up (D+15, D+50, D+80, D+100, D+180)
    try {
      const { createAutomaticAppointments } = await import('./services/appointments/auto-schedule.js');
      const responsibleId = assigneeId || client.assigneeId;
      if (responsibleId) {
        await createAutomaticAppointments(clientId, responsibleId, new Date());
      }
    } catch (error) {
      console.error('Erro ao criar agendamentos automáticos:', error);
      // Não bloquear o onboarding se os agendamentos automáticos falharem
    }

    // Criar atividade
    await this.createActivity({
      clientId: clientId,
      userId: assigneeId || client.assigneeId,
      type: "onboarding_started",
      description: `Processo de onboarding iniciado para ${client.companyName}`,
    });
  }

  async resetOnboarding(clientId: string): Promise<void> {
    // Limpar todas as etapas de onboarding para este cliente
    await db.delete(onboardingStages).where(eq(onboardingStages.clientId, clientId));

    // Voltar status do cliente para 'pending'
    await this.updateClient(clientId, { status: 'pending' });
  }

  // Criar etapas padrão de onboarding
  async createDefaultOnboardingStages(clientId: string, assigneeId?: string): Promise<void> {
    const defaultStages = [
      { stage: 'plano_sucesso', funcaoResponsavel: 'onboarding' },
      { stage: 'inicial', funcaoResponsavel: 'onboarding' },
      { stage: 'd5', funcaoResponsavel: 'onboarding' },
      { stage: 'd15', funcaoResponsavel: 'onboarding' },
      { stage: 'd50', funcaoResponsavel: 'onboarding' },
      { stage: 'd80', funcaoResponsavel: 'onboarding' },
      { stage: 'd100', funcaoResponsavel: 'onboarding' },
      { stage: 'd180', funcaoResponsavel: 'onboarding' },
    ];

    for (const stageInfo of defaultStages) {
      await db.insert(onboardingStages).values({
        clientId,
        stage: stageInfo.stage,
        status: 'pending',
        funcaoResponsavel: stageInfo.funcaoResponsavel as any,
        assignedTo: assigneeId || null,
      });
    }
  }

  // Buscar progresso de onboarding de um cliente
  async getOnboardingProgress(clientId: string) {
    const stages = await this.getOnboardingStages(clientId);
    const totalStages = stages.length;
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

    return {
      clientId,
      totalStages,
      completedStages,
      progress: Math.round(progress),
      stages,
    };
  }

  // Buscar estatísticas de onboarding
  async getOnboardingStats() {
    const allClients = await this.getClients();
    const onboardingClients = allClients.filter(c => c.status === 'onboarding');

    let inProgress = 0;
    let completed = 0;

    for (const client of onboardingClients) {
      const progress = await this.getOnboardingProgress(client.id);
      if (progress.progress === 100) {
        completed++;
      } else if (progress.progress > 0) {
        inProgress++;
      }
    }

    return {
      total: onboardingClients.length,
      inProgress,
      completed,
      pending: onboardingClients.length - inProgress - completed,
    };
  }

  // Buscar contadores do dashboard
  async getDashboardCounts() {
    const allClients = await this.getClients();
    const allAppointments = await this.getAppointments();
    const allVisits = await this.getVisits();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const onboardingClients = allClients.filter(c => c.status === 'onboarding');
    let onboardingInProgress = 0;
    let onboardingCompleted = 0;

    for (const client of onboardingClients) {
      const progress = await this.getOnboardingProgress(client.id);
      if (progress.progress === 100) {
        onboardingCompleted++;
      } else if (progress.progress > 0) {
        onboardingInProgress++;
      }
    }

    const appointmentsToday = allAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledStart);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    }).length;

    const overdueAppointments = allAppointments.filter(apt => {
      return new Date(apt.scheduledStart) < new Date() && apt.status === 'scheduled';
    }).length;

    return {
      totalClients: allClients.length,
      activeClients: allClients.filter(c => c.status === 'active' || c.status === 'onboarding').length,
      onboardingTotal: onboardingClients.length,
      onboardingInProgress,
      onboardingCompleted,
      appointmentsToday,
      overdueAppointments,
      totalVisits: allVisits.length,
    };
  }

  // Estatísticas de satisfação (baseado em ratings de visitas)
  async getSatisfactionStats() {
    const allVisits = await this.getVisits();
    const visitsWithRating = allVisits.filter(v => v.satisfaction_rating !== null);

    if (visitsWithRating.length === 0) {
      return {
        averageRating: 0,
        totalResponses: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
        recentFeedback: [],
      };
    }

    // Calcular média
    const sum = visitsWithRating.reduce((acc, v) => acc + (v.satisfaction_rating || 0), 0);
    const averageRating = sum / visitsWithRating.length;

    // Calcular distribuição
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const visit of visitsWithRating) {
      const rating = visit.satisfaction_rating as number;
      distribution[rating] = (distribution[rating] || 0) + 1;
    }

    // Últimos feedbacks
    const recentFeedback = await Promise.all(
      visitsWithRating
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(async (visit) => {
          const client = await this.getClient(visit.clientId);
          return {
            clientName: client?.companyName || 'N/A',
            rating: visit.satisfaction_rating,
            date: visit.date,
            notes: visit.notes,
          };
        })
    );

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Uma casa decimal
      totalResponses: visitsWithRating.length,
      distribution,
      recentFeedback,
    };
  }

  // Clientes sem contato recente
  async getClientsWithoutRecentContact(days: number = 30) {
    const allClients = await this.getClients();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = [];

    for (const client of allClients) {
      // Ignorar clientes inativos ou pendentes
      if (client.status === 'inactive' || client.status === 'pending') continue;

      // Buscar última atividade
      const clientActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.clientId, client.id))
        .orderBy(desc(activities.createdAt))
        .limit(1);

      // Buscar último agendamento
      const clientAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.clientId, client.id),
            eq(appointments.status, 'completed')
          )
        )
        .orderBy(desc(appointments.scheduledStart))
        .limit(1);

      // Buscar última visita
      const clientVisits = await db
        .select()
        .from(visits)
        .where(
          and(
            eq(visits.clientId, client.id),
            eq(visits.status, 'completed')
          )
        )
        .orderBy(desc(visits.date))
        .limit(1);

      // Determinar último contato
      const dates = [
        clientActivities[0]?.createdAt,
        clientAppointments[0]?.scheduledStart,
        clientVisits[0]?.date,
      ].filter(Boolean) as Date[];

      const lastContact = dates.length > 0
        ? new Date(Math.max(...dates.map(d => new Date(d).getTime())))
        : null;

      // Se não há contato ou é anterior à data de corte
      if (!lastContact || lastContact < cutoffDate) {
        const daysSinceContact = lastContact
          ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        results.push({
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          status: client.status,
          lastContact: lastContact?.toISOString() || null,
          daysSinceContact,
        });
      }
    }

    // Ordenar por dias sem contato (mais antigo primeiro)
    results.sort((a, b) => {
      if (a.daysSinceContact === null) return -1;
      if (b.daysSinceContact === null) return 1;
      return b.daysSinceContact - a.daysSinceContact;
    });

    return {
      clients: results,
      total: results.length,
      daysThreshold: days,
    };
  }
}

// Initialize default user on app start
async function initializeDefaultUser() {
  try {
    const rootEmail = process.env.ROOT_EMAIL || "desenvolvimento@sabercontabil.com.br";
    const existingUser = await db.select().from(users).where(eq(users.email, rootEmail)).limit(1);

    if (existingUser.length === 0) {
      // Importar bcrypt para hash de senha
      const bcrypt = await import('bcrypt');
      const senhaHash = await bcrypt.hash(process.env.ROOT_SENHA || "Saberdev@2025", 10);

      await db.insert(users).values({
        id: process.env.ROOT_ID || undefined,
        nome: process.env.ROOT_NAME || "Root",
        email: rootEmail,
        senhaHash: senhaHash,
        funcao: (process.env.ROOT_FUNCAO as any) || "admin",
        nivelPermissao: "administrador",
        fotoUrl: process.env.ROOT_FOTO || null,
        ativo: true,
        bloqueado: false,
      });
      console.log("✅ Default root user created");
    }
  } catch (error) {
    console.log("❌ Error creating default user:", error);
  }
}

// Call initialization
initializeDefaultUser();

export const storage = new DatabaseStorage();
