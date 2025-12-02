import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, boolean, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// ENUMS
// ========================================

export const funcaoEnum = pgEnum("funcao", ["comercial", "integracao", "onboarding", "admin"]);
export const nivelPermissaoEnum = pgEnum("nivel_permissao", ["administrador", "operador", "analista"]);
export const statusClienteEnum = pgEnum("status_cliente", ["pending", "onboarding", "active", "inactive"]);
export const statusOnboardingEnum = pgEnum("status_onboarding", ["pending", "in_progress", "completed"]);
export const statusAgendamentoEnum = pgEnum("status_agendamento", ["scheduled", "completed", "cancelled", "rescheduled"]);
export const tipoAgendamentoEnum = pgEnum("tipo_agendamento", ["meeting", "visit", "call", "followup"]);
export const statusVisitaEnum = pgEnum("status_visita", ["scheduled", "completed", "cancelled"]);
export const tipoVisitaEnum = pgEnum("tipo_visita", ["technical_visit", "maintenance", "training", "follow_up"]);
export const statusAtribuicaoEnum = pgEnum("status_atribuicao", ["pending", "signed", "completed", "rejected"]);

// ========================================
// SETORES (Sistema de Setores)
// ========================================

export const setores = pgTable("setores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  codigo: text("codigo").notNull().unique(),
  email: text("email").unique(),
  descricao: text("descricao"),
  cor: text("cor"), // Hex color para UI
  icone: text("icone"), // Nome do ícone Lucide
  ativo: boolean("ativo").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // Setor Sistema não pode ser deletado
  ordem: integer("ordem").default(0).notNull(), // Ordem de exibição
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// PERFIS (Níveis de Acesso por Setor)
// ========================================

export const perfis = pgTable("perfis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  codigo: text("codigo").notNull().unique(),
  descricao: text("descricao"),
  nivelHierarquico: integer("nivel_hierarquico").notNull(), // 0=Root, 1=Gestor, 2=Operador, 3=Analista
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// USERS (Sistema de Autenticação Completo)
// ========================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  token: text("token"),
  refreshToken: text("refresh_token"),
  funcao: funcaoEnum("funcao").default("onboarding"),
  nivelPermissao: nivelPermissaoEnum("nivel_permissao").default("operador"),
  fotoUrl: text("foto_url"),
  telefone: text("telefone"),
  dataNascimento: timestamp("data_nascimento"),
  ativo: boolean("ativo").default(true).notNull(),
  bloqueado: boolean("bloqueado").default(false).notNull(),
  googleConnected: boolean("google_connected").default(false).notNull(),
  primeiroLogin: boolean("primeiro_login").default(true).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorBackupCodes: json("two_factor_backup_codes").$type<string[]>(),
  ultimoLogin: timestamp("ultimo_login"),
  tentativasLogin: integer("tentativas_login").default(0).notNull(),
  permissoes: json("permissoes").$type<{
    clientes?: { criar?: boolean; editar?: boolean; deletar?: boolean; visualizar?: boolean };
    onboarding?: { iniciar?: boolean; editar?: boolean; visualizar?: boolean };
    agendamentos?: { criar?: boolean; editar?: boolean; deletar?: boolean; visualizar?: boolean };
    visitas?: { criar?: boolean; editar?: boolean; deletar?: boolean; visualizar?: boolean };
    usuarios?: { criar?: boolean; editar?: boolean; deletar?: boolean; visualizar?: boolean };
    relatorios?: { exportar?: boolean; visualizar?: boolean };
  }>(),
  preferencias: json("preferencias").$type<{
    tema?: "light" | "dark" | "system";
    idioma?: string;
    notificacoes?: boolean;
    emailNotificacoes?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// USER_SETORES (Relacionamento N:N entre Usuários e Setores)
// ========================================

export const userSetores = pgTable("user_setores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  setorId: varchar("setor_id").notNull().references(() => setores.id, { onDelete: "cascade" }),
  perfilId: varchar("perfil_id").notNull().references(() => perfis.id, { onDelete: "restrict" }),
  principal: boolean("principal").default(false).notNull(), // Setor principal do usuário
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserSetor: unique().on(table.userId, table.setorId), // Usuário só pode ter 1 perfil por setor
}));

// ========================================
// PERMISSAO CATALOGO (Catálogo de Permissões)
// ========================================

export const permissaoCatalogo = pgTable("permissao_catalogo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: text("codigo").notNull().unique(), // "onboarding:stages:create"
  nome: text("nome").notNull(), // "Criar Etapas de Onboarding"
  descricao: text("descricao"),
  modulo: text("modulo").notNull(), // "onboarding", "clientes", "usuarios"
  categoria: text("categoria"), // "stages", "appointments", "visits"
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// PERFIL SETOR PERMISSAO (Vínculo Perfil-Setor-Permissão)
// ========================================

export const perfilSetorPermissao = pgTable("perfil_setor_permissao", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  perfilId: varchar("perfil_id").notNull().references(() => perfis.id, { onDelete: "cascade" }),
  setorId: varchar("setor_id").references(() => setores.id, { onDelete: "cascade" }), // NULL = global
  permissaoId: varchar("permissao_id").notNull().references(() => permissaoCatalogo.id, { onDelete: "cascade" }),
  escopo: text("escopo").default("setor").notNull(), // "global", "setor", "proprio"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniquePerfilSetorPermissao: unique().on(table.perfilId, table.setorId, table.permissaoId),
}));

