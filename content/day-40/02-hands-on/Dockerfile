# ─────────────────────────────────────────────────────────────────────────────
# Multi-Stage Dockerfile for Node.js Express Application
# Stage 1 (builder): Install all deps + compile TypeScript
# Stage 2 (production): Minimal runtime image with only production artifacts
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS builder

# Build arguments for metadata (injected by CI/CD)
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

WORKDIR /app

# Install dependencies first (layer caching optimization)
# This layer is cached unless package.json or package-lock.json changes
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files and build config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Verify the build output exists
RUN ls -la dist/ && echo "Build successful"


# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS production

# OCI image labels for metadata and vulnerability scanning tools
LABEL org.opencontainers.image.title="my-express-app" \
      org.opencontainers.image.description="Production Node.js Express API" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="MyCompany"

WORKDIR /app

# Create non-root user for security (running as root is a security risk)
RUN addgroup -S appgroup && \
    adduser -S -G appgroup -h /app appuser

# Install ONLY production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force && \
    # Remove npm (not needed at runtime, reduces attack surface)
    rm -rf /root/.npm

# Copy compiled application from builder stage
COPY --from=builder /app/dist ./dist/

# Copy any static assets or config files needed at runtime
# COPY --from=builder /app/public ./public/

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Health check (Docker will mark container as unhealthy if this fails)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Document which port the application listens on (informational)
EXPOSE 3000

# Use CMD (not ENTRYPOINT) so it can be easily overridden in development
CMD ["node", "dist/server.js"]


# ─────────────────────────────────────────────────────────────────────────────
# Build commands:
#
# Production:
#   docker build \
#     --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
#     --build-arg VCS_REF=$(git rev-parse --short HEAD) \
#     --build-arg VERSION=1.0.0 \
#     -t my-express-app:latest \
#     .
#
# Development (use builder stage with devDependencies):
#   docker build --target builder -t my-express-app:dev .
#
# Check image size:
#   docker image inspect my-express-app:latest | jq '.[0].Size'
#
# Scan for vulnerabilities:
#   docker scout cves my-express-app:latest
#   trivy image my-express-app:latest
# ─────────────────────────────────────────────────────────────────────────────
