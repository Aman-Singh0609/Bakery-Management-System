# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate && npm run build

# --- Runtime stage -----------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# openssl is needed by the Prisma migration engine.
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=build /app/dist ./dist

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply migrations, create the first admin / sample menu if missing (idempotent), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/db/seed.js && exec node dist/server.js"]