// ========================================
// AUDIT LOGS (Sistema de Auditoria)
// ========================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").references(() => users.id, { onDelete: "set null" }),
  setorId: varchar("setor_id").references(() => setores.id, { onDelete: "set null" }), // Contexto do setor
  acao: text("acao").notNull(), // create, update, delete, login, logout, etc.
  entidade: text("entidade"), // users, clients, appointments, etc.
  entidadeId: varchar("entidade_id"),
  descricao: text("descricao").notNull(),
  dadosAnteriores: json("dados_anteriores").$type<Record<string, any>>(),
  dadosNovos: json("dados_novos").$type<Record<string, any>>(),
  ipOrigem: text("ip_origem"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// NOTIFICATIONS (Sistema de Notificações)
// ========================================

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  remetenteId: varchar("remetente_id").references(() => users.id, { onDelete: "set null" }),
  setorId: varchar("setor_id").references(() => setores.id, { onDelete: "set null" }), // Contexto do setor
  tipo: text("tipo").notNull(), // assignment, comment, status_change, reminder, etc.
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  entidade: text("entidade"),
  entidadeId: varchar("entidade_id"),
  lida: boolean("lida").default(false).notNull(),
  dataEnvio: timestamp("data_envio").defaultNow().notNull(),
  dataLeitura: timestamp("data_leitura"),
});

