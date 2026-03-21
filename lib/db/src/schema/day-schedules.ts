import { pgTable, serial, integer, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scheduleSettingsTable } from "./schedule-settings";

export const daySchedulesTable = pgTable(
  "day_schedules",
  {
    id: serial("id").primaryKey(),
    scheduleSettingsId: integer("schedule_settings_id")
      .notNull()
      .references(() => scheduleSettingsTable.id, { onDelete: "cascade" }),
    dayOfWeek: text("day_of_week").notNull(),
    periodsCount: integer("periods_count").notNull(),
    customStartTime: text("custom_start_time"),
  },
  (table) => ({
    uniqueDaySchedule: uniqueIndex("uq_day_schedules_settings_day").on(
      table.scheduleSettingsId,
      table.dayOfWeek,
    ),
  }),
);

export const insertDayScheduleSchema = createInsertSchema(daySchedulesTable).omit({ id: true });
export type InsertDaySchedule = z.infer<typeof insertDayScheduleSchema>;
export type DaySchedule = typeof daySchedulesTable.$inferSelect;