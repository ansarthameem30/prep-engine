# Day 40 — CI/CD Deep Dive + Docker

## CI/CD Principles

**Continuous Integration (CI):** Every developer commits to the shared repository frequently (at least daily). Each commit triggers an automated build and test suite. The goal: catch integration problems within minutes, not days. The 10-minute rule: if your CI pipeline takes longer than 10 minutes, developers stop waiting for it and start committing less frequently.

**Continuous Delivery (CD):** Every passing commit is in a deployable state. You can deploy to production at any time with a single click (or command). The pipeline automates everything except the final "push to production" action. Suitable for: organizations that need change management approval before production deploys.

**Continuous Deployment:** Every passing commit to `main` is automatically deployed to production without human intervention. Requires: extremely high confidence in automated tests, feature flags for incomplete features, robust monitoring and alerting, automated rollback capability. Used by Amazon (23,000 deploys/day at peak), Netflix, Etsy.

**Pipeline stages:** Source → Build → Unit Test → Integration Test → Security Scan → Artifact → Deploy Staging → Smoke Test → Deploy Production → Verify

**Feature flags decouple deploy from release:** Deploy code at any time (even if the feature isn't ready for users). Enable the feature via a flag when ready. Rollback = flip the flag, not a revert + redeploy. Tools: LaunchDarkly, AWS AppConfig, Unleash, simple key-value in Redis.

---

## Docker Multi-Stage Builds

The most impactful Docker optimization for production Node.js applications.

### The Problem with Single-Stage Builds

A development Dockerfile:
```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install  # Installs ALL dependencies (dev + prod)
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]
```

This image includes: TypeScript compiler, Jest, ESLint, `@types/*` packages, source files, test files. Result: 800MB+ image. Slow to push/pull. Large attack surface.

### Multi-Stage Build Solution

```dockerfile
# Stage 1: Builder — has all dev dependencies and build tools
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build    # Compile TypeScript to dist/

# Stage 2: Production — only what's needed to run
FROM node:20-alpine AS production
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Own the working directory
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Result: Production image contains only `node:20-alpine` (170MB) + production `node_modules` + `dist/`. Typical result: **800MB → 150MB**.

### Image Optimization Best Practices

1. **Use Alpine base images:** `node:20-alpine` (170MB) vs `node:20` (1.1GB). Alpine uses musl libc instead of glibc — most Node.js packages work fine.

2. **Pin base image versions:** `FROM node:20.11.1-alpine3.19` not `FROM node:20`. Prevents unexpected changes when the `node:20` tag gets a new patch version that might break your build.

3. **`.dockerignore`:** Exclude `node_modules`, `.git`, test files, dev configs from build context:
   ```
   node_modules/
   .git/
   **/*.test.ts
   **/*.spec.ts
   coverage/
   .env*
   dist/    # Will be rebuilt in builder stage
   ```

4. **Layer caching — put infrequently changing things first:**
   ```dockerfile
   COPY package*.json ./   # Changes only when deps change
   RUN npm ci              # This layer cached as long as package.json unchanged
   COPY . .                # Changes on every commit
   RUN npm run build       # Invalidated by any source change
   ```
   If you copy all source files THEN `npm install`, every source change invalidates the npm install layer — reinstalling all packages on every build.

5. **Combine RUN commands to reduce layers:**
   ```dockerfile
   # BAD — 3 layers
   RUN apt-get update
   RUN apt-get install -y curl
   RUN rm -rf /var/lib/apt/lists/*
   
   # GOOD — 1 layer, same result
   RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
   ```

6. **Non-root user in production:** Running as root in a container is a security risk — if the process is compromised, the attacker has root in the container. Create a non-root user with `adduser` and `USER` directive.

---

## Docker Compose for Development

Docker Compose orchestrates multiple containers for local development:

```yaml
version: "3.9"
services:
  app:
    build:
      context: .
      target: builder     # Use the builder stage for dev (has devDependencies)
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src    # Hot reload: mount source directory
      - /app/node_modules # Exclude node_modules from mount (use container's)
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://user:pass@db:5432/myapp
      REDIS_URL: redis://redis:6379
    env_file:
      - .env.local
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run dev  # Start with nodemon/ts-node-dev for hot reload

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 5

volumes:
  postgres_data:    # Named volume persists between `docker compose up/down`
```

---

## Deployment Strategies

### Rolling Deployment (default for most teams)
Replace instances one-by-one with the new version. ECS rolling updates, Kubernetes rolling deployments.

- Traffic split: briefly runs old + new version simultaneously
- Pros: zero downtime, resource-efficient (no double infrastructure)
- Cons: both versions run simultaneously → API must be backwards compatible. If new version has a critical bug, users see it before rollback (depends on how many instances were updated).

### Blue/Green Deployment
Two identical production environments (Blue = current, Green = new). After validating Green, switch all traffic from Blue to Green atomically (update load balancer target group).

- Rollback: switch traffic back to Blue (< 1 second)
- Pros: atomic cutover, instant rollback, can validate Green before receiving traffic
- Cons: double infrastructure cost (both environments active). Database schema changes complicate the switch (new schema on Green, old on Blue = incompatible if Blue reads new format).

### Canary Deployment
Route a small percentage of traffic (1-5%) to the new version, monitor metrics (error rate, latency, business metrics), gradually increase to 100%.

- Tools: ALB weighted target groups, Kubernetes ingress traffic splitting, Istio/Envoy mesh
- Pros: risk limited to canary users, metrics-driven promotion, automated rollback on error spike
- Cons: complex to set up and monitor, some users see the new version before others (potentially confusing for feature-visible changes)

### Feature Flags (complementary to all strategies)
Deploy code to 100% of servers, but control who sees the feature via a flag. Enable for 1% of users, then 10%, then 100%. Rollback = disable the flag, no redeploy needed.

This decouples "deploy" (technical) from "release" (product decision). A feature can be deployed for weeks before being released.

---

## Container Orchestration Basics (Kubernetes)

**Pod:** Smallest deployable unit. One or more containers sharing network namespace (same IP, same localhost) and storage volumes. Typically: 1 application container + optionally a sidecar (logging agent, metrics exporter, service mesh proxy).

**Deployment:** Manages a set of identical Pod replicas. Handles rolling updates: `maxUnavailable: 1` (never have fewer than N-1 pods) + `maxSurge: 1` (can temporarily have N+1 pods during rollout). Automatically recreates crashed pods.

**Service:** Stable DNS name and virtual IP for a group of pods. Provides load balancing across pod replicas. Types: ClusterIP (internal), NodePort (expose on each node's IP), LoadBalancer (provision cloud LB), ExternalName (DNS alias).

**ConfigMap:** Non-secret configuration injected as environment variables or mounted files. For: application configuration, feature flag defaults, database names.

**Secret:** Base64-encoded sensitive data (not encrypted by default in etcd — requires encryption at rest). For: passwords, API keys, TLS certificates. Use External Secrets Operator or Vault Agent for proper secret management.

**Horizontal Pod Autoscaler (HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  minReplicas: 2
  maxReplicas: 20
```

**Liveness vs Readiness probes:**
- **Liveness:** Is the container alive? If fails, Kubernetes restarts the container. Use for detecting deadlocks or zombie processes.
- **Readiness:** Is the container ready to receive traffic? If fails, Kubernetes removes the pod from the Service's endpoints (stops routing traffic to it). Use during startup (waiting for DB connection) or when the pod is temporarily overloaded.
  
Start both probes conservatively:
```yaml
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 30  # Give app time to start before first check
  failureThreshold: 3       # Restart after 3 consecutive failures
readinessProbe:
  httpGet: { path: /ready, port: 3000 }
  initialDelaySeconds: 5
  failureThreshold: 3
```
`/health` endpoint: returns 200 if process is alive. `GET /ready` endpoint: returns 200 only if DB connection is active and app is ready to serve.
