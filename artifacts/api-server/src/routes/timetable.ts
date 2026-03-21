import { Router, type IRouter, type Request, type Response } from "express";
import { db, timetableTable, teachersTable, classesTable, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateTimetableSlotBody,
  UpdateTimetableSlotParams,
  UpdateTimetableSlotBody,
  DeleteTimetableSlotParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const slots = await db
    .select({
      id: timetableTable.id,
      dayOfWeek: timetableTable.dayOfWeek,
      period: timetableTable.period,
      teacherId: timetableTable.teacherId,
      classId: timetableTable.classId,
      subjectId: timetableTable.subjectId,
      teacherName: teachersTable.name,
      className: classesTable.name,
      classSection: classesTable.code,
      subjectName: subjectsTable.name,
    })
    .from(timetableTable)
    .leftJoin(teachersTable, eq(timetableTable.teacherId, teachersTable.id))
    .leftJoin(classesTable, eq(timetableTable.classId, classesTable.id))
    .leftJoin(subjectsTable, eq(timetableTable.subjectId, subjectsTable.id))
    .where(schoolId ? eq(timetableTable.schoolId, schoolId) : undefined);

  const result = slots.map((s) => ({
    ...s,
    teacherName: s.teacherName ?? "",
    className: s.className && s.classSection ? `${s.className} ${s.classSection}` : (s.className ?? ""),
    subjectName: s.subjectName ?? "",
  }));

  res.json(result);
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const body = CreateTimetableSlotBody.parse(req.body);

  // Check for teacher conflict
  const conflict = await db
    .select()
    .from(timetableTable)
    .where(
      and(
        eq(timetableTable.teacherId, body.teacherId),
        eq(timetableTable.dayOfWeek, body.dayOfWeek),
        eq(timetableTable.period, body.period)
      )
    );

  if (conflict.length > 0) {
    res.status(409).json({ error: "Teacher already has a class at this time slot" });
    return;
  }

  const [slot] = await db.insert(timetableTable).values({ ...body, schoolId: req.user!.schoolId }).returning();

  const [full] = await db
    .select({
      id: timetableTable.id,
      dayOfWeek: timetableTable.dayOfWeek,
      period: timetableTable.period,
      teacherId: timetableTable.teacherId,
      classId: timetableTable.classId,
      subjectId: timetableTable.subjectId,
      teacherName: teachersTable.name,
      className: classesTable.name,
      classSection: classesTable.code,
      subjectName: subjectsTable.name,
    })
    .from(timetableTable)
    .leftJoin(teachersTable, eq(timetableTable.teacherId, teachersTable.id))
    .leftJoin(classesTable, eq(timetableTable.classId, classesTable.id))
    .leftJoin(subjectsTable, eq(timetableTable.subjectId, subjectsTable.id))
    .where(eq(timetableTable.id, slot.id));

  res.status(201).json({
    ...full,
    teacherName: full?.teacherName ?? "",
    className: full?.className && full?.classSection ? `${full.className} ${full.classSection}` : (full?.className ?? ""),
    subjectName: full?.subjectName ?? "",
  });
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = UpdateTimetableSlotParams.parse(req.params);
  const body = UpdateTimetableSlotBody.parse(req.body);

  // Check for teacher conflict (excluding self)
  const conflict = await db
    .select()
    .from(timetableTable)
    .where(
      and(
        eq(timetableTable.teacherId, body.teacherId),
        eq(timetableTable.dayOfWeek, body.dayOfWeek),
        eq(timetableTable.period, body.period)
      )
    );

  if (conflict.length > 0 && conflict[0].id !== id) {
    res.status(409).json({ error: "Teacher already has a class at this time slot" });
    return;
  }

  await db.update(timetableTable).set(body).where(eq(timetableTable.id, id));

  const [full] = await db
    .select({
      id: timetableTable.id,
      dayOfWeek: timetableTable.dayOfWeek,
      period: timetableTable.period,
      teacherId: timetableTable.teacherId,
      classId: timetableTable.classId,
      subjectId: timetableTable.subjectId,
      teacherName: teachersTable.name,
      className: classesTable.name,
      classSection: classesTable.code,
      subjectName: subjectsTable.name,
    })
    .from(timetableTable)
    .leftJoin(teachersTable, eq(timetableTable.teacherId, teachersTable.id))
    .leftJoin(classesTable, eq(timetableTable.classId, classesTable.id))
    .leftJoin(subjectsTable, eq(timetableTable.subjectId, subjectsTable.id))
    .where(eq(timetableTable.id, id));

  if (!full) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.json({
    ...full,
    teacherName: full.teacherName ?? "",
    className: full.className && full.classSection ? `${full.className} ${full.classSection}` : (full.className ?? ""),
    subjectName: full.subjectName ?? "",
  });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = DeleteTimetableSlotParams.parse(req.params);
  const schoolId = req.user!.schoolId;
  const clause = schoolId ? and(eq(timetableTable.id, id), eq(timetableTable.schoolId, schoolId)) : eq(timetableTable.id, id);
  await db.delete(timetableTable).where(clause);
  res.status(204).send();
}));

