import {
  // I read somewhere that it's not efficient to import * so i'm stuck with this comically large import statement...
  pgTable,
  pgEnum,
  timestamp,
  check,
  text,
  smallint,
  date,
  decimal,
  boolean,
  serial,
  char,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod"; // zod makes the db fool proof, it makes sure there are no invalid values
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// enum

export const tipoSeccionEnum = pgEnum("tipo_seccion", [
  "Cátedra",
  "Laboratorio",
  "Ayudantía",
]);

// SQL tables

export const ramos = pgTable("ramos", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  codRamo: char("codRamo", { length: 8 }).notNull(),
  creditos: integer("creditos").notNull(),
  notaEximicion: decimal("notaEximicion", { precision: 2, scale: 1 }).default(
    5.0,
  ),
  semestreId: integer("semestreId").references(() => semestres.id, {
    onDelete: "cascade",
  }),
});

export const secciones = pgTable("secciones", {
  id: serial("id").primaryKey(),
  numero: smallint("numero").notNull(),
  docente: text("docente"),
  tipo: tipoSeccionEnum("tipo"),
  ramoId: integer("ramoId").references(() => ramos.id, { onDelete: "cascade" }),
});

export const evaluaciones = pgTable(
  "evaluaciones",
  {
    id: serial("id").primaryKey(),
    titulo: text("titulo").notNull(),
    tipo: text("tipo"),
    nota: decimal("nota", { precision: 2, scale: 1 }),
    temario: text("temario"),
    ponderacion: decimal("ponderacion", { precision: 3, scale: 2 }).notNull(),
    ramoId: integer("ramoId")
      .notNull()
      .references(() => ramos.id, { onDelete: "cascade" }),
    fecha: timestamp("fecha", { withTimezone: true }),
  },
  (table) => ({
    // make sure the grades are within limits
    notaRange: check(
      "nota_range",
      sql`${table.nota} >= 1.0 AND ${table.nota} <= 7.0`,
    ),
    // same for weights
    ponderacionRange: check(
      "pond_range",
      sql`${table.ponderacion} >= 0.0 AND ${table.ponderacion} <= 1.0`,
    ),
  }),
);

export const semestres = pgTable("semestres", {
  id: serial("id").primaryKey(),
  año: integer("año").notNull(),
  activo: boolean("activo").default(false),
  fechaInicio: date("fechaInicio"),
  fechaFin: date("fechaFin"),
});

// SQL relations

export const semestresRelations = relations(semestres, ({ many }) => ({
  // 1 semester has N courses
  ramos: many(ramos),
}));

export const ramosRelations = relations(ramos, ({ one, many }) => ({
  // 1 semester has N courses
  semestre: one(semestres, {
    fields: [ramos.semestreId],
    references: [semestres.id],
  }),
  secciones: many(secciones),
  evaluaciones: many(evaluaciones),
}));

export const seccionesRelations = relations(secciones, ({ one }) => ({
  // 1 course has N sections
  ramo: one(ramos, {
    fields: [secciones.ramoId],
    references: [ramos.id],
  }),
}));

export const evaluacionesRelations = relations(evaluaciones, ({ one }) => ({
  // 1 course has N assignments
  ramo: one(ramos, {
    fields: [evaluaciones.ramoId],
    references: [ramos.id],
  }),
}));

// Validation with Zod

export const insertRamoSchema = createInsertSchema(ramos, {
  titulo: z.string().min(1, "Título requerido"),
  codRamo: z.string().length(8, "El código debe tener 8 dígitos"),
  creditos: z.number().int().positive("Los créditos deben ser positivos"),
  notaEximicion: z.number().min(1.0).max(7.0).optional(),
});

export const insertSeccionSchema = createInsertSchema(secciones, {
  numero: z.number().int().positive(),
  docente: z.string().optional(),
  tipo: z.enum(["Cátedra", "Laboratorio", "Ayudantía"]),
});

export const insertEvaluacionSchema = createInsertSchema(evaluaciones, {
  titulo: z.string().min(1, "Título requerido"),
  nota: z.coerce.number().min(1.0).max(7.0).optional(),
  ponderacion: z.coerce.number().min(0.0).max(1.0),
});

export const insertSemestreSchema = createInsertSchema(semestres, {
  numero: z.number().int().positive(),
  año: z.number().int().min(2000).max(2100),
  activo: z.boolean().optional(),
});

// Select schemas (for reading data)

export const selectRamoSchema = createSelectSchema(ramos);
export const selectSeccionSchema = createSelectSchema(secciones);
export const selectEvaluacionSchema = createSelectSchema(evaluaciones);
export const selectSemestreSchema = createSelectSchema(semestres);
