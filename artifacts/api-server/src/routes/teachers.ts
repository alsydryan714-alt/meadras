import { Router, type IRouter, type Request, type Response } from "express";
import { db, teachersTable, substitutionAssignmentsTable, timetableTable, classesTable, subjectsTable, blockedPeriodsTable } from "@workspace/db";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import {
  CreateTeacherBody,
  UpdateTeacherParams,
  UpdateTeacherBody,
  DeleteTeacherParams,
} from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const teachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const schoolFilter = schoolId ? eq(substitutionAssignmentsTable.schoolId, schoolId) : undefined;
  const counts = await db
    .select({
      substituteTeacherId: substitutionAssignmentsTable.substituteTeacherId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(substitutionAssignmentsTable)
    .where(
      and(
        schoolFilter,
        gte(substitutionAssignmentsTable.date, weekStartStr),
        lte(substitutionAssignmentsTable.date, weekEndStr)
      )
    )
    .groupBy(substitutionAssignmentsTable.substituteTeacherId);

  const countMap = new Map(counts.map((c) => [c.substituteTeacherId, c.count]));
  res.json(teachers.map((t) => ({ ...t, weeklySubstitutionCount: countMap.get(t.id) ?? 0 })));
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const body = CreateTeacherBody.parse(req.body);
  const [teacher] = await db
    .insert(teachersTable)
    .values({ ...body, schoolId: req.user!.schoolId })
    .returning();
  res.status(201).json({ ...teacher, weeklySubstitutionCount: 0 });
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = UpdateTeacherParams.parse(req.params);
  const body = UpdateTeacherBody.parse(req.body);
  const schoolId = req.user!.schoolId;
  const clause = schoolId
    ? and(eq(teachersTable.id, id), eq(teachersTable.schoolId, schoolId))
    : eq(teachersTable.id, id);
  const [teacher] = await db.update(teachersTable).set(body).where(clause).returning();
  if (!teacher) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  res.json({ ...teacher, weeklySubstitutionCount: 0 });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = DeleteTeacherParams.parse(req.params);
  const schoolId = req.user!.schoolId;
  const clause = schoolId
    ? and(eq(teachersTable.id, id), eq(teachersTable.schoolId, schoolId))
    : eq(teachersTable.id, id);
  await db.delete(teachersTable).where(clause);
  res.status(204).send();
}));

// Bulk import teachers (from Noor Excel)
router.post("/bulk-import", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { teachers: incoming, mode = "append" } = req.body as {
    teachers: { name: string; subject: string; maxWeeklyHours?: number }[];
    mode?: "append" | "replace";
  };

  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات للاستيراد" });
    return;
  }

  if (mode === "replace" && schoolId) {
    await db.delete(teachersTable).where(eq(teachersTable.schoolId, schoolId));
  }

  const rows = incoming
    .filter((t) => t.name?.trim() && t.subject?.trim())
    .map((t) => ({
      name: t.name.trim(),
      subject: t.subject.trim(),
      maxWeeklyHours: t.maxWeeklyHours ?? 24,
      schoolId,
    }));

  if (rows.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات صحيحة — تأكد من أعمدة الاسم والتخصص" });
    return;
  }

  const inserted = await db.insert(teachersTable).values(rows).returning();
  res.status(201).json({ imported: inserted.length, total: incoming.length });
}));

// Blocked periods CRUD
router.get("/:id/blocked-periods", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const blocked = await db.select().from(blockedPeriodsTable).where(eq(blockedPeriodsTable.teacherId, id));
  res.json(blocked);
}));

router.post("/:id/blocked-periods", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teacherId = parseInt(String(req.params.id), 10);
  const { dayOfWeek, period } = req.body as { dayOfWeek: number; period: number };
  const existing = await db
    .select()
    .from(blockedPeriodsTable)
    .where(
      and(
        eq(blockedPeriodsTable.teacherId, teacherId),
        eq(blockedPeriodsTable.dayOfWeek, dayOfWeek),
        eq(blockedPeriodsTable.period, period)
      )
    );
  if (existing.length > 0) { res.json(existing[0]); return; }
  const [bp] = await db.insert(blockedPeriodsTable).values({ teacherId, dayOfWeek, period }).returning();
  res.status(201).json(bp);
}));

router.delete("/:id/blocked-periods", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const teacherId = parseInt(String(req.params.id), 10);
  const { dayOfWeek, period } = req.body as { dayOfWeek: number; period: number };
  await db
    .delete(blockedPeriodsTable)
    .where(
      and(
        eq(blockedPeriodsTable.teacherId, teacherId),
        eq(blockedPeriodsTable.dayOfWeek, dayOfWeek),
        eq(blockedPeriodsTable.period, period)
      )
    );
  res.status(204).send();
}));

router.put("/:id/fields", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const { shortName, isSeconded, hideFromPrint } = req.body as {
    shortName?: string;
    isSeconded?: boolean;
    hideFromPrint?: boolean;
  };
  const schoolId = req.user!.schoolId;
  const clause = schoolId
    ? and(eq(teachersTable.id, id), eq(teachersTable.schoolId, schoolId))
    : eq(teachersTable.id, id);
  const [updated] = await db
    .update(teachersTable)
    .set({
      ...(shortName !== undefined && { shortName }),
      ...(isSeconded !== undefined && { isSeconded }),
      ...(hideFromPrint !== undefined && { hideFromPrint }),
    })
    .where(clause)
    .returning();
  res.json({ ...updated, weeklySubstitutionCount: 0 });
}));

// Public route — no auth needed (accessed via WhatsApp share link)
router.get("/schedule/:token", optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const token = String(req.params.token);
  const [teacher] = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.shareToken, token));
  if (!teacher) { res.status(404).json({ error: "المعلم غير موجود" }); return; }

  const entries = await db
    .select({
      id: timetableTable.id,
      dayOfWeek: timetableTable.dayOfWeek,
      period: timetableTable.period,
      teacherId: timetableTable.teacherId,
      classId: timetableTable.classId,
      subjectId: timetableTable.subjectId,
      className: classesTable.name,
      classSection: classesTable.code,
      subjectName: subjectsTable.name,
    })
    .from(timetableTable)
    .leftJoin(classesTable, eq(timetableTable.classId, classesTable.id))
    .leftJoin(subjectsTable, eq(timetableTable.subjectId, subjectsTable.id))
    .where(eq(timetableTable.teacherId, teacher.id));

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({ teacher, timetable: entries });
}));

export default router;
