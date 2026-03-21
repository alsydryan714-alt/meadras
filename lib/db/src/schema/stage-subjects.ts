import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { stagesTable } from "./stages";
import { subjectsTable } from "./subjects";

export const stageSubjectsTable = pgTable(
  "stage_subjects",
  {
    id: serial("id").primaryKey(),
    stageId: integer("stage_id")
      .notNull()
      .references(() => stagesTable.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    weeklyHours: integer("weekly_hours").notNull().default(1),
    maxWeeklyHours: integer("max_weekly_hours"),
  },
  (table) => ({
    uniqueStageSubject: uniqueIndex("uq_stage_subjects_stage_subject").on(
      table.stageId,
      table.subjectId,
    ),
  }),
);

export const insertStageSubjectSchema = createInsertSchema(stageSubjectsTable).omit({
  id: true,
});
export type InsertStageSubject = z.infer<typeof insertStageSubjectSchema>;
export type StageSubject = typeof stageSubjectsTable.$inferSelect;