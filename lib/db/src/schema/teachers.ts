import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { schoolsTable } from "./schools";

export const teachersTable = pgTable("teachers", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  shortName: text("short_name"),
  subject: text("subject").notNull(),
  maxWeeklyHours: integer("max_weekly_hours").notNull().default(24),
  shareToken: text("share_token").default(sql`gen_random_uuid()::text`),
  phone: text("phone"),
  isSeconded: boolean("is_seconded").notNull().default(false),
  hideFromPrint: boolean("hide_from_print").notNull().default(false),
});

export const insertTeacherSchema = createInsertSchema(teachersTable).omit({ id: true });
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachersTable.$inferSelect;
