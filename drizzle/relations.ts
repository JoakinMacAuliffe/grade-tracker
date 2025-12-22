import { relations } from "drizzle-orm/relations";
import { ramos, secciones, semestres, evaluaciones } from "./schema";

export const seccionesRelations = relations(secciones, ({one}) => ({
	ramo: one(ramos, {
		fields: [secciones.ramoId],
		references: [ramos.id]
	}),
}));

export const ramosRelations = relations(ramos, ({one, many}) => ({
	secciones: many(secciones),
	semestre: one(semestres, {
		fields: [ramos.semestreId],
		references: [semestres.id]
	}),
	evaluaciones: many(evaluaciones),
}));

export const semestresRelations = relations(semestres, ({many}) => ({
	ramos: many(ramos),
}));

export const evaluacionesRelations = relations(evaluaciones, ({one}) => ({
	ramo: one(ramos, {
		fields: [evaluaciones.ramoId],
		references: [ramos.id]
	}),
}));