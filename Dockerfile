# ── Build Stage ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install build deps for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install ALL dependencies (including devDependencies for Vite build)
COPY package*.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# ── Production Stage ────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install production deps (better-sqlite3 needs native compile)
COPY package*.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps \
    && npm cache clean --force

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Copy server code
COPY server/ ./server/
COPY public/ ./public/

# Create data directory with proper ownership for non-root user
RUN mkdir -p /app/data && chown -R node:node /app

VOLUME /app/data

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/auth/challenge || exit 1

# Use non-root user for security
USER node

CMD ["node", "server/index.cjs"]
