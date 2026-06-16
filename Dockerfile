# TradeHook production image (api | worker | web | migrate targets)

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/config ./packages/config
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
COPY apps/web ./apps/web
RUN pnpm build:packages
RUN pnpm --filter @tradehook/api build
RUN pnpm --filter @tradehook/worker build
ARG NEXT_PUBLIC_API_URL=https://api.atikaiagents.cloud
ARG NEXT_PUBLIC_DEV_MOCK_AUTH=true
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEV_MOCK_AUTH=$NEXT_PUBLIC_DEV_MOCK_AUTH
RUN pnpm --filter @tradehook/web build

FROM base AS migrate
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/package.json ./package.json
WORKDIR /app/packages/database
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM base AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]

FROM base AS web
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
