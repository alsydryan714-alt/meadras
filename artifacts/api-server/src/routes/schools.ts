import { Router, type IRouter, type Request, type Response } from "express";
import { db, schoolsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router: IRouter = Router();

router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query as { search?: string };
  let schools;
  if (search && search.trim()) {
    schools = await db.select().from(schoolsTable)
      .where(ilike(schoolsTable.name, `%${search}%`));
  } else {
    schools = await db.select().from(schoolsTable);
  }
  res.json(schools);
}));

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
  if (!school) {
    res.status(404).json({ error: "المدرسة غير موجودة" });
    return;
  }
  res.json(school);
}));

router.get("/:id/settings", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
  if (!school) { res.status(404).json({ error: "المدرسة غير موجودة" }); return; }
  res.json(school);
}));

router.put("/:id/settings", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { principalName, logoUrl, schoolType, educationRegion, setupComplete, maxPeriodsPerDay, name, city, region } = req.body;
  const [updated] = await db.update(schoolsTable)
    .set({
      ...(principalName !== undefined && { principalName }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(schoolType !== undefined && { schoolType }),
      ...(educationRegion !== undefined && { educationRegion }),
      ...(setupComplete !== undefined && { setupComplete }),
      ...(maxPeriodsPerDay !== undefined && { maxPeriodsPerDay: Number(maxPeriodsPerDay) }),
      ...(name !== undefined && { name }),
      ...(city !== undefined && { city }),
      ...(region !== undefined && { region }),
    })
    .where(eq(schoolsTable.id, id))
    .returning();
  res.json(updated);
}));

export default router;
