CREATE TYPE "public"."tipo_seccion" AS ENUM('Cátedra', 'Laboratorio', 'Ayudantía');--> statement-breakpoint
CREATE TABLE "evaluaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"tipo" text,
	"nota" numeric(2, 1),
	"temario" text,
	"ponderacion" numeric(3, 2) NOT NULL,
	"ramoId" integer NOT NULL,
	"fecha" timestamp with time zone,
	CONSTRAINT "nota_range" CHECK ("evaluaciones"."nota" >= 1.0 AND "evaluaciones"."nota" <= 7.0),
	CONSTRAINT "pond_range" CHECK ("evaluaciones"."ponderacion" >= 0.0 AND "evaluaciones"."ponderacion" <= 1.0)
);
--> statement-breakpoint
CREATE TABLE "ramos" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"codRamo" char(8) NOT NULL,
	"creditos" integer NOT NULL,
	"notaEximicion" numeric(2, 1) DEFAULT 5,
	"semestreId" integer
);
--> statement-breakpoint
CREATE TABLE "secciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" smallint NOT NULL,
	"docente" text,
	"tipo" "tipo_seccion",
	"ramoId" integer
);
--> statement-breakpoint
CREATE TABLE "semestres" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" smallint NOT NULL,
	"año" integer NOT NULL,
	"activo" boolean DEFAULT false,
	"fechaInicio" date,
	"fechaFin" date
);
--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_ramoId_ramos_id_fk" FOREIGN KEY ("ramoId") REFERENCES "public"."ramos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ramos" ADD CONSTRAINT "ramos_semestreId_semestres_id_fk" FOREIGN KEY ("semestreId") REFERENCES "public"."semestres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_ramoId_ramos_id_fk" FOREIGN KEY ("ramoId") REFERENCES "public"."ramos"("id") ON DELETE cascade ON UPDATE no action;