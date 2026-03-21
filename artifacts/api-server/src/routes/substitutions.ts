import { Router, type IRouter, type Request, type Response } from "express";
import { db, substitutionAssignmentsTable, timetableTable, teachersTable, classesTable, subjectsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray, sql, notInArray } from "drizzle-orm";
import {
  GetSubstitutionsQueryParams,
  SaveSubstitutionsBody,
  RecommendSubstitutionsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    weekStartStr: weekStart.toISOString().split("T")[0],
    weekEndStr: weekEnd.toISOString().split("T")[0],
  };
}

router.get("/weekly-counts", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { weekStartStr, weekEndStr } = getWeekRange();

  const counts = await db
    .select({
      substituteTeacherId: substitutionAssignmentsTable.substituteTeacherId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(substitutionAssignmentsTable)
    .where(
      and(
        schoolId ? eq(substitutionAssignmentsTable.schoolId, schoolId) : undefined,
        gte(substitutionAssignmentsTable.date, weekStartStr),
        lte(substitutionAssignmentsTable.date, weekEndStr)
      )
    )
    .groupBy(substitutionAssignmentsTable.substituteTeacherId);

  const teachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);

  const result = teachers.map((t) => {
    const countRecord = counts.find((c) => c.substituteTeacherId === t.id);
    return {
      teacherId: t.id,
      teacherName: t.name,
      count: countRecord?.count ?? 0,
    };
  });

  res.json(result);
}));

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { date } = GetSubstitutionsQueryParams.parse(req.query);

  const assignments = await db
    .select({
      id: substitutionAssignmentsTable.id,
      date: substitutionAssignmentsTable.date,
      absentTeacherId: substitutionAssignmentsTable.absentTeacherId,
      substituteTeacherId: substitutionAssignmentsTable.substituteTeacherId,
      timetableSlotId: substitutionAssignmentsTable.timetableSlotId,
      period: timetableTable.period,
      dayOfWeek: timetableTable.dayOfWeek,
    })
    .from(substitutionAssignmentsTable)
    .leftJoin(timetableTable, eq(substitutionAssignmentsTable.timetableSlotId, timetableTable.id))
    .where(and(
      eq(substitutionAssignmentsTable.date, date),
      schoolId ? eq(substitutionAssignmentsTable.schoolId, schoolId) : undefined
    ));

  const allTeachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);
  const allClasses = schoolId
    ? await db.select().from(classesTable).where(eq(classesTable.schoolId, schoolId))
    : await db.select().from(classesTable);
  const allSubjects = schoolId
    ? await db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId))
    : await db.select().from(subjectsTable);
  const allSlots = schoolId
    ? await db.select().from(timetableTable).where(eq(timetableTable.schoolId, schoolId))
    : await db.select().from(timetableTable);

  const teacherMap = new Map(allTeachers.map((t) => [t.id, t]));
  const classMap = new Map(allClasses.map((c) => [c.id, c]));
  const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
  const slotMap = new Map(allSlots.map((s) => [s.id, s]));

  // Find absent teacher IDs from current assignments
  const absentTeacherIds = [...new Set(assignments.map((a) => a.absentTeacherId))];

  const enrichedAssignments = assignments.map((a) => {
    const slot = slotMap.get(a.timetableSlotId);
    const cls = slot ? classMap.get(slot.classId) : undefined;
    const subject = slot ? subjectMap.get(slot.subjectId) : undefined;
    const absentTeacher = teacherMap.get(a.absentTeacherId);
    const substituteTeacher = teacherMap.get(a.substituteTeacherId);

    return {
      id: a.id,
      date: a.date,
      absentTeacherId: a.absentTeacherId,
      substituteTeacherId: a.substituteTeacherId,
      timetableSlotId: a.timetableSlotId,
      absentTeacherName: absentTeacher?.name ?? "",
      substituteTeacherName: substituteTeacher?.name ?? "",
      className: cls ? `${cls.name} ${cls.code}` : "",
      subjectName: subject?.name ?? "",
      period: a.period ?? 0,
      dayOfWeek: a.dayOfWeek ?? 0,
    };
  });

  res.json({
    date,
    absentTeacherIds,
    assignments: enrichedAssignments,
  });
}));

