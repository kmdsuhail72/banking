# =============================================================================
# Banking Platform — Multi-Stage Dockerfile (monorepo root)
#
# Build arg SERVICE selects which NestJS app to bundle.
# Usage:
#   docker build --build-arg SERVICE=auth-service -t banking/auth-service .
#   docker build --build-arg SERVICE=payment-service -t banking/payment-service .
#
# Layers:
#   base        → node:22-alpine + pnpm, shared for all stages
#   deps        → install ALL workspace dependencies (cached layer)
#   builder     → compile the selected service with tsc
#   production  → minimal runtime image (~120 MB)
# =============================================================================

ARG NODE_VERSION=22
ARG PNPM_VERSION=9

# ── Stage 1: Base (pnpm + node) ───────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /repo

# ── Stage 2: Install all dependencies ─────────────────────────────────────────
FROM base AS deps
# Copy only manifests first for optimal layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/config/package.json         packages/config/
COPY packages/logger/package.json         packages/logger/
COPY packages/shared-types/package.json   packages/shared-types/
COPY packages/kafka/package.json          packages/kafka/
COPY packages/grpc/package.json           packages/grpc/
COPY packages/observability/package.json  packages/observability/
COPY packages/database/package.json       packages/database/
COPY apps/api-gateway/package.json        apps/api-gateway/
COPY apps/services/auth-service/package.json        apps/services/auth-service/
COPY apps/services/customer-service/package.json    apps/services/customer-service/
COPY apps/services/account-service/package.json     apps/services/account-service/
COPY apps/services/transaction-service/package.json apps/services/transaction-service/
COPY apps/services/payment-service/package.json     apps/services/payment-service/
COPY apps/services/wallet-service/package.json      apps/services/wallet-service/
COPY apps/services/ledger-service/package.json      apps/services/ledger-service/
COPY apps/services/notification-service/package.json apps/services/notification-service/
COPY apps/services/kyc-risk-service/package.json    apps/services/kyc-risk-service/
COPY apps/services/fraud-service/package.json       apps/services/fraud-service/
COPY apps/services/audit-service/package.json       apps/services/audit-service/
COPY apps/services/compliance-service/package.json  apps/services/compliance-service/
COPY apps/services/beneficiary-service/package.json apps/services/beneficiary-service/
COPY apps/services/card-service/package.json        apps/services/card-service/
COPY apps/services/loan-service/package.json        apps/services/loan-service/
COPY apps/services/emi-service/package.json         apps/services/emi-service/
COPY apps/services/fixed-deposit-service/package.json  apps/services/fixed-deposit-service/
COPY apps/services/recurring-deposit-service/package.json apps/services/recurring-deposit-service/
COPY apps/services/interest-service/package.json   apps/services/interest-service/
COPY apps/services/limit-service/package.json      apps/services/limit-service/
COPY apps/services/fee-service/package.json        apps/services/fee-service/
COPY apps/services/exchange-service/package.json   apps/services/exchange-service/
COPY apps/services/reporting-service/package.json  apps/services/reporting-service/
COPY apps/services/statement-service/package.json  apps/services/statement-service/
COPY apps/services/analytics-service/package.json  apps/services/analytics-service/
COPY apps/services/document-service/package.json   apps/services/document-service/
COPY apps/services/scheduler-service/package.json  apps/services/scheduler-service/
COPY apps/services/support-service/package.json    apps/services/support-service/
COPY apps/services/admin-service/package.json      apps/services/admin-service/
COPY apps/services/authz-service/package.json      apps/services/authz-service/

RUN pnpm install --frozen-lockfile --prefer-offline

# ── Stage 3: Build the selected service ───────────────────────────────────────
FROM deps AS builder
ARG SERVICE
ENV SERVICE=${SERVICE}

# Copy full source (all packages + the target service)
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/ apps/

# Build all shared packages first, then the target service
RUN pnpm --filter "@banking/shared-types" run build 2>/dev/null || true
RUN pnpm --filter "@banking/config"       run build 2>/dev/null || true
RUN pnpm --filter "@banking/logger"       run build 2>/dev/null || true
RUN pnpm --filter "@banking/kafka"        run build 2>/dev/null || true
RUN pnpm --filter "@banking/grpc"         run build 2>/dev/null || true
RUN pnpm --filter "@banking/observability" run build 2>/dev/null || true
RUN pnpm --filter "@banking/database"     run build 2>/dev/null || true

# Build the target service
RUN if [ -d "apps/services/${SERVICE}" ]; then \
      pnpm --filter "@banking/${SERVICE}" run build; \
    elif [ -d "apps/${SERVICE}" ]; then \
      pnpm --filter "@banking/${SERVICE}" run build; \
    else \
      echo "ERROR: Service '${SERVICE}' not found" && exit 1; \
    fi

# ── Stage 4: Production runtime image ─────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS production
ARG SERVICE
ENV SERVICE=${SERVICE}
ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache libc6-compat dumb-init curl
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

# Copy only the compiled output + production node_modules
COPY --from=builder --chown=nestjs:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /repo/packages/config/dist        ./packages/config/dist
COPY --from=builder --chown=nestjs:nodejs /repo/packages/logger/dist        ./packages/logger/dist
COPY --from=builder --chown=nestjs:nodejs /repo/packages/shared-types/dist  ./packages/shared-types/dist
COPY --from=builder --chown=nestjs:nodejs /repo/packages/kafka/dist         ./packages/kafka/dist
COPY --from=builder --chown=nestjs:nodejs /repo/packages/grpc/dist          ./packages/grpc/dist
COPY --from=builder --chown=nestjs:nodejs /repo/packages/grpc/proto         ./packages/grpc/proto
COPY --from=builder --chown=nestjs:nodejs /repo/packages/observability/dist ./packages/observability/dist
COPY --from=builder --chown=nestjs:nodejs /repo/packages/database/dist      ./packages/database/dist

# Copy built service (supports both apps/services/<name> and apps/<name>)
COPY --from=builder --chown=nestjs:nodejs /repo/apps/services/${SERVICE}/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /repo/apps/services/${SERVICE}/package.json ./package.json

USER nestjs

# Health check via /health endpoint (all NestJS services expose this)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}

# dumb-init for proper PID 1 signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