router.put("/:id/lock", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { isLocked } = req.body as { isLocked: boolean };
  const [updated] = await db.update(timetableTable)
    .set({ isLocked })
    .where(eq(timetableTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "الحصة غير موجودة" }); return; }
  res.json({ ...updated, isLocked: updated.isLocked });
}));

router.post("/auto-generate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const teachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);
  const classes = schoolId
    ? await db.select().from(classesTable).where(eq(classesTable.schoolId, schoolId))
    : await db.select().from(classesTable);
  const subjects = schoolId
    ? await db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId))
    : await db.select().from(subjectsTable);

  if (teachers.length === 0 || classes.length === 0 || subjects.length === 0) {
    res.status(400).json({ error: "يجب إضافة معلمين وفصول ومواد أولاً" });
    return;
  }

  // Delete only this school's timetable
  await db.delete(timetableTable).where(schoolId ? eq(timetableTable.schoolId, schoolId) : undefined);

  const DAYS = [0, 1, 2, 3, 4];
  const PERIODS = [1, 2, 3, 4, 5, 6, 7];

  // Match each teacher to a subject by name similarity
  function matchTeacherSubject(teacherSubject: string): number {
    const lower = teacherSubject.toLowerCase();
    const exact = subjects.find(s => s.name.toLowerCase() === lower || lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower));
    if (exact) return exact.id;
    return subjects[Math.floor(Math.random() * subjects.length)].id;
  }

  // Build teacher -> subject mapping
  const teacherSubjectMap = new Map(teachers.map(t => [t.id, matchTeacherSubject(t.subject)]));

  // Track teacher busy slots: teacher -> Set<"day-period">
  const busy: Map<number, Set<string>> = new Map(teachers.map(t => [t.id, new Set()]));
  const hoursUsed: Map<number, number> = new Map(teachers.map(t => [t.id, 0]));

  const slotsToInsert: { teacherId: number; classId: number; subjectId: number; dayOfWeek: number; period: number; schoolId: number | null }[] = [];

  for (const cls of classes) {
    for (const day of DAYS) {
      for (const period of PERIODS) {
        const timeKey = `${day}-${period}`;
        const available = teachers
          .filter(t => !busy.get(t.id)!.has(timeKey) && (hoursUsed.get(t.id) || 0) < t.maxWeeklyHours)
          .sort((a, b) => (hoursUsed.get(a.id) || 0) - (hoursUsed.get(b.id) || 0));

        if (available.length === 0) continue;

        const teacher = available[0];
        const subjectId = teacherSubjectMap.get(teacher.id) ?? subjects[0].id;

        slotsToInsert.push({ teacherId: teacher.id, classId: cls.id, subjectId, dayOfWeek: day, period, schoolId });
        busy.get(teacher.id)!.add(timeKey);
        hoursUsed.set(teacher.id, (hoursUsed.get(teacher.id) || 0) + 1);
      }
    }
  }

  if (slotsToInsert.length > 0) {
    await db.insert(timetableTable).values(slotsToInsert);
  }

  res.json({ success: true, count: slotsToInsert.length, message: `تم توليد ${slotsToInsert.length} حصة بنجاح بدون تعارضات` });
}));

export default router;
