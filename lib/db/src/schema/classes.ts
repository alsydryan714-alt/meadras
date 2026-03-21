import { pgTable, serial, integer, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { gradesTable } from "./grades";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  gradeId: integer("grade_id")
    .notNull()
    .references(() => gradesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  gender: text("gender").notNull().default("mixed"),
  track: text("track"),
  building: text("building"),
  capacity: integer("capacity").notNull().default(30),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("active"),
  isLocked: boolean("is_locked").notNull().default(false),
  supervisorId: integer("supervisor_id"),
  createdBy: integer("created_by"),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type SchoolClass = typeof classesTable.$inferSelect;
