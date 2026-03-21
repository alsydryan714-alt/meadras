# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

# Install pnpm
RUN npm install -g pnpm@9 --quiet

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY .npmrc ./
COPY tsconfig.json tsconfig.base.json ./

# Copy all package.json files for workspace resolution
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/school-manager/package.json ./artifacts/school-manager/
COPY scripts/package.json ./scripts/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/
COPY attached_assets/ ./attached_assets/

# Build everything in correct order
RUN BASE_PATH=/ pnpm --filter @workspace/school-manager run build
RUN pnpm --filter @workspace/api-server run build

# ─── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

# Security: run as non-root user
RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs -s /usr/sbin/nologin nodeapp

WORKDIR /app

# Install only production runtime dependencies
RUN npm install -g pnpm@9 --quiet

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY .npmrc ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY scripts/package.json ./scripts/

RUN pnpm install --frozen-lockfile --prod 2>/dev/null || pnpm install --frozen-lockfile

# Copy built artifacts from builder stage
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

# Set ownership
RUN chown -R nodeapp:nodejs /app

USER nodeapp

# Railway injects PORT automatically
ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/api/health || exit 1

CMD ["node", "artifacts/api-server/dist/index.cjs"]