// ========================================
// CLIENTS
// ========================================

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  cnpj: text("cnpj"),
  sector: text("sector"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  status: statusClienteEnum("status").default("pending").notNull(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// ONBOARDING STAGES
// ========================================

export const onboardingStages = pgTable("onboarding_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(), // initial_meeting, documentation, review, completed
  status: statusOnboardingEnum("status").default("pending").notNull(),
  funcaoResponsavel: funcaoEnum("funcao_responsavel"), // [DEPRECATED] Migrar para setorResponsavelId
  setorResponsavelId: varchar("setor_responsavel_id").references(() => setores.id, { onDelete: "set null" }), // Setor responsável pela etapa
  assignedTo: varchar("assigned_to").references(() => users.id), // Usuário atribuído
  assignmentRequired: boolean("assignment_required").default(false).notNull(), // Requer atribuição?
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// PROCESS ASSIGNMENTS (Sistema de Atribuição e Assinatura)
// ========================================

export const processAssignments = pgTable("process_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoTipo: text("processo_tipo").notNull(), // onboarding_stage, appointment, visit, etc.
  processoId: varchar("processo_id").notNull(),
  stageId: varchar("stage_id"), // Referência opcional para etapas específicas
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  funcaoNecessaria: funcaoEnum("funcao_necessaria"), // [DEPRECATED] Migrar para setorId
  setorId: varchar("setor_id").references(() => setores.id, { onDelete: "set null" }), // Setor necessário para executar
  status: statusAtribuicaoEnum("status").default("pending").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  signedAt: timestamp("signed_at"), // Quando o usuário aceitou a responsabilidade
  completedAt: timestamp("completed_at"),
  rejectedAt: timestamp("rejected_at"),
  motivoRejeicao: text("motivo_rejeicao"),
  notas: text("notas"),
});

// ========================================
// COMMENTS (Sistema de Comentários Universal)
// ========================================

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => users.id),
  entidadeTipo: text("entidade_tipo").notNull(), // client, onboarding_stage, appointment, visit, etc.
  entidadeId: varchar("entidade_id").notNull(),
  conteudo: text("conteudo").notNull(),
  privado: boolean("privado").default(false).notNull(), // Comentário privado (apenas admin e atribuído)
  editado: boolean("editado").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// APPOINTMENTS
// ========================================

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  assigneeId: varchar("assignee_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  type: tipoAgendamentoEnum("type").notNull(),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  location: text("location"),
  meetingUrl: text("meeting_url"),
  status: statusAgendamentoEnum("status").default("scheduled").notNull(),
  googleEventId: text("google_event_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// VISITS (Visitas Técnicas / ATAs)
// ========================================

export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  assigneeId: varchar("assignee_id").references(() => users.id),
  date: timestamp("date").notNull(),
  participants: text("participants").notNull(),
  description: text("description").notNull(),
  type: tipoVisitaEnum("type").default("technical_visit").notNull(),
  status: statusVisitaEnum("status").default("completed").notNull(),
  location: text("location"),
  decisions: json("decisions").$type<Array<{ decisao: string; responsavel?: string }>>(),
  pending_actions: json("pending_actions").$type<Array<{ acao: string; responsavel?: string; prazo?: string }>>(),
  satisfaction_rating: integer("satisfaction_rating"), // 1-5
  attachments: json("attachments").$type<Array<{ nome: string; url: string; tipo?: string }>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// ACTIVITIES (Log de Atividades)
// ========================================

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // client_created, stage_completed, meeting_scheduled, etc.
  description: text("description").notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// INTEGRATIONS (Integrações Externas)
// ========================================

export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // google_calendar, gmail
  status: text("status").notNull().default("disconnected"), // connected, disconnected, error
  credentials: json("credentials").$type<Record<string, any>>(),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// PASSWORD RESET TOKENS
// ========================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// FILES (Upload de arquivos)
// ========================================

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  bucket: text("bucket").notNull(),
  key: text("key").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type"), // 'visit', 'client', 'user'
  entityId: varchar("entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// GOOGLE TOKENS (OAuth2 por usuário)
// ========================================

export const googleTokens = pgTable("google_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  expiry: timestamp("expiry").notNull(),
  scopes: json("scopes").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// INSERT SCHEMAS
// ========================================

export const insertSetorSchema = createInsertSchema(setores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerfilSchema = createInsertSchema(perfis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSetorSchema = createInsertSchema(userSetores).omit({
  id: true,
  createdAt: true,
});

export const insertPermissaoCatalogoSchema = createInsertSchema(permissaoCatalogo).omit({
  id: true,
  createdAt: true,
});

export const insertPerfilSetorPermissaoSchema = createInsertSchema(perfilSetorPermissao).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  dataEnvio: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnboardingStageSchema = createInsertSchema(onboardingStages).omit({
  id: true,
  createdAt: true,
});

export const insertProcessAssignmentSchema = createInsertSchema(processAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  editado: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
});

export const insertGoogleTokenSchema = createInsertSchema(googleTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

// ========================================
// TYPES
// ========================================

export type InsertSetor = z.infer<typeof insertSetorSchema>;
export type Setor = typeof setores.$inferSelect;

export type InsertPerfil = z.infer<typeof insertPerfilSchema>;
export type Perfil = typeof perfis.$inferSelect;

export type InsertUserSetor = z.infer<typeof insertUserSetorSchema>;
export type UserSetor = typeof userSetores.$inferSelect;

export type InsertPermissaoCatalogo = z.infer<typeof insertPermissaoCatalogoSchema>;
export type PermissaoCatalogo = typeof permissaoCatalogo.$inferSelect;

export type InsertPerfilSetorPermissao = z.infer<typeof insertPerfilSetorPermissaoSchema>;
export type PerfilSetorPermissao = typeof perfilSetorPermissao.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertOnboardingStage = z.infer<typeof insertOnboardingStageSchema>;
export type OnboardingStage = typeof onboardingStages.$inferSelect;

export type InsertProcessAssignment = z.infer<typeof insertProcessAssignmentSchema>;
export type ProcessAssignment = typeof processAssignments.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

export type InsertGoogleToken = z.infer<typeof insertGoogleTokenSchema>;
export type GoogleToken = typeof googleTokens.$inferSelect;

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// ========================================
// EXTENDED TYPES
// ========================================

export type ClientWithDetails = Client & {
  assignee?: User;
  currentStage?: OnboardingStage;
  nextAppointment?: Appointment;
  lastActivity?: Activity;
  onboardingProgress?: number;
};

export type AppointmentWithDetails = Appointment & {
  client: Client;
  assignee?: User;
};

export type ActivityWithDetails = Activity & {
  client?: Client;
  user?: User;
};

export type DashboardMetrics = {
  activeClients: number;
  onboardingClients: number;
  todayMeetings: number;
  scheduledVisits: number;
  onboardingClientsList: ClientWithDetails[];
  upcomingAppointments: AppointmentWithDetails[];
  recentActivities: ActivityWithDetails[];
};

export type UserWithoutPassword = Omit<User, "senhaHash" | "token" | "refreshToken">;

export type CommentWithUser = Comment & {
  usuario: UserWithoutPassword;
};

export type NotificationWithDetails = Notification & {
  remetente?: UserWithoutPassword;
  setor?: Setor;
};

// Tipo para UserSetor com detalhes
export type UserSetorWithDetails = UserSetor & {
  setor: Setor;
  perfil: Perfil;
};

// Tipo para Usuário com seus setores
export type UserWithSetores = UserWithoutPassword & {
  setores: UserSetorWithDetails[];
  setorPrincipal?: Setor;
};

// Tipo para Setor com usuários
export type SetorWithUsers = Setor & {
  usuarios: (UserWithoutPassword & { perfil: Perfil })[];
};
