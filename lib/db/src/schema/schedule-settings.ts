import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { stagesTable } from "./stages";

export const scheduleSettingsTable = pgTable(
  "schedule_settings",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    stageId: integer("stage_id")
      .notNull()
      .references(() => stagesTable.id, { onDelete: "cascade" }),

    startTime: text("start_time").notNull().default("07:30"),
    defaultPeriodsPerDay: integer("default_periods_per_day").notNull().default(7),
    defaultPeriodDuration: integer("default_period_duration").notNull().default(45),
    weekDays: text("week_days")
      .notNull()
      .default('["sunday","monday","tuesday","wednesday","thursday"]'),

    hasAssemblyPeriod: boolean("has_assembly_period").notNull().default(false),
    assemblyDuration: integer("assembly_duration").default(15),

    teacherWeeklyQuota: integer("teacher_weekly_quota").notNull().default(20),

    periodLabel: text("period_label").notNull().default("period"),
    themeColor: text("theme_color").notNull().default("#3b82f6"),
    printTemplate: text("print_template").notNull().default("default"),
    showLogoOnPrint: boolean("show_logo_on_print").notNull().default(true),
  },
  (table) => ({
    uniqueStageSchedule: uniqueIndex("uq_schedule_settings_stage_id").on(
      table.stageId,
    ),
  }),
);

export const insertScheduleSettingsSchema = createInsertSchema(
  scheduleSettingsTable,
).omit({ id: true });

export type InsertScheduleSettings = z.infer<typeof insertScheduleSettingsSchema>;
export type ScheduleSettings = typeof scheduleSettingsTable.$inferSelect;
