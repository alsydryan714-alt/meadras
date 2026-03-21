import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const schoolEventsTable = pgTable("school_events", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schoolsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  endDate: text("end_date"),
  type: text("type").notNull().default("event"),
  description: text("description"),
  color: text("color").default("#0D9488"),
});

export const insertSchoolEventSchema = createInsertSchema(schoolEventsTable).omit({ id: true });
export type InsertSchoolEvent = z.infer<typeof insertSchoolEventSchema>;
export type SchoolEvent = typeof schoolEventsTable.$inferSelect;
