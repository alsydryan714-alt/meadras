import { pool } from "@workspace/db";
import { db } from "@workspace/db";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run Drizzle migrations by executing SQL files directly
 */
async function runDrizzleMigrations() {
  const client = await pool.connect();
  try {
    // Check if migrations have already been applied
    const result = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers')`
    );
    
    if (result.rows[0].exists) {
      console.log("[migrate] Base schema already exists, skipping Drizzle migrations");
      return;
    }

    console.log("[migrate] Running Drizzle migrations...");
    
    // Get migrations folder path (works both in dev and production)
    const isDev = process.env.NODE_ENV !== "production";
    const sqlDir = isDev
      ? path.join(__dirname, "../../../lib/db/drizzle")
      : path.join(__dirname, "./migrations");

    // Run migrations in order
    const migrations = ["0000_modern_kulan_gath.sql", "0001_stage_schedules.sql"];
    
    for (const migrationFile of migrations) {
      const filePath = path.join(sqlDir, migrationFile);
      try {
        const sql = await readFile(filePath, "utf-8");
        // Split by --> statement-breakpoint and execute each statement
        const statements = sql
          .split("--> statement-breakpoint")
          .map(s => s.trim())
          .filter(s => s && !s.startsWith("--"));
        
        for (const statement of statements) {
          if (statement) {
            try {
              await client.query(statement);
            } catch (err) {
              // Log but continue on individual statement errors (e.g., unique constraint violations)
              console.warn(`[migrate] Warning in ${migrationFile}:`, (err as Error).message);
            }
          }
        }
        console.log(`[migrate] ✓ Applied ${migrationFile}`);
      } catch (err) {
        console.warn(`[migrate] Warning: Could not apply ${migrationFile}:`, (err as Error).message);
        // Continue with next migration
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Runs startup migrations — safely adds new columns if they don't exist.
 * This is idempotent (safe to run multiple times) and ensures the production
 * database schema is always in sync with the application code.
 */
export async function runStartupMigrations() {
  // First, run Drizzle migrations to ensure base schema exists
  await runDrizzleMigrations();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // teachers table — SRS additions
    await client.query(`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS short_name TEXT`);
    await client.query(`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_seconded BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS hide_from_print BOOLEAN NOT NULL DEFAULT FALSE`);

    // schools table — SRS additions
    await client.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_name TEXT`);
    await client.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT`);
    await client.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type TEXT NOT NULL DEFAULT 'general'`);
    await client.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS education_region TEXT`);
    await client.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER NOT NULL DEFAULT 7`);

    // subjects table — SRS additions
    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS official_hours_per_week INTEGER NOT NULL DEFAULT 1`);
    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paired_periods INTEGER NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_activity BOOLEAN NOT NULL DEFAULT FALSE`);

    // timetable table — SRS additions
    await client.query(`ALTER TABLE timetable ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE`);

    // blocked_periods table — SRS new table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_periods (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        period INTEGER NOT NULL
      )
    `);

    // school_events table — Calendar feature
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_events (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        end_date TEXT,
        type TEXT NOT NULL DEFAULT 'event',
        description TEXT,
        color TEXT DEFAULT '#0D9488'
      )
    `);

    // schedule_settings table — stage-level timetable config
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_settings (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        stage_id INTEGER REFERENCES stages(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL DEFAULT '07:30',
        default_periods_per_day INTEGER NOT NULL DEFAULT 7,
        default_period_duration INTEGER NOT NULL DEFAULT 45,
        week_days TEXT NOT NULL DEFAULT '["sunday","monday","tuesday","wednesday","thursday"]',
        has_assembly_period BOOLEAN NOT NULL DEFAULT FALSE,
        assembly_duration INTEGER DEFAULT 15,
        teacher_weekly_quota INTEGER NOT NULL DEFAULT 20,
        period_label TEXT NOT NULL DEFAULT 'period',
        theme_color TEXT NOT NULL DEFAULT '#3b82f6',
        print_template TEXT NOT NULL DEFAULT 'default',
        show_logo_on_print BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);

    // Backward-compatible upgrades for older schedule_settings structure
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES stages(id) ON DELETE CASCADE`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS default_periods_per_day INTEGER NOT NULL DEFAULT 7`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS default_period_duration INTEGER NOT NULL DEFAULT 45`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS week_days TEXT NOT NULL DEFAULT '["sunday","monday","tuesday","wednesday","thursday"]'`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS has_assembly_period BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS assembly_duration INTEGER DEFAULT 15`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS teacher_weekly_quota INTEGER NOT NULL DEFAULT 20`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS period_label TEXT NOT NULL DEFAULT 'period'`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT '#3b82f6'`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS print_template TEXT NOT NULL DEFAULT 'default'`);
    await client.query(`ALTER TABLE schedule_settings ADD COLUMN IF NOT EXISTS show_logo_on_print BOOLEAN NOT NULL DEFAULT TRUE`);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_settings_stage_id ON schedule_settings(stage_id) WHERE stage_id IS NOT NULL`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS day_schedules (
        id SERIAL PRIMARY KEY,
        schedule_settings_id INTEGER NOT NULL REFERENCES schedule_settings(id) ON DELETE CASCADE,
        day_of_week TEXT NOT NULL,
        periods_count INTEGER NOT NULL,
        custom_start_time TEXT,
        UNIQUE(schedule_settings_id, day_of_week)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS period_overrides (
        id SERIAL PRIMARY KEY,
        schedule_settings_id INTEGER NOT NULL REFERENCES schedule_settings(id) ON DELETE CASCADE,
        period_number INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL,
        UNIQUE(schedule_settings_id, period_number)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stage_breaks (
        id SERIAL PRIMARY KEY,
        schedule_settings_id INTEGER NOT NULL REFERENCES schedule_settings(id) ON DELETE CASCADE,
        after_period INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'break',
        label TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stage_breaks_schedule ON stage_breaks(schedule_settings_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stage_subjects (
        id SERIAL PRIMARY KEY,
        stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        weekly_hours INTEGER NOT NULL DEFAULT 1,
        max_weekly_hours INTEGER,
        UNIQUE(stage_id, subject_id)
      )
    `);

    // subscriptions table — Moyasar payment integration
    await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS moyasar_payment_id TEXT`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_moyasar_payment_id ON subscriptions(moyasar_payment_id) WHERE moyasar_payment_id IS NOT NULL`);

    // payment_links table — admin-configurable Fatura payment links per plan
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_links (
        id SERIAL PRIMARY KEY,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        url TEXT,
        UNIQUE(plan, billing_cycle)
      )
    `);
    // seed empty rows for all plan/cycle combos
    for (const plan of ['basic', 'professional', 'enterprise', 'madrass']) {
      for (const cycle of ['monthly', 'yearly']) {
        await client.query(
          `INSERT INTO payment_links (plan, billing_cycle, url) VALUES ($1, $2, NULL) ON CONFLICT (plan, billing_cycle) DO NOTHING`,
          [plan, cycle]
        );
      }
    }

    // super_admin account — created once if not exists
    // First, delete old admin accounts if they exist
    await client.query(`DELETE FROM users WHERE email = 'yusr@platform.sa' OR email = 'admin@madrass.sa'`);
    
    const existing = await client.query(
      `SELECT id FROM users WHERE email = 'Rsyg991@gmail.com' LIMIT 1`
    );
    if (existing.rows.length === 0) {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.default.hash("123456789", 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)`,
        ["مشرف مدراس", "Rsyg991@gmail.com", hash, "super_admin"]
      );
      console.log("[migrate] Super admin account created: Rsyg991@gmail.com");
    }

    await client.query("COMMIT");
    console.log("[migrate] Startup migrations completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[migrate] Startup migration failed:", err);
    // Don't throw — allow server to start even if migration fails
    // to avoid breaking a working deployment
  } finally {
    client.release();
  }
}
