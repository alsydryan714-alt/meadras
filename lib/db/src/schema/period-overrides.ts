import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scheduleSettingsTable } from "./schedule-settings";

export const periodOverridesTable = pgTable(
  "period_overrides",
  {
    id: serial("id").primaryKey(),
    scheduleSettingsId: integer("schedule_settings_id")
      .notNull()
      .references(() => scheduleSettingsTable.id, { onDelete: "cascade" }),
    periodNumber: integer("period_number").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
  },
  (table) => ({
    uniquePeriodOverride: uniqueIndex("uq_period_overrides_settings_period").on(
      table.scheduleSettingsId,
      table.periodNumber,
    ),
  }),
);

export const insertPeriodOverrideSchema = createInsertSchema(periodOverridesTable).omit({
  id: true,
});
export type InsertPeriodOverride = z.infer<typeof insertPeriodOverrideSchema>;
export type PeriodOverride = typeof periodOverridesTable.$inferSelect;