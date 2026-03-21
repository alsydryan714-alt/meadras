import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import jwt from "jsonwebtoken";
import { requireSuperAdmin } from "../middleware/auth";

const router: IRouter = Router();

const JWT_SECRET = process.env["JWT_SECRET"]!;
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "";
const MOYASAR_API = "https://api.moyasar.com/v1";

type PlanKey = "basic" | "professional" | "enterprise" | "madrass";
type BillingCycle = "monthly" | "yearly";

const VALID_PLANS: PlanKey[] = ["basic", "professional", "enterprise", "madrass"];
const VALID_CYCLES: BillingCycle[] = ["monthly", "yearly"];

const PLANS: Record<PlanKey, { name: string; price: number; priceYearly: number }> = {
  basic:        { name: "أساسي",       price: 49,  priceYearly: 149  },
  professional: { name: "احترافي",     price: 99,  priceYearly: 299  },
  enterprise:   { name: "مؤسسي",       price: 199, priceYearly: 599  },
  madrass:      { name: "مدراس",       price: 69,  priceYearly: 219  },
};

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
function isPlanKey(val: unknown): val is PlanKey {
  return typeof val === "string" && VALID_PLANS.indexOf(val as PlanKey) !== -1;
}

function isBillingCycle(val: unknown): val is BillingCycle {
  return typeof val === "string" && VALID_CYCLES.indexOf(val as BillingCycle) !== -1;
}

function getUserFromToken(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

function moyasarAuth(): string {
  return "Basic " + Buffer.from(MOYASAR_SECRET_KEY + ":").toString("base64");
}

function getArabicStatus(status: string): string {
  const statuses: Record<string, string> = {
    initiated:  "تم بدء عملية الدفع",
    paid:       "تم الدفع بنجاح",
    failed:     "فشلت عملية الدفع. يرجى المحاولة مرة أخرى",
    authorized: "تم تفويض الدفع",
    captured:   "تم الدفع بنجاح",
    refunded:   "تم استرداد المبلغ",
    voided:     "تم إلغاء عملية الدفع",
    verified:   "تم التحقق من الدفع",
  };
  return statuses[status] || "حالة غير معروفة";
}

// ── GET /api/payment/plans ────────────────────────────────────────────────────
router.get("/plans", (_req: Request, res: Response) => {
  res.json(Object.entries(PLANS).map(([key, p]) => ({
    key,
    name: p.name,
    price: p.price,
    priceYearly: p.priceYearly,
  })));
});

// ── GET /api/payment/link?plan=X&billing=Y ────────────────────────────────────
// Returns the pre-configured Fatura payment link for a given plan/cycle.
router.get("/link", async (req: Request, res: Response) => {
  const plan = firstQueryValue(req.query.plan as string | string[] | undefined);
  const billing = firstQueryValue(req.query.billing as string | string[] | undefined);

  if (!isPlanKey(plan) || !isBillingCycle(billing)) {
    res.status(400).json({ error: "خطة أو دورة فوترة غير صالحة" });
    return;
  }
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT url FROM payment_links WHERE plan = $1 AND billing_cycle = $2 LIMIT 1`,
        [plan, billing]
      );
      const url = result.rows[0]?.url || null;
      res.json({ url });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("payment/link error:", err);
    res.status(500).json({ error: "خطأ في جلب رابط الدفع" });
  }
});

// ── GET /api/payment/links (super admin) ──────────────────────────────────────
router.get("/links", requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT plan, billing_cycle, url FROM payment_links ORDER BY plan, billing_cycle`
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("GET payment/links error:", err);
    res.status(500).json({ error: "خطأ في جلب روابط الدفع" });
  }
});

// ── PUT /api/payment/links (super admin) ──────────────────────────────────────
router.put("/links", requireSuperAdmin, async (req: Request, res: Response) => {
  const links: { plan: string; billing_cycle: string; url: string | null }[] = req.body;
  if (!Array.isArray(links)) {
    res.status(400).json({ error: "البيانات يجب أن تكون مصفوفة" });
    return;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const link of links) {
        if (!isPlanKey(link.plan) || !isBillingCycle(link.billing_cycle)) continue;
        const cleanUrl = link.url && link.url.trim() ? link.url.trim() : null;
        await client.query(
          `INSERT INTO payment_links (plan, billing_cycle, url)
           VALUES ($1, $2, $3)
           ON CONFLICT (plan, billing_cycle) DO UPDATE SET url = EXCLUDED.url`,
          [link.plan, link.billing_cycle, cleanUrl]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("PUT payment/links error:", err);
    res.status(500).json({ error: "خطأ في حفظ روابط الدفع" });
  }
});

// ── GET /api/payment/verify/:id ───────────────────────────────────────────────
// Verifies a Moyasar payment and activates the subscription for the logged-in user.
// Works with manually-created Fatura links (no user_id in metadata).
router.get("/verify/:id", async (req: Request, res: Response) => {
  const userId = getUserFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }

  if (!MOYASAR_SECRET_KEY) {
    res.status(500).json({ error: "بوابة الدفع غير مُعدَّة بعد" });
    return;
  }

  const paymentId = String(req.params.id);

  try {
    // Idempotency: already processed this payment
    const [existing] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.moyasarPaymentId, paymentId));

    if (existing) {
      if (existing.userId !== userId) {
        res.status(403).json({ error: "عملية الدفع لا تخص هذا الحساب" });
        return;
      }
      res.json({
        success: true,
        status: "paid",
        message: `تم الاشتراك بنجاح في خطة ${PLANS[existing.plan as PlanKey]?.name || existing.plan}`,
        subscription: existing,
      });
      return;
    }

    // Fetch payment from Moyasar
    const moyasarRes = await fetch(`${MOYASAR_API}/payments/${paymentId}`, {
      headers: { Authorization: moyasarAuth() },
    });
    const payment = await moyasarRes.json() as any;

    if (!moyasarRes.ok) {
      console.error("Moyasar verify error:", JSON.stringify(payment));
      res.status(502).json({ error: "فشل في التحقق من الدفع" });
      return;
    }

    if (payment.status !== "paid") {
      res.json({
        success: false,
        status: payment.status,
        message: getArabicStatus(payment.status),
      });
      return;
    }

    if (payment.currency !== "SAR") {
      res.status(400).json({ error: "عملة الدفع غير صحيحة" });
      return;
    }

    // Determine plan from metadata (if available) or amount matching
    const metadata = payment.metadata || {};
    let planValue: PlanKey | null = isPlanKey(metadata.plan) ? metadata.plan : null;
    let cycleValue: BillingCycle = isBillingCycle(metadata.billing_cycle) ? metadata.billing_cycle : "monthly";

    // If no metadata, infer plan from amount
    if (!planValue) {
      const amountRiyalRaw = Math.round(payment.amount / 100);
      for (const [key, p] of Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]) {
        if (amountRiyalRaw === p.price) { planValue = key; cycleValue = "monthly"; break; }
        if (amountRiyalRaw === p.priceYearly) { planValue = key; cycleValue = "yearly"; break; }
      }
    }

    if (!planValue) {
      res.status(400).json({ error: "تعذّر تحديد خطة الاشتراك من قيمة الدفع" });
      return;
    }

    const expectedPlan = PLANS[planValue];
    const expectedAmount = (cycleValue === "yearly" ? expectedPlan.priceYearly : expectedPlan.price) * 100;
    if (payment.amount < expectedAmount) {
      res.status(400).json({ error: "مبلغ الدفع لا يتطابق مع الخطة" });
      return;
    }

    const amountRiyal = Math.round(payment.amount / 100);
    const cardLast4 = payment.source?.number?.slice(-4) || null;

    const expiresAt = new Date();
    if (cycleValue === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await db.transaction(async (tx) => {
      await tx.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
      await tx.insert(subscriptionsTable).values({
        userId,
        plan: planValue!,
        status: "active",
        amount: amountRiyal,
        cardLast4,
        moyasarPaymentId: paymentId,
        expiresAt,
        isActive: true,
      });
    });

    const [subscription] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.moyasarPaymentId, paymentId));

    res.json({
      success: true,
      status: "paid",
      message: `تم الاشتراك بنجاح في خطة ${expectedPlan.name}`,
      subscription,
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "خطأ في التحقق من الدفع" });
  }
});

// ── GET /api/payment/subscription ────────────────────────────────────────────
router.get("/subscription", async (req: Request, res: Response) => {
  const userId = getUserFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  const [subscription] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));
  res.json(subscription || null);
});

export default router;
