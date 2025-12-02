CREATE TABLE "perfil_setor_permissao" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perfil_id" varchar NOT NULL,
	"setor_id" varchar,
	"permissao_id" varchar NOT NULL,
	"escopo" text DEFAULT 'setor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "perfil_setor_permissao_perfil_id_setor_id_permissao_id_unique" UNIQUE("perfil_id","setor_id","permissao_id")
);
--> statement-breakpoint
CREATE TABLE "permissao_catalogo" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"modulo" text NOT NULL,
	"categoria" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissao_catalogo_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "perfil_setor_permissao" ADD CONSTRAINT "perfil_setor_permissao_perfil_id_perfis_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_setor_permissao" ADD CONSTRAINT "perfil_setor_permissao_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_setor_permissao" ADD CONSTRAINT "perfil_setor_permissao_permissao_id_permissao_catalogo_id_fk" FOREIGN KEY ("permissao_id") REFERENCES "public"."permissao_catalogo"("id") ON DELETE cascade ON UPDATE no action;