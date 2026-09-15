# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

ENV NITRO_PRESET=node_server

COPY package.json package-lock.json* bun.lock* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
