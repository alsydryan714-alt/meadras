import { Router, type IRouter, type Request, type Response } from "express";
import { db, classesTable, gradesTable, stagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateClassBody, DeleteClassParams } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

async function resolveGradeId(schoolId: number | null, gradeLabel: string): Promise<number> {
  const [existingGrade] = await db
    .select({ id: gradesTable.id })
    .from(gradesTable)
    .where(and(
      schoolId ? eq(gradesTable.schoolId, schoolId) : undefined,
      eq(gradesTable.name, gradeLabel),
    ));

  if (existingGrade) return existingGrade.id;

  const [fallbackStage] = await db
    .select({ id: stagesTable.id })
    .from(stagesTable)
    .where(schoolId ? eq(stagesTable.schoolId, schoolId) : undefined);

  if (!fallbackStage) {
    throw new Error("لا يمكن إنشاء فصل بدون مرحلة دراسية");
  }

  const [newGrade] = await db
    .insert(gradesTable)
    .values({
      schoolId,
      stageId: fallbackStage.id,
      name: gradeLabel,
      code: gradeLabel,
    })
    .returning({ id: gradesTable.id });

  return newGrade.id;
}

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const classes = schoolId
    ? await db.select().from(classesTable).where(eq(classesTable.schoolId, schoolId))
    : await db.select().from(classesTable);
  res.json(classes);
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const body = CreateClassBody.parse(req.body);
  const schoolId = req.user!.schoolId;
  const gradeId = await resolveGradeId(schoolId, body.grade.trim());
  const [cls] = await db
    .insert(classesTable)
    .values({
      schoolId,
      gradeId,
      name: `${body.grade.trim()} ${body.section.trim()}`,
      code: body.section.trim(),
    })
    .returning();
  res.status(201).json(cls);
}));

// Bulk import classes (from Noor Excel)
router.post("/bulk-import", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { classes: incoming, mode = "append" } = req.body as {
    classes: { grade: string; section: string }[];
    mode?: "append" | "replace";
  };

  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات للاستيراد" });
    return;
  }

  if (mode === "replace" && schoolId) {
    await db.delete(classesTable).where(eq(classesTable.schoolId, schoolId));
  }

  const rows = await Promise.all(incoming
    .filter(c => c.grade?.trim() && c.section?.trim())
    .map(async (c) => ({
      gradeId: await resolveGradeId(schoolId, c.grade.trim()),
      name: `${c.grade.trim()} ${c.section.trim()}`,
      code: c.section.trim(),
      schoolId,
    })));

  if (rows.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات صحيحة — تأكد من أعمدة الصف والفصل" });
    return;
  }

  const inserted = await db.insert(classesTable).values(rows).returning();
  res.status(201).json({ imported: inserted.length, total: incoming.length });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = DeleteClassParams.parse(req.params);
  const schoolId = req.user!.schoolId;
  const clause = schoolId ? and(eq(classesTable.id, id), eq(classesTable.schoolId, schoolId)) : eq(classesTable.id, id);
  await db.delete(classesTable).where(clause);
  res.status(204).send();
}));

export default router;
