import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id"),
  dueDate: text("due_date"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
