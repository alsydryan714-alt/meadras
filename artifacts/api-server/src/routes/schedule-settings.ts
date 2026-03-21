import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  if (!schoolId) { res.status(400).json({ error: "لا يوجد مدرسة" }); return; }

  const { rows } = await pool.query(
    `SELECT * FROM schedule_settings WHERE school_id = $1 LIMIT 1`,
    [schoolId]
  );

  if (rows.length === 0) {
    // Return defaults if not set yet
    res.json({
      startTime: "07:30",
      periodDuration: 45,
      breakAfterPeriod: 3,
      breakDuration: 20,
      prayerAfterPeriod: 6,
      prayerDuration: 15,
    });
    return;
  }

  const r = rows[0];
  res.json({
    startTime: r.start_time,
    periodDuration: r.period_duration,
    breakAfterPeriod: r.break_after_period,
    breakDuration: r.break_duration,
    prayerAfterPeriod: r.prayer_after_period,
    prayerDuration: r.prayer_duration,
  });
}));

router.put("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  if (!schoolId) { res.status(400).json({ error: "لا يوجد مدرسة" }); return; }

  const {
    startTime,
    periodDuration,
    breakAfterPeriod,
    breakDuration,
    prayerAfterPeriod,
    prayerDuration,
  } = req.body as {
    startTime: string;
    periodDuration: number;
    breakAfterPeriod: number | null;
    breakDuration: number;
    prayerAfterPeriod: number | null;
    prayerDuration: number;
  };

  await pool.query(
    `INSERT INTO schedule_settings (school_id, start_time, period_duration, break_after_period, break_duration, prayer_after_period, prayer_duration)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (school_id) DO UPDATE SET
       start_time = $2,
       period_duration = $3,
       break_after_period = $4,
       break_duration = $5,
       prayer_after_period = $6,
       prayer_duration = $7`,
    [schoolId, startTime, periodDuration, breakAfterPeriod ?? null, breakDuration, prayerAfterPeriod ?? null, prayerDuration]
  );

  res.json({ success: true });
}));

export default router;
