# TRUETRAINNEO — Cloud Run image
#
# Multi-stage so the runtime layer carries no compilers, no dev dependencies
# and no source: only the standalone server Next.js emits. Nothing secret is
# passed at build time — Firebase web config is injected per request and the
# Gemini key is read from Secret Manager at runtime (see lib/ai/secrets.ts).

# ── deps ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# libc6-compat keeps glibc-linked native modules working on musl.
RUN apk add --no-cache libc6-compat

# Copy only the manifests first so this layer caches across source changes.
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cloud Run injects PORT (8080 by default). HOSTNAME must be 0.0.0.0 so the
# server listens on every interface — binding localhost makes the container
# unreachable and the revision fails to start.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Run unprivileged: a compromise in the app does not get root in the container.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: "standalone"` does NOT include these two — they must be copied
# explicitly or the app boots with no CSS, no JS chunks and no logo.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 8080

# server.js is the entrypoint emitted by the standalone build; it honours the
# PORT and HOSTNAME set above.
CMD ["node", "server.js"]
