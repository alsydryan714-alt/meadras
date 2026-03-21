DROP TABLE IF EXISTS "schedule_settings" CASCADE;

CREATE TABLE "schedule_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "school_id" integer NOT NULL,
  "stage_id" integer NOT NULL,
  "start_time" text DEFAULT '07:30' NOT NULL,
  "default_periods_per_day" integer DEFAULT 7 NOT NULL,
  "default_period_duration" integer DEFAULT 45 NOT NULL,
  "week_days" text DEFAULT '["sunday","monday","tuesday","wednesday","thursday"]' NOT NULL,
  "has_assembly_period" boolean DEFAULT false NOT NULL,
  "assembly_duration" integer DEFAULT 15,
  "teacher_weekly_quota" integer DEFAULT 20 NOT NULL,
  "period_label" text DEFAULT 'period' NOT NULL,
  "theme_color" text DEFAULT '#3b82f6' NOT NULL,
  "print_template" text DEFAULT 'default' NOT NULL,
  "show_logo_on_print" boolean DEFAULT true NOT NULL,
  CONSTRAINT "uq_schedule_settings_stage_id" UNIQUE("stage_id")
);
--> statement-breakpoint
CREATE TABLE "day_schedules" (
  "id" serial PRIMARY KEY NOT NULL,
  "schedule_settings_id" integer NOT NULL,
  "day_of_week" text NOT NULL,
  "periods_count" integer NOT NULL,
  "custom_start_time" text,
  CONSTRAINT "uq_day_schedules_settings_day" UNIQUE("schedule_settings_id", "day_of_week")
);
--> statement-breakpoint
CREATE TABLE "period_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "schedule_settings_id" integer NOT NULL,
  "period_number" integer NOT NULL,
  "duration_minutes" integer NOT NULL,
  CONSTRAINT "uq_period_overrides_settings_period" UNIQUE("schedule_settings_id", "period_number")
);
--> statement-breakpoint
CREATE TABLE "stage_breaks" (
  "id" serial PRIMARY KEY NOT NULL,
  "schedule_settings_id" integer NOT NULL,
  "after_period" integer NOT NULL,
  "duration_minutes" integer NOT NULL,
  "type" text DEFAULT 'break' NOT NULL,
  "label" text,
  "sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_stage_breaks_schedule" ON "stage_breaks" USING btree ("schedule_settings_id");
--> statement-breakpoint
CREATE TABLE "stage_subjects" (
  "id" serial PRIMARY KEY NOT NULL,
  "stage_id" integer NOT NULL,
  "subject_id" integer NOT NULL,
  "weekly_hours" integer DEFAULT 1 NOT NULL,
  "max_weekly_hours" integer,
  CONSTRAINT "uq_stage_subjects_stage_subject" UNIQUE("stage_id", "subject_id")
);
--> statement-breakpoint
ALTER TABLE "schedule_settings" ADD CONSTRAINT "schedule_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "schedule_settings" ADD CONSTRAINT "schedule_settings_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "day_schedules" ADD CONSTRAINT "day_schedules_schedule_settings_id_schedule_settings_id_fk" FOREIGN KEY ("schedule_settings_id") REFERENCES "public"."schedule_settings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "period_overrides" ADD CONSTRAINT "period_overrides_schedule_settings_id_schedule_settings_id_fk" FOREIGN KEY ("schedule_settings_id") REFERENCES "public"."schedule_settings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stage_breaks" ADD CONSTRAINT "stage_breaks_schedule_settings_id_schedule_settings_id_fk" FOREIGN KEY ("schedule_settings_id") REFERENCES "public"."schedule_settings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stage_subjects" ADD CONSTRAINT "stage_subjects_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stage_subjects" ADD CONSTRAINT "stage_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;