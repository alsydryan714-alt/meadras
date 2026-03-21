import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, schoolsTable, subscriptionsTable, type Subscription } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

async function checkAndExpireTrial(subscription: Subscription | null): Promise<Subscription | null> {
  if (
    subscription &&
    subscription.status === "trial" &&
    subscription.isActive &&
    subscription.expiresAt &&
    new Date(subscription.expiresAt) < new Date()
  ) {
    await db.update(subscriptionsTable)
      .set({ isActive: false })
      .where(eq(subscriptionsTable.id, subscription.id));
    return { ...subscription, isActive: false };
  }
  return subscription;
}

const router: IRouter = Router();

// JWT_SECRET must be set via environment variable — no insecure fallback
const JWT_SECRET = process.env["JWT_SECRET"]!;

const RegisterBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  schoolId: z.number().int().positive().optional(),
  schoolName: z.string().min(2).optional(),
  role: z.enum(["school_admin", "teacher"]).default("school_admin"),
}).refine(d => d.schoolId || d.schoolName, {
  message: "يرجى اختيار مدرسة أو كتابة اسم مدرستك",
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = RegisterBody.parse(req.body);

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email));
    if (existing.length > 0) {
      res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      return;
    }

    let resolvedSchoolId: number;
    let resolvedSchoolName: string;

    if (body.schoolId) {
      const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, body.schoolId));
      if (!school) {
        res.status(404).json({ error: "المدرسة غير موجودة" });
        return;
      }
      resolvedSchoolId = school.id;
      resolvedSchoolName = school.name;
    } else {
      const trimmedName = body.schoolName!.trim();
      const existing = await db.select().from(schoolsTable)
        .where(eq(schoolsTable.name, trimmedName));
      if (existing.length > 0) {
        resolvedSchoolId = existing[0].id;
        resolvedSchoolName = existing[0].name;
      } else {
        const [newSchool] = await db.insert(schoolsTable).values({
          name: trimmedName,
          city: "",
          region: "",
        }).returning();
        resolvedSchoolId = newSchool.id;
        resolvedSchoolName = newSchool.name;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const { user, trialSub } = await db.transaction(async (tx) => {
      const [user] = await tx.insert(usersTable).values({
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        schoolId: resolvedSchoolId,
      }).returning();

      const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [trialSub] = await tx.insert(subscriptionsTable).values({
        userId: user.id,
        plan: "madrass",
        status: "trial",
        amount: 0,
        expiresAt: trialExpiresAt,
        isActive: true,
      }).returning();

      return { user, trialSub };
    });

    const token = jwt.sign({ userId: user.id, role: user.role, schoolId: user.schoolId }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: resolvedSchoolName,
        subscription: trialSub as any,
      }
    });
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err, "خطأ في التسجيل") });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = LoginBody.parse(req.body);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email));
    if (!user) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }

    let schoolName = "";
    if (user.schoolId) {
      const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
      schoolName = school?.name || "";
    }

    const subs = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id))
      .orderBy(desc(subscriptionsTable.isActive), desc(subscriptionsTable.startedAt));
    let subscription: any = subs.find(s => s.status !== "trial" && s.isActive)
      ?? subs[0] ?? null;
    subscription = await checkAndExpireTrial(subscription);

    const token = jwt.sign({ userId: user.id, role: user.role, schoolId: user.schoolId }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolName,
        subscription: (subscription || null) as any,
      }
    });
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err, "خطأ في تسجيل الدخول") });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "غير مصرح" });
      return;
    }
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    let schoolName = "";
    if (user.schoolId) {
      const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
      schoolName = school?.name || "";
    }

    const subs = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id))
      .orderBy(desc(subscriptionsTable.isActive), desc(subscriptionsTable.startedAt));
    let subscription: any = subs.find(s => s.status !== "trial" && s.isActive)
      ?? subs[0] ?? null;
    subscription = await checkAndExpireTrial(subscription);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      schoolName,
      subscription: (subscription || null) as any,
    });
  } catch {
    res.status(401).json({ error: "رمز غير صالح" });
  }
});

export default router;
