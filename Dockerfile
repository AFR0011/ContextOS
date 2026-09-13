# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://contextos:contextos@127.0.0.1:5432/contextos?schema=public" npm ci

FROM deps AS builder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NODE_ENV=production \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    APP_URL=${NEXT_PUBLIC_APP_URL} \
    AUTH_SECRET=container-build-only-auth-secret-32-characters-minimum \
    DATABASE_URL=postgresql://contextos:contextos@127.0.0.1:5432/contextos?schema=public \
    ALLOW_PUBLIC_REGISTRATION=false \
    ALLOW_DEMO_RESET=false
COPY . .
RUN npm run build

FROM base AS operator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
USER node
CMD ["npm", "run", "db:deploy"]

FROM base AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
