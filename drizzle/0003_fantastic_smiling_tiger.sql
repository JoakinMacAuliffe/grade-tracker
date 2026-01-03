ALTER TYPE "public"."tipo_seccion" RENAME TO "section_type";--> statement-breakpoint
ALTER TABLE "evaluaciones" RENAME TO "assignments";--> statement-breakpoint
ALTER TABLE "ramos" RENAME TO "courses";--> statement-breakpoint
ALTER TABLE "secciones" RENAME TO "sections";--> statement-breakpoint
ALTER TABLE "semestres" RENAME TO "semesters";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "titulo" TO "title";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "tipo" TO "type";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "nota" TO "grade";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "temario" TO "syllabus";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "ponderacion" TO "weight";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "ramoId" TO "courseId";--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "fecha" TO "date";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "titulo" TO "title";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "codRamo" TO "courseCode";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "creditos" TO "credits";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "notaEximicion" TO "exemptionGrade";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "semestreId" TO "semesterId";--> statement-breakpoint
ALTER TABLE "sections" RENAME COLUMN "numero" TO "number";--> statement-breakpoint
ALTER TABLE "sections" RENAME COLUMN "docente" TO "instructor";--> statement-breakpoint
ALTER TABLE "sections" RENAME COLUMN "tipo" TO "type";--> statement-breakpoint
ALTER TABLE "sections" RENAME COLUMN "ramoId" TO "courseId";--> statement-breakpoint
ALTER TABLE "semesters" RENAME COLUMN "año" TO "year";--> statement-breakpoint
ALTER TABLE "semesters" RENAME COLUMN "activo" TO "active";--> statement-breakpoint
ALTER TABLE "semesters" RENAME COLUMN "fechaInicio" TO "startDate";--> statement-breakpoint
ALTER TABLE "semesters" RENAME COLUMN "fechaFin" TO "endDate";--> statement-breakpoint
ALTER TABLE "semesters" RENAME COLUMN "numero" TO "number";--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "nota_range";--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "pond_range";--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "evaluaciones_ramoId_ramos_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "ramos_semestreId_semestres_id_fk";
--> statement-breakpoint
ALTER TABLE "sections" DROP CONSTRAINT "secciones_ramoId_ramos_id_fk";
--> statement-breakpoint
ALTER TABLE "semesters" DROP CONSTRAINT "semestres_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sections" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."section_type";--> statement-breakpoint
CREATE TYPE "public"."section_type" AS ENUM('Lecture', 'Laboratory', 'Tutorial');--> statement-breakpoint
ALTER TABLE "sections" ALTER COLUMN "type" SET DATA TYPE "public"."section_type" USING "type"::"public"."section_type";--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_courseId_courses_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_semesterId_semesters_id_fk" FOREIGN KEY ("semesterId") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_courseId_courses_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "grade_range" CHECK ("assignments"."grade" >= 1.0 AND "assignments"."grade" <= 7.0);--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "weight_range" CHECK ("assignments"."weight" >= 0.0 AND "assignments"."weight" <= 1.0);