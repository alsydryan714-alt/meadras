import { Router, type IRouter, type Request, type Response } from "express";
import { db, schoolEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { year, month } = req.query as { year?: string; month?: string };
  let events;
  if (schoolId) {
    events = await db.select().from(schoolEventsTable).where(eq(schoolEventsTable.schoolId, schoolId));
  } else {
    events = await db.select().from(schoolEventsTable);
  }
  if (year && month) {
    const prefix = `${year}-${month.padStart(2, "0")}`;
    events = events.filter(e => e.date.startsWith(prefix) || (e.endDate && e.endDate >= prefix && e.date <= `${prefix}-31`));
  }
  res.json(events);
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const { title, date, endDate, type, description, color } = req.body as {
    title: string; date: string; endDate?: string; type?: string; description?: string; color?: string;
  };
  if (!title || !date) { res.status(400).json({ error: "العنوان والتاريخ مطلوبان" }); return; }
  const [event] = await db.insert(schoolEventsTable).values({
    schoolId, title, date, endDate: endDate || null, type: type || "event", description: description || null, color: color || "#0D9488"
  }).returning();
  res.status(201).json(event);
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const schoolId = req.user!.schoolId;
  const { title, date, endDate, type, description, color } = req.body as {
    title?: string; date?: string; endDate?: string; type?: string; description?: string; color?: string;
  };
  const clause = schoolId ? and(eq(schoolEventsTable.id, id), eq(schoolEventsTable.schoolId, schoolId)) : eq(schoolEventsTable.id, id);
  const [event] = await db.update(schoolEventsTable)
    .set({ ...(title && { title }), ...(date && { date }), ...(endDate !== undefined && { endDate }), ...(type && { type }), ...(description !== undefined && { description }), ...(color && { color }) })
    .where(clause).returning();
  if (!event) { res.status(404).json({ error: "الحدث غير موجود" }); return; }
  res.json(event);
}));

router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const schoolId = req.user!.schoolId;
  const clause = schoolId ? and(eq(schoolEventsTable.id, id), eq(schoolEventsTable.schoolId, schoolId)) : eq(schoolEventsTable.id, id);
  await db.delete(schoolEventsTable).where(clause);
  res.status(204).send();
}));

export default router;
