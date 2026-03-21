import { Router, type IRouter, type Request, type Response } from "express";
import { db, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateSubjectBody, DeleteSubjectParams } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

const SAUDI_TEMPLATES: Record<string, Array<{ name: string; officialHoursPerWeek: number; pairedPeriods: number }>> = {
  elementary: [
    { name: "القرآن الكريم", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "التوحيد", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الفقه", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الحديث", officialHoursPerWeek: 1, pairedPeriods: 0 },
    { name: "اللغة العربية", officialHoursPerWeek: 6, pairedPeriods: 0 },
    { name: "الرياضيات", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "العلوم", officialHoursPerWeek: 3, pairedPeriods: 0 },
    { name: "الدراسات الاجتماعية", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "اللغة الإنجليزية", officialHoursPerWeek: 4, pairedPeriods: 0 },
    { name: "الحاسب الآلي", officialHoursPerWeek: 1, pairedPeriods: 0 },
    { name: "التربية البدنية", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "التربية الفنية", officialHoursPerWeek: 1, pairedPeriods: 0 },
  ],
  middle: [
    { name: "القرآن الكريم", officialHoursPerWeek: 4, pairedPeriods: 0 },
    { name: "التوحيد", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الفقه", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الحديث", officialHoursPerWeek: 1, pairedPeriods: 0 },
    { name: "اللغة العربية", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "الرياضيات", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "الفيزياء", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الكيمياء", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الأحياء", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الدراسات الاجتماعية", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "اللغة الإنجليزية", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "الحاسب الآلي", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "التربية البدنية", officialHoursPerWeek: 2, pairedPeriods: 0 },
  ],
  high: [
    { name: "القرآن الكريم", officialHoursPerWeek: 3, pairedPeriods: 0 },
    { name: "التوحيد", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "اللغة العربية", officialHoursPerWeek: 4, pairedPeriods: 0 },
    { name: "الرياضيات", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "الفيزياء", officialHoursPerWeek: 3, pairedPeriods: 1 },
    { name: "الكيمياء", officialHoursPerWeek: 3, pairedPeriods: 1 },
    { name: "الأحياء", officialHoursPerWeek: 3, pairedPeriods: 1 },
    { name: "التاريخ", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "الجغرافيا", officialHoursPerWeek: 2, pairedPeriods: 0 },
    { name: "اللغة الإنجليزية", officialHoursPerWeek: 5, pairedPeriods: 0 },
    { name: "الحاسب الآلي", officialHoursPerWeek: 2, pairedPeriods: 1 },
    { name: "التربية البدنية", officialHoursPerWeek: 2, pairedPeriods: 0 },
  ],
};

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const subjects = schoolId
    ? await db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId))
    : await db.select().from(subjectsTable);
  res.json(subjects);
}));

router.get("/templates/:level", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { level } = req.params as { level: string };
  const template = SAUDI_TEMPLATES[level];
  if (!template) {
    res.status(404).json({ error: "القالب غير موجود" });
    return;
  }
  res.json(template);
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const body = CreateSubjectBody.parse(req.body);
  const [subject] = await db
    .insert(subjectsTable)
    .values({
      ...body,
      schoolId: req.user!.schoolId,
      officialHoursPerWeek: (req.body.officialHoursPerWeek as number) ?? 1,
      pairedPeriods: (req.body.pairedPeriods as number) ?? 0,
      isActivity: (req.body.isActivity as boolean) ?? false,
    })
    .returning();
  res.status(201).json(subject);
}));

router.post("/import-template", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { level } = req.body as { level: string };
  const template = SAUDI_TEMPLATES[level];
  if (!template) { res.status(400).json({ error: "القالب غير موجود" }); return; }
  const schoolId = req.user!.schoolId;
  const inserted = await db.insert(subjectsTable)
    .values(template.map(s => ({ ...s, schoolId })))
    .returning();
  res.status(201).json({ imported: inserted.length });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = DeleteSubjectParams.parse(req.params);
  const schoolId = req.user!.schoolId;
  const clause = schoolId ? and(eq(subjectsTable.id, id), eq(subjectsTable.schoolId, schoolId)) : eq(subjectsTable.id, id);
  await db.delete(subjectsTable).where(clause);
  res.status(204).send();
}));

export default router;
