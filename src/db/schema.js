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

export const sectionTypeEnum = pgEnum("section_type", [
  "Lecture",
  "Laboratory",
  "Tutorial",
]);

// SQL tables

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  courseCode: char("courseCode", { length: 8 }).notNull(),
  credits: integer("credits").notNull(),
  exemptionGrade: decimal("exemptionGrade", { precision: 2, scale: 1 }).default(
    5.0,
  ),
  semesterId: integer("semesterId").references(() => semesters.id, {
    onDelete: "cascade",
  }),
});

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  number: smallint("number").notNull(),
  instructor: text("instructor"),
  type: sectionTypeEnum("type"),
  courseId: integer("courseId").references(() => courses.id, { onDelete: "cascade" }),
});

export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    type: text("type"),
    grade: decimal("grade", { precision: 2, scale: 1 }),
    syllabus: text("syllabus"),
    weight: decimal("weight", { precision: 3, scale: 2 }).notNull(),
    courseId: integer("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }),
  },
  (table) => ({
    // make sure the grades are within limits
    gradeRange: check(
      "grade_range",
      sql`${table.grade} >= 1.0 AND ${table.grade} <= 7.0`,
    ),
    // same for weights
    weightRange: check(
      "weight_range",
      sql`${table.weight} >= 0.0 AND ${table.weight} <= 1.0`,
    ),
  }),
);

export const semesters = pgTable("semesters", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  active: boolean("active").default(false),
  startDate: date("startDate"),
  endDate: date("endDate"),
  number: smallint("number"),
  userId: integer("userId").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
});

// SQL relations

export const usersRelations = relations(users, ({ many }) => ({
  semesters: many(semesters),
}));

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  courses: many(courses),
  user: one(users, {
    fields: [semesters.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  // 1 semester has N courses
  semester: one(semesters, {
    fields: [courses.semesterId],
    references: [semesters.id],
  }),
  sections: many(sections),
  assignments: many(assignments),
}));

export const sectionsRelations = relations(sections, ({ one }) => ({
  // 1 course has N sections
  course: one(courses, {
    fields: [sections.courseId],
    references: [courses.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  // 1 course has N assignments
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
}));

// Validation with Zod

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email"),
  passwordHash: z.string().min(1),
});

export const insertCourseSchema = createInsertSchema(courses, {
  title: z.string().min(1, "Title required"),
  courseCode: z.string().length(8, "Code must be 8 characters"),
  credits: z.number().int().positive("Credits must be positive"),
  exemptionGrade: z.number().min(1.0).max(7.0).optional(),
});

export const insertSectionSchema = createInsertSchema(sections, {
  number: z.number().int().positive(),
  instructor: z.string().optional(),
  type: z.enum(["Lecture", "Laboratory", "Tutorial"]),
});

export const insertAssignmentSchema = createInsertSchema(assignments, {
  title: z.string().min(1, "Title required"),
  grade: z.coerce.number().min(1.0).max(7.0).optional(),
  weight: z.coerce.number().min(0.0).max(1.0),
});

export const insertSemesterSchema = createInsertSchema(semesters, {
  number: z.number().int().positive(),
  year: z.number().int().min(2000).max(2100),
  active: z.boolean().optional(),
});

// Select schemas (for reading data)

export const selectUserSchema = createSelectSchema(users);
export const selectCourseSchema = createSelectSchema(courses);
export const selectSectionSchema = createSelectSchema(sections);
export const selectAssignmentSchema = createSelectSchema(assignments);
export const selectSemesterSchema = createSelectSchema(semesters);
