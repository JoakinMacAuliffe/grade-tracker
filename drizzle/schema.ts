import { pgTable, serial, integer, boolean, date, foreignKey, smallint, text, char, numeric, check, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const tipoSeccion = pgEnum("tipo_seccion", ['Cátedra', 'Laboratorio', 'Ayudantía'])


export const semestres = pgTable("semestres", {
	id: serial().primaryKey().notNull(),
	"año": integer("año").notNull(),
	activo: boolean().default(false),
	fechaInicio: date(),
	fechaFin: date(),
});

export const secciones = pgTable("secciones", {
	id: serial().primaryKey().notNull(),
	numero: smallint().notNull(),
	docente: text(),
	tipo: tipoSeccion(),
	ramoId: integer(),
}, (table) => [
	foreignKey({
			columns: [table.ramoId],
			foreignColumns: [ramos.id],
			name: "secciones_ramoId_ramos_id_fk"
		}).onDelete("cascade"),
]);

export const ramos = pgTable("ramos", {
	id: serial().primaryKey().notNull(),
	titulo: text().notNull(),
	codRamo: char({ length: 8 }).notNull(),
	creditos: integer().notNull(),
	notaEximicion: numeric({ precision: 2, scale:  1 }).default('5'),
	semestreId: integer(),
}, (table) => [
	foreignKey({
			columns: [table.semestreId],
			foreignColumns: [semestres.id],
			name: "ramos_semestreId_semestres_id_fk"
		}).onDelete("cascade"),
]);

export const evaluaciones = pgTable("evaluaciones", {
	id: serial().primaryKey().notNull(),
	titulo: text().notNull(),
	tipo: text(),
	nota: numeric({ precision: 2, scale:  1 }),
	temario: text(),
	ponderacion: numeric({ precision: 3, scale:  2 }).notNull(),
	ramoId: integer().notNull(),
	fecha: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.ramoId],
			foreignColumns: [ramos.id],
			name: "evaluaciones_ramoId_ramos_id_fk"
		}).onDelete("cascade"),
	check("nota_range", sql`(nota >= 1.0) AND (nota <= 7.0)`),
	check("pond_range", sql`(ponderacion >= 0.0) AND (ponderacion <= 1.0)`),
]);
