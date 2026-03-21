import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";

export const blockedPeriodsTable = pgTable("blocked_periods", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  period: integer("period").notNull(),
});

export const insertBlockedPeriodSchema = createInsertSchema(blockedPeriodsTable).omit({ id: true });
export type InsertBlockedPeriod = z.infer<typeof insertBlockedPeriodSchema>;
export type BlockedPeriod = typeof blockedPeriodsTable.$inferSelect;
