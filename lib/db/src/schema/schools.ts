import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolsTable = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  type: text("type").notNull().default("mixed"),
  isActive: boolean("is_active").notNull().default(true),
  principalName: text("principal_name"),
  logoUrl: text("logo_url"),
  schoolType: text("school_type").default("general"),
  educationRegion: text("education_region"),
  setupComplete: boolean("setup_complete").notNull().default(false),
  maxPeriodsPerDay: integer("max_periods_per_day").notNull().default(7),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;
