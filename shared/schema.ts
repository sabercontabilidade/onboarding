import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("contador"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  cnpj: text("cnpj"),
  sector: text("sector"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  status: text("status").notNull().default("onboarding"), // onboarding, active, inactive, pending
  assigneeId: varchar("assignee_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const onboardingStages = pgTable("onboarding_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(), // initial_meeting, documentation, review, completed
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  assigneeId: varchar("assignee_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // meeting, visit, call, followup
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  location: text("location"),
  meetingUrl: text("meeting_url"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, rescheduled
  googleEventId: text("google_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // client_created, stage_completed, meeting_scheduled, email_sent, etc.
  description: text("description").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  participants: text("participants").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("technical_visit"), // technical_visit, maintenance, training, etc.
  status: text("status").notNull().default("completed"), // scheduled, completed, cancelled
  location: text("location"),
  decisions: json("decisions"),
  pending_actions: json("pending_actions"),
  satisfaction_rating: integer("satisfaction_rating"),
  attachments: json("attachments"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // google_calendar, gmail
  status: text("status").notNull().default("disconnected"), // connected, disconnected, error
  credentials: json("credentials"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertOnboardingStage = z.infer<typeof insertOnboardingStageSchema>;
export type OnboardingStage = typeof onboardingStages.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

// Extended types for frontend
export type ClientWithDetails = Client & {
  assignee?: User;
  currentStage?: OnboardingStage;
  nextAppointment?: Appointment;
  lastActivity?: Activity;
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
