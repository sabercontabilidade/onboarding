CREATE TYPE "public"."funcao" AS ENUM('comercial', 'integracao', 'onboarding', 'admin');--> statement-breakpoint
CREATE TYPE "public"."nivel_permissao" AS ENUM('administrador', 'operador', 'analista');--> statement-breakpoint
CREATE TYPE "public"."status_agendamento" AS ENUM('scheduled', 'completed', 'cancelled', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."status_atribuicao" AS ENUM('pending', 'signed', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."status_cliente" AS ENUM('pending', 'onboarding', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."status_onboarding" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."status_visita" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tipo_agendamento" AS ENUM('meeting', 'visit', 'call', 'followup');--> statement-breakpoint
CREATE TYPE "public"."tipo_visita" AS ENUM('technical_visit', 'maintenance', 'training', 'follow_up');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"user_id" varchar,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"assignee_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"type" "tipo_agendamento" NOT NULL,
	"scheduled_start" timestamp NOT NULL,
	"scheduled_end" timestamp NOT NULL,
	"location" text,
	"meeting_url" text,
	"status" "status_agendamento" DEFAULT 'scheduled' NOT NULL,
	"google_event_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" varchar,
	"acao" text NOT NULL,
	"entidade" text,
	"entidade_id" varchar,
	"descricao" text NOT NULL,
	"dados_anteriores" json,
	"dados_novos" json,
	"ip_origem" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"cnpj" text,
	"sector" text,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"status" "status_cliente" DEFAULT 'pending' NOT NULL,
	"assignee_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" varchar NOT NULL,
	"entidade_tipo" text NOT NULL,
	"entidade_id" varchar NOT NULL,
	"conteudo" text NOT NULL,
	"privado" boolean DEFAULT false NOT NULL,
	"editado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"credentials" json,
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" varchar NOT NULL,
	"remetente_id" varchar,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text NOT NULL,
	"entidade" text,
	"entidade_id" varchar,
	"lida" boolean DEFAULT false NOT NULL,
	"data_envio" timestamp DEFAULT now() NOT NULL,
	"data_leitura" timestamp
);
--> statement-breakpoint
CREATE TABLE "onboarding_stages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"stage" text NOT NULL,
	"status" "status_onboarding" DEFAULT 'pending' NOT NULL,
	"funcao_responsavel" "funcao",
	"assigned_to" varchar,
	"assignment_required" boolean DEFAULT false NOT NULL,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_tipo" text NOT NULL,
	"processo_id" varchar NOT NULL,
	"stage_id" varchar,
	"assigned_to" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"funcao_necessaria" "funcao",
	"status" "status_atribuicao" DEFAULT 'pending' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"signed_at" timestamp,
	"completed_at" timestamp,
	"rejected_at" timestamp,
	"motivo_rejeicao" text,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"token" text,
	"refresh_token" text,
	"funcao" "funcao" DEFAULT 'onboarding',
	"nivel_permissao" "nivel_permissao" DEFAULT 'operador',
	"foto_url" text,
	"telefone" text,
	"data_nascimento" timestamp,
	"ativo" boolean DEFAULT true NOT NULL,
	"bloqueado" boolean DEFAULT false NOT NULL,
	"ultimo_login" timestamp,
	"tentativas_login" integer DEFAULT 0 NOT NULL,
	"permissoes" json,
	"preferencias" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"assignee_id" varchar,
	"date" timestamp NOT NULL,
	"participants" text NOT NULL,
	"description" text NOT NULL,
	"type" "tipo_visita" DEFAULT 'technical_visit' NOT NULL,
	"status" "status_visita" DEFAULT 'completed' NOT NULL,
	"location" text,
	"decisions" json,
	"pending_actions" json,
	"satisfaction_rating" integer,
	"attachments" json,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_remetente_id_users_id_fk" FOREIGN KEY ("remetente_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_stages" ADD CONSTRAINT "onboarding_stages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_stages" ADD CONSTRAINT "onboarding_stages_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_assignments" ADD CONSTRAINT "process_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_assignments" ADD CONSTRAINT "process_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;