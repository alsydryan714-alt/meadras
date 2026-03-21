import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

// JWT_SECRET MUST be set in production — no insecure fallback
const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) {
  console.error("[auth] FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

export interface AuthUser {
  userId: number;
  schoolId: number | null;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET!) as AuthUser;
    req.user = payload;

    if (payload.role === "super_admin") {
      next();
      return;
    }

    if (payload.schoolId) {
      pool
        .query(`SELECT is_active FROM schools WHERE id = $1`, [payload.schoolId])
        .then(({ rows }) => {
          if (rows.length === 0) {
            res.status(401).json({ error: "المدرسة غير موجودة" });
            return;
          }
          if (!rows[0].is_active) {
            res.status(403).json({ error: "حساب المدرسة موقوف" });
            return;
          }
          next();
        })
        .catch(() => next());
    } else {
      next();
    }
  } catch {
    res.status(401).json({ error: "رمز غير صالح أو منتهي الصلاحية" });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET!) as AuthUser;
    if (payload.role !== "super_admin") {
      res.status(403).json({ error: "مطلوب صلاحيات المشرف العام" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "رمز غير صالح أو منتهي الصلاحية" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET!) as AuthUser;
      req.user = payload;
    } catch {
      // ignore invalid token for optional routes
    }
  }
  next();
}
