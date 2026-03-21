import { Router, type IRouter, type Request, type Response } from "express";
import { db, tasksTable, teachersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

const CreateTaskBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teacherId: z.number().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
});

const UpdateTaskBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  teacherId: z.number().optional().nullable(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
});

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const tasks = schoolId
    ? await db.select().from(tasksTable).where(eq(tasksTable.schoolId, schoolId))
    : await db.select().from(tasksTable);
  const teachers = schoolId
    ? await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId))
    : await db.select().from(teachersTable);
  const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
  const result = tasks.map(t => ({
    ...t,
    teacherName: t.teacherId ? teacherMap.get(t.teacherId) ?? null : null,
  }));
  res.json(result);
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const body = CreateTaskBody.parse(req.body);
  const [task] = await db.insert(tasksTable).values({ ...body, schoolId: req.user!.schoolId }).returning();
  res.status(201).json(task);
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const body = UpdateTaskBody.parse(req.body);
  const schoolId = req.user!.schoolId;
  const clause = schoolId ? and(eq(tasksTable.id, id), eq(tasksTable.schoolId, schoolId)) : eq(tasksTable.id, id);
  const [task] = await db.update(tasksTable).set(body).where(clause).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(task);
}));

router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const schoolId = req.user!.schoolId;
  const clause = schoolId ? and(eq(tasksTable.id, id), eq(tasksTable.schoolId, schoolId)) : eq(tasksTable.id, id);
  await db.delete(tasksTable).where(clause);
  res.status(204).send();
}));

export default router;
