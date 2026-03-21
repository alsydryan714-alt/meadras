import { pgTable, serial, integer, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { stagesTable } from "./stages";

export const gradesTable = pgTable("grades", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => stagesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isLocked: boolean("is_locked").notNull().default(false),
});

export const insertGradeSchema = createInsertSchema(gradesTable).omit({ id: true });
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof gradesTable.$inferSelect;
