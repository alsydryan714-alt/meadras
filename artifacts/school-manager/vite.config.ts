import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 5000;
const basePath = process.env["BASE_PATH"] ?? "/";
const apiPort = process.env["API_PORT"] ? Number(process.env["API_PORT"]) : 3001;
const isReplit = process.env["REPL_ID"] !== undefined;
const isDev = process.env["NODE_ENV"] !== "production";

export default defineConfig(async () => {
  // Replit-only dev plugins — never bundled in production
  const replitPlugins =
    isDev && isReplit
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner()
          ),
        ]
      : [];

  return {
    base: basePath,

    plugins: [react(), tailwindcss(), ...replitPlugins],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets"
        ),
      },
      dedupe: ["react", "react-dom"],
    },

    root: path.resolve(import.meta.dirname),

    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      // Raise warning threshold — project is large but acceptable
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Radix UI components — large but stable
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-popover",
              "@radix-ui/react-tooltip",
            ],
            // Data & charting
            "vendor-data": ["recharts", "@tanstack/react-query"],
            // PDF & export utilities (lazy-loaded anyway)
            "vendor-export": ["jspdf", "html2canvas", "exceljs"],
            // DnD kit
            "vendor-dnd": [
              "@dnd-kit/core",
              "@dnd-kit/sortable",
              "@dnd-kit/utilities",
            ],
          },
        },
      },
      // Minify with esbuild (default, fast)
      minify: "esbuild",
      // Generate source maps only in dev
      sourcemap: isDev,
    },

    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },

    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
