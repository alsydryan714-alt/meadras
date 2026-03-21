import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, cp, mkdir } from "fs/promises";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "express",
  "pg",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("Building API server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: [
      ...externals,
      "zod",
      "zod/v4",
      "zod/v4-mini",
      "drizzle-orm",
      "drizzle-orm/*",
      "drizzle-zod",
    ],
    logLevel: "info",
  });

  // Copy frontend static build into dist/public (for all-in-one Railway deploy)
  const frontendDist = path.resolve(__dirname, "../../artifacts/school-manager/dist/public");
  const publicDest = path.resolve(distDir, "public");

  if (existsSync(frontendDist)) {
    console.log("Copying frontend build to dist/public...");
    await mkdir(publicDest, { recursive: true });
    await cp(frontendDist, publicDest, { recursive: true });
    console.log("Frontend build copied.");
  } else {
    console.warn("⚠️  Frontend build not found at:", frontendDist);
    console.warn("   Run: pnpm --filter @workspace/school-manager run build");
  }

  console.log("Build complete → dist/index.cjs");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
