import { pgTable, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { classesTable } from "./classes";
import { subjectsTable } from "./subjects";
import { schoolsTable } from "./schools";

export const timetableTable = pgTable("timetable", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  period: integer("period").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  isLocked: boolean("is_locked").notNull().default(false),
});

export const insertTimetableSlotSchema = createInsertSchema(timetableTable).omit({ id: true });
export type InsertTimetableSlot = z.infer<typeof insertTimetableSlotSchema>;
export type TimetableSlot = typeof timetableTable.$inferSelect;
