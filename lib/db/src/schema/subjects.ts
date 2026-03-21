import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  officialHoursPerWeek: integer("official_hours_per_week").notNull().default(1),
  pairedPeriods: integer("paired_periods").notNull().default(0),
  isActivity: boolean("is_activity").notNull().default(false),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
