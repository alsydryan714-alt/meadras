import { pgTable, serial, integer, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scheduleSettingsTable } from "./schedule-settings";

export const stageBreaksTable = pgTable(
  "stage_breaks",
  {
    id: serial("id").primaryKey(),
    scheduleSettingsId: integer("schedule_settings_id")
      .notNull()
      .references(() => scheduleSettingsTable.id, { onDelete: "cascade" }),
    afterPeriod: integer("after_period").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    type: text("type").notNull().default("break"),
    label: text("label"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    scheduleSettingsIndex: index("idx_stage_breaks_schedule").on(table.scheduleSettingsId),
  }),
);

export const insertStageBreakSchema = createInsertSchema(stageBreaksTable).omit({ id: true });
export type InsertStageBreak = z.infer<typeof insertStageBreakSchema>;
export type StageBreak = typeof stageBreaksTable.$inferSelect;