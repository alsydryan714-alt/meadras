import { Router, type IRouter, type Request, type Response } from "express";
import { db, teachersTable, examCommitteesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();

const GenerateCommitteeBody = z.object({
  examName: z.string().min(1),
  numberOfRooms: z.number().int().positive(),
  teacherIds: z.array(z.number().int().positive()).min(1),
  proctorsPerRoom: z.number().int().positive().default(2),
});

const SaveCommitteeBody = z.object({
  examName: z.string().min(1),
  assignments: z.array(
    z.object({
      roomNumber: z.number().int().positive(),
      teachers: z.array(z.object({ id: z.number() })),
    })
  ),
});

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// ── POST /api/exam-committees  (generate) ────────────────────────────────────
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const body = GenerateCommitteeBody.parse(req.body);
    const schoolId = req.user!.schoolId;

    const teachers = await db
      .select()
      .from(teachersTable)
      .where(schoolId ? eq(teachersTable.schoolId, schoolId) : undefined as any);

    const eligible = teachers.filter((t) => body.teacherIds.includes(t.id));

    if (eligible.length < body.numberOfRooms * body.proctorsPerRoom) {
      res.status(400).json({
        error: "عدد المعلمين المتاحين أقل من المطلوب لتغطية جميع الغرف",
      });
      return;
    }

    // Shuffle teachers for fair distribution
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);

    const assignments = Array.from({ length: body.numberOfRooms }, (_, i) => ({
      roomNumber: i + 1,
      teachers: shuffled.slice(
        i * body.proctorsPerRoom,
        (i + 1) * body.proctorsPerRoom
      ),
    }));

    res.json(assignments);
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err, "خطأ في توليد لجنة الامتحان") });
  }
});

// ── GET /api/exam-committees  (list saved) ───────────────────────────────────
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const committees = await db
      .select()
      .from(examCommitteesTable)
      .where(schoolId ? eq(examCommitteesTable.schoolId, schoolId) : undefined as any);

    res.json(
      committees.map((c) => ({
        id: c.id,
        examName: c.examName,
        createdAt: c.createdAt,
        assignments: c.assignments,
      }))
    );
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err, "خطأ في جلب اللجان") });
  }
});

// ── POST /api/exam-committees/save  (persist) ────────────────────────────────
router.post("/save", requireAuth, async (req: Request, res: Response) => {
  try {
    const body = SaveCommitteeBody.parse(req.body);
    const schoolId = req.user!.schoolId;

    const [saved] = await db
      .insert(examCommitteesTable)
      .values({
        schoolId: schoolId!,
        examName: body.examName,
        assignments: body.assignments,
      })
      .returning();

    res.status(201).json(saved);
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err, "خطأ في حفظ اللجنة") });
  }
});

// ── DELETE /api/exam-committees/:id ─────────────────────────────────────────
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "معرّف غير صالح" });
      return;
    }
    await db.delete(examCommitteesTable).where(eq(examCommitteesTable.id, id));
    res.status(204).send();
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err, "خطأ في الحذف") });
  }
});

export default router;
