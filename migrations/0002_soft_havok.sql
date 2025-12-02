CREATE TABLE "files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"uploaded_by" varchar,
	"entity_type" text,
	"entity_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "perfis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"codigo" text NOT NULL,
	"descricao" text,
	"nivel_hierarquico" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "perfis_nome_unique" UNIQUE("nome"),
	CONSTRAINT "perfis_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "setores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"codigo" text NOT NULL,
	"email" text,
	"descricao" text,
	"cor" text,
	"icone" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "setores_nome_unique" UNIQUE("nome"),
	CONSTRAINT "setores_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "setores_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_setores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"setor_id" varchar NOT NULL,
	"perfil_id" varchar NOT NULL,
	"principal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_setores_user_id_setor_id_unique" UNIQUE("user_id","setor_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "setor_id" varchar;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "setor_id" varchar;--> statement-breakpoint
ALTER TABLE "onboarding_stages" ADD COLUMN "setor_responsavel_id" varchar;--> statement-breakpoint
ALTER TABLE "process_assignments" ADD COLUMN "setor_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primeiro_login" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_backup_codes" json;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setores" ADD CONSTRAINT "user_setores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setores" ADD CONSTRAINT "user_setores_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setores" ADD CONSTRAINT "user_setores_perfil_id_perfis_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_stages" ADD CONSTRAINT "onboarding_stages_setor_responsavel_id_setores_id_fk" FOREIGN KEY ("setor_responsavel_id") REFERENCES "public"."setores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_assignments" ADD CONSTRAINT "process_assignments_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE set null ON UPDATE no action;