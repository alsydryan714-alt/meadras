import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, schoolsTable, subscriptionsTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { eq, desc, count, sql, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

// Super admin guard
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "هذا المسار للمشرف العام فقط" });
    return;
  }
  next();
}

// ── GET /api/admin/stats ─────────────────────────────────────────
router.get("/stats", requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
  const [schoolsRes, activeRes, trialRes, expiredRes, revenueRes] = await Promise.all([
    db.select({ count: count() }).from(schoolsTable),
    pool.query(`
      SELECT COUNT(DISTINCT s.id) FROM schools s
      JOIN users u ON u.school_id = s.id
      JOIN subscriptions sub ON sub.user_id = u.id
      WHERE sub.status = 'active' AND sub.is_active = true
    `),
    pool.query(`
      SELECT COUNT(DISTINCT s.id) FROM schools s
      JOIN users u ON u.school_id = s.id
      JOIN subscriptions sub ON sub.user_id = u.id
      WHERE sub.status = 'trial' AND sub.is_active = true
    `),
    pool.query(`
      SELECT COUNT(DISTINCT s.id) FROM schools s
      JOIN users u ON u.school_id = s.id
      JOIN subscriptions sub ON sub.user_id = u.id
      WHERE sub.is_active = false
    `),
    pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM subscriptions WHERE is_active = true`),
  ]);

  res.json({
    totalSchools: Number(schoolsRes[0]?.count ?? 0),
    activeSchools: Number(activeRes.rows[0]?.count ?? 0),
    trialSchools: Number(trialRes.rows[0]?.count ?? 0),
    expiredSchools: Number(expiredRes.rows[0]?.count ?? 0),
    totalRevenue: Number(revenueRes.rows[0]?.total ?? 0),
  });
});

// ── GET /api/admin/schools ───────────────────────────────────────
router.get("/schools", requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (s.id)
      s.id,
      s.name,
      s.city,
      s.is_active,
      s.setup_complete,
      u.email,
      u.name as admin_name,
      sub.plan,
      sub.status as sub_status,
      sub.is_active as sub_active,
      sub.amount,
      sub.expires_at,
      sub.started_at
    FROM schools s
    LEFT JOIN users u ON u.school_id = s.id AND u.role = 'school_admin'
    LEFT JOIN subscriptions sub ON sub.user_id = u.id
    ORDER BY s.id DESC, sub.started_at DESC
  `);
  res.json(rows);
});

// ── PUT /api/admin/schools/:id/status ───────────────────────────
router.put("/schools/:id/status", requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { isActive } = req.body as { isActive: boolean };
  await db.update(schoolsTable).set({ isActive }).where(eq(schoolsTable.id, id));
  res.json({ success: true });
}));

// ── DELETE /api/admin/schools/:id ───────────────────────────────
router.delete("/schools/:id", requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  // Delete subscriptions first (no CASCADE on user_id FK), then school (cascades users)
  await pool.query(`
    DELETE FROM subscriptions WHERE user_id IN (
      SELECT id FROM users WHERE school_id = $1
    )
  `, [id]);
  await pool.query(`DELETE FROM schools WHERE id = $1`, [id]);
  res.json({ success: true });
}));

// ── POST /api/admin/schools ──────────────────────────────────────
router.post("/schools", requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, email, plan } = req.body as { name: string; email: string; plan: string };
  if (!name || !email) { res.status(400).json({ error: "الاسم والبريد مطلوبان" }); return; }

  const [school] = await db.insert(schoolsTable).values({ name, city: "", region: "" }).returning();

  const passwordHash = await bcrypt.hash("123456", 10);
  const [user] = await db.insert(usersTable).values({
    name: "مدير المدرسة",
    email,
    passwordHash,
    role: "school_admin",
    schoolId: school.id,
  }).returning();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await db.insert(subscriptionsTable).values({
    userId: user.id,
    plan: plan || "basic",
    status: "trial",
    amount: 0,
    expiresAt,
    isActive: true,
  });

  res.status(201).json({ school, user: { id: user.id, email: user.email } });
}));

// ── PUT /api/admin/schools/:id/subscription ─────────────────────
// Activate / modify subscription for a school
router.put("/schools/:id/subscription", requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = parseInt(req.params.id as string);
  const { plan, billing, daysFromNow, amount } = req.body as {
    plan: string;
    billing?: "monthly" | "yearly";
    daysFromNow?: number;
    amount?: number;
  };

  // Find the school admin user
  const userRes = await pool.query(
    `SELECT id FROM users WHERE school_id = $1 AND role = 'school_admin' LIMIT 1`,
    [schoolId]
  );
  if (userRes.rows.length === 0) {
    res.status(404).json({ error: "لم يتم العثور على مدير المدرسة" });
    return;
  }
  const userId = userRes.rows[0].id;

  const days = daysFromNow ?? (billing === "yearly" ? 365 : 30);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  await pool.query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);
  await pool.query(`
    INSERT INTO subscriptions (user_id, plan, status, amount, expires_at, is_active)
    VALUES ($1, $2, 'active', $3, $4, true)
  `, [userId, plan || "madrass", amount ?? 69, expiresAt]);

  res.json({ success: true, expiresAt });
}));

// ── POST /api/admin/schools/:id/trial ────────────────────────────
// Activate or extend free trial
router.post("/schools/:id/trial", requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = parseInt(req.params.id as string);
  const { days } = req.body as { days: number };
  const trialDays = Math.max(1, Math.min(days ?? 7, 365));

  const userRes = await pool.query(
    `SELECT id FROM users WHERE school_id = $1 AND role = 'school_admin' LIMIT 1`,
    [schoolId]
  );
  if (userRes.rows.length === 0) {
    res.status(404).json({ error: "لم يتم العثور على مدير المدرسة" });
    return;
  }
  const userId = userRes.rows[0].id;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + trialDays);

  await pool.query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);
  await pool.query(`
    INSERT INTO subscriptions (user_id, plan, status, amount, expires_at, is_active)
    VALUES ($1, 'madrass', 'trial', 0, $2, true)
  `, [userId, expiresAt]);

  res.json({ success: true, expiresAt, days: trialDays });
}));

// ── DELETE /api/admin/schools/:id/subscription ───────────────────
// Cancel / deactivate subscription
router.delete("/schools/:id/subscription", requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = parseInt(req.params.id as string);

  const userRes = await pool.query(
    `SELECT id FROM users WHERE school_id = $1 AND role = 'school_admin' LIMIT 1`,
    [schoolId]
  );
  if (userRes.rows.length === 0) {
    res.status(404).json({ error: "لم يتم العثور على مدير المدرسة" });
    return;
  }
  const userId = userRes.rows[0].id;

  await pool.query(
    `UPDATE subscriptions SET is_active = false WHERE user_id = $1`,
    [userId]
  );

  res.json({ success: true });
}));

// ── GET /api/admin/payments ──────────────────────────────────────
router.get("/payments", requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`
    SELECT
      sub.id,
      s.name as school,
      sub.plan,
      sub.amount,
      sub.status,
      sub.started_at as date
    FROM subscriptions sub
    JOIN users u ON u.id = sub.user_id
    JOIN schools s ON s.id = u.school_id
    WHERE sub.amount > 0
    ORDER BY sub.started_at DESC
    LIMIT 50
  `);
  res.json(rows);
});

export default router;
