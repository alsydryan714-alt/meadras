import path from "path";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import router from "./routes";

// Keep runtime path resolution compatible with the CJS bundle output.
const runtimeDir = path.dirname(process.argv[1] ?? process.cwd());
const isProduction = process.env["NODE_ENV"] === "production";
const frontendUrl = process.env["FRONTEND_URL"];

const app: Express = express();

// ── Security & Performance Middleware ─────────────────────────────────────────
app.use(compression());

// Disable X-Powered-By to avoid fingerprinting
app.disable("x-powered-by");

// Security headers (lightweight alternative to helmet)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (curl, health checks, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isProduction) {
        callback(null, origin === frontendUrl);
        return;
      }

      const devAllowedOrigins = [
        frontendUrl,
        "http://localhost:3000",
        "http://localhost:5173",
      ].filter((value): value is string => Boolean(value));

      callback(null, devAllowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Static Frontend (production all-in-one Railway deploy) ───────────────────
if (isProduction) {
  const publicPath = path.resolve(runtimeDir, "public");
  app.use(
    express.static(publicPath, {
      maxAge: "1y",
      etag: true,
      lastModified: true,
      // Don't cache index.html so new deployments are picked up immediately
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );
  app.get(/(.*)/, (_req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
} else {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "المسار غير موجود" });
  });
}

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must be the last middleware registered
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Log the error for observability
  console.error("[error]", err);

  if (res.headersSent) return;

  // Zod validation errors
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    (err as any).name === "ZodError"
  ) {
    res.status(422).json({
      error: "بيانات غير صالحة",
      details: (err as any).errors,
    });
    return;
  }

  // JWT errors
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
      (err as any).name
    )
  ) {
    res.status(401).json({ error: "رمز المصادقة غير صالح أو منتهي الصلاحية" });
    return;
  }

  // Generic server error — never leak stack traces in production
  const message =
    process.env["NODE_ENV"] !== "production" && err instanceof Error
      ? err.message
      : "حدث خطأ داخلي في الخادم";

  res.status(500).json({ error: message });
});

export default app;