router.post("/recommend", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { date, absentTeacherIds } = RecommendSubstitutionsBody.parse(req.body);

  if (absentTeacherIds.length === 0) {
    res.json([]);
    return;
  }

  const dayOfWeek = new Date(date).getDay();

  // Get all slots for absent teachers on this day
  const affectedSlots = await db
    .select({
      id: timetableTable.id,
      period: timetableTable.period,
      teacherId: timetableTable.teacherId,
      classId: timetableTable.classId,
      subjectId: timetableTable.subjectId,
    })
    .from(timetableTable)
    .where(
      and(
        inArray(timetableTable.teacherId, absentTeacherIds),
        eq(timetableTable.dayOfWeek, dayOfWeek)
      )
    );

  const allTeachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);
  const allClasses = schoolId
    ? await db.select().from(classesTable).where(eq(classesTable.schoolId, schoolId))
    : await db.select().from(classesTable);
  const allSubjects = schoolId
    ? await db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId))
    : await db.select().from(subjectsTable);

  const teacherMap = new Map(allTeachers.map((t) => [t.id, t]));
  const classMap = new Map(allClasses.map((c) => [c.id, c]));
  const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));

  // Get weekly substitution counts for all teachers in this school
  const { weekStartStr, weekEndStr } = getWeekRange();
  const weeklyCounts = await db
    .select({
      substituteTeacherId: substitutionAssignmentsTable.substituteTeacherId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(substitutionAssignmentsTable)
    .where(
      and(
        schoolId ? eq(substitutionAssignmentsTable.schoolId, schoolId) : undefined,
        gte(substitutionAssignmentsTable.date, weekStartStr),
        lte(substitutionAssignmentsTable.date, weekEndStr)
      )
    )
    .groupBy(substitutionAssignmentsTable.substituteTeacherId);

  const countMap = new Map(weeklyCounts.map((c) => [c.substituteTeacherId, c.count]));

  // For each slot, find free teachers (not teaching at that period on that day)
  const recommendations = await Promise.all(
    affectedSlots.map(async (slot) => {
      // Teachers busy at this period
      const busyTeacherIds = (
        await db
          .select({ teacherId: timetableTable.teacherId })
          .from(timetableTable)
          .where(
            and(
              eq(timetableTable.dayOfWeek, dayOfWeek),
              eq(timetableTable.period, slot.period)
            )
          )
      ).map((r) => r.teacherId);

      const absentTeacher = teacherMap.get(slot.teacherId);
      const cls = classMap.get(slot.classId);
      const subject = subjectMap.get(slot.subjectId);

      const availableTeachers = allTeachers
        .filter((t) => !absentTeacherIds.includes(t.id)) // not absent
        .map((t) => ({
          teacherId: t.id,
          teacherName: t.name,
          weeklySubstitutionCount: countMap.get(t.id) ?? 0,
          isFree: !busyTeacherIds.includes(t.id),
        }))
        .sort((a, b) => {
          // Sort: free first, then by lowest substitution count
          if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
          return a.weeklySubstitutionCount - b.weeklySubstitutionCount;
        });

      return {
        timetableSlotId: slot.id,
        period: slot.period,
        className: cls ? `${cls.name} ${cls.code}` : "",
        subjectName: subject?.name ?? "",
        absentTeacherName: absentTeacher?.name ?? "",
        recommendedTeachers: availableTeachers,
      };
    })
  );

  res.json(recommendations);
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { date, absentTeacherIds, assignments } = SaveSubstitutionsBody.parse(req.body);

  // Delete existing assignments for this date (scoped to school)
  await db
    .delete(substitutionAssignmentsTable)
    .where(and(
      eq(substitutionAssignmentsTable.date, date),
      schoolId ? eq(substitutionAssignmentsTable.schoolId, schoolId) : undefined
    ));

  if (assignments.length > 0) {
    // We need to match each assignment with the absent teacher
    const dayOfWeek = new Date(date).getDay();

    // Get all slots for absent teachers on this day
    const affectedSlots = await db
      .select()
      .from(timetableTable)
      .where(
        and(
          inArray(timetableTable.teacherId, absentTeacherIds),
          eq(timetableTable.dayOfWeek, dayOfWeek)
        )
      );

    const slotTeacherMap = new Map(affectedSlots.map((s) => [s.id, s.teacherId]));

    const rows = assignments
      .map((a) => ({
        date,
        schoolId,
        absentTeacherId: slotTeacherMap.get(a.timetableSlotId) ?? absentTeacherIds[0],
        substituteTeacherId: a.substituteTeacherId,
        timetableSlotId: a.timetableSlotId,
      }))
      .filter((r) => r.absentTeacherId !== undefined);

    if (rows.length > 0) {
      await db.insert(substitutionAssignmentsTable).values(rows);
    }
  }

  // Return the updated plan
  const saved = await db
    .select({
      id: substitutionAssignmentsTable.id,
      date: substitutionAssignmentsTable.date,
      absentTeacherId: substitutionAssignmentsTable.absentTeacherId,
      substituteTeacherId: substitutionAssignmentsTable.substituteTeacherId,
      timetableSlotId: substitutionAssignmentsTable.timetableSlotId,
      period: timetableTable.period,
      dayOfWeek: timetableTable.dayOfWeek,
    })
    .from(substitutionAssignmentsTable)
    .leftJoin(timetableTable, eq(substitutionAssignmentsTable.timetableSlotId, timetableTable.id))
    .where(and(
      eq(substitutionAssignmentsTable.date, date),
      schoolId ? eq(substitutionAssignmentsTable.schoolId, schoolId) : undefined
    ));

  const allTeachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);
  const allClasses = schoolId
    ? await db.select().from(classesTable).where(eq(classesTable.schoolId, schoolId))
    : await db.select().from(classesTable);
  const allSubjects = schoolId
    ? await db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId))
    : await db.select().from(subjectsTable);
  const allSlots = schoolId
    ? await db.select().from(timetableTable).where(eq(timetableTable.schoolId, schoolId))
    : await db.select().from(timetableTable);

  const teacherMap = new Map(allTeachers.map((t) => [t.id, t]));
  const classMap = new Map(allClasses.map((c) => [c.id, c]));
  const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
  const slotMap = new Map(allSlots.map((s) => [s.id, s]));

  const enriched = saved.map((a) => {
    const slot = slotMap.get(a.timetableSlotId);
    const cls = slot ? classMap.get(slot.classId) : undefined;
    const subject = slot ? subjectMap.get(slot.subjectId) : undefined;

    return {
      id: a.id,
      date: a.date,
      absentTeacherId: a.absentTeacherId,
      substituteTeacherId: a.substituteTeacherId,
      timetableSlotId: a.timetableSlotId,
      absentTeacherName: teacherMap.get(a.absentTeacherId)?.name ?? "",
      substituteTeacherName: teacherMap.get(a.substituteTeacherId)?.name ?? "",
      className: cls ? `${cls.name} ${cls.code}` : "",
      subjectName: subject?.name ?? "",
      period: a.period ?? 0,
      dayOfWeek: a.dayOfWeek ?? 0,
    };
  });

  res.json({ date, absentTeacherIds, assignments: enriched });
}));

router.get("/all-assignments", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const allAssignments = schoolId
    ? await db.select().from(substitutionAssignmentsTable).where(eq(substitutionAssignmentsTable.schoolId, schoolId))
    : await db.select().from(substitutionAssignmentsTable);
  const teachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const result = allAssignments.map(a => ({
    ...a,
    absentTeacherName: teacherMap.get(a.absentTeacherId)?.name ?? "",
    substituteTeacherName: teacherMap.get(a.substituteTeacherId)?.name ?? "",
  }));
  res.json(result);
}));

export default router;
