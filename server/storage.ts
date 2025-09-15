import { type User, type InsertUser, type Client, type InsertClient, type OnboardingStage, type InsertOnboardingStage, type Appointment, type InsertAppointment, type Activity, type InsertActivity, type Integration, type InsertIntegration, type Visit, type InsertVisit, type ClientWithDetails, type AppointmentWithDetails, type ActivityWithDetails, type DashboardMetrics } from "@shared/schema";
import { randomUUID } from "crypto";

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
    const user: User = { ...insertUser, id, createdAt: new Date() };
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
        client.cnpj.toLowerCase().includes(searchLower) ||
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
      const lastActivity = clientActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const clientAppointments = Array.from(this.appointments.values()).filter(a => a.clientId === client.id && a.scheduledStart > new Date());
      const nextAppointment = clientAppointments.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())[0];

      clientsWithDetails.push({
        ...client,
        assignee,
        currentStage,
        lastActivity,
        nextAppointment,
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
    const lastActivity = clientActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const clientAppointments = Array.from(this.appointments.values()).filter(a => a.clientId === client.id && a.scheduledStart > new Date());
    const nextAppointment = clientAppointments.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())[0];

    return {
      ...client,
      assignee,
      currentStage,
      lastActivity,
      nextAppointment,
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
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(id, client);

    // Create initial onboarding stage
    await this.createOnboardingStage({
      clientId: id,
      stage: "initial_meeting",
      status: "pending",
    });

    // Create initial appointment (1 week from now)
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7);
    appointmentDate.setHours(14, 0, 0, 0); // 14:00

    const endDate = new Date(appointmentDate);
    endDate.setHours(15, 0, 0, 0); // 15:00

    await this.createAppointment({
      clientId: id,
      assigneeId: insertClient.assigneeId,
      title: `Reunião inicial - ${insertClient.companyName}`,
      description: "Reunião de onboarding inicial para apresentação da empresa e coleta de documentos",
      type: "meeting",
      scheduledStart: appointmentDate,
      scheduledEnd: endDate,
      status: "scheduled",
      location: null,
      meetingUrl: null,
      googleEventId: null,
    });

    // Create activity
    await this.createActivity({
      clientId: id,
      userId: insertClient.assigneeId,
      type: "client_created",
      description: `Cliente ${insertClient.companyName} adicionado ao sistema`,
    });

    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const client = this.clients.get(id);
    if (!client) throw new Error("Client not found");

    const updated: Client = {
      ...client,
      ...updates,
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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

export const storage = new MemStorage();
