import { pgTable, serial, integer, text, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { timetableTable } from "./timetable";
import { schoolsTable } from "./schools";

export const substitutionAssignmentsTable = pgTable("substitution_assignments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  absentTeacherId: integer("absent_teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  substituteTeacherId: integer("substitute_teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  timetableSlotId: integer("timetable_slot_id").notNull().references(() => timetableTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubstitutionSchema = createInsertSchema(substitutionAssignmentsTable).omit({ id: true, createdAt: true });
export type InsertSubstitution = z.infer<typeof insertSubstitutionSchema>;
export type SubstitutionAssignment = typeof substitutionAssignmentsTable.$inferSelect;

export const examCommitteesTable = pgTable("exam_committees", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  examName: text("exam_name").notNull(),
  assignments: json("assignments").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExamCommitteeSchema = createInsertSchema(examCommitteesTable).omit({ id: true, createdAt: true });
export type InsertExamCommittee = z.infer<typeof insertExamCommitteeSchema>;
export type ExamCommittee = typeof examCommitteesTable.$inferSelect;
