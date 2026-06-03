# Day 40 — CI/CD + Docker: Interview Questions

## Q1: Walk me through what happens when you run `docker build -t my-app .`

**Answer:**
Docker reads the Dockerfile and executes each instruction as a separate layer. The build context (everything in `.`) is sent to the Docker daemon. Each `RUN`, `COPY`, and `ADD` instruction creates a new image layer. Docker checks its layer cache first — if the instruction and all preceding layers are unchanged, it reuses the cached layer instead of re-executing.

With a multi-stage build, only the final `FROM` stage ends up in the resulting image. Earlier stages are discarded after the build completes. The `-t my-app` flag tags the final image with that name.

Key optimization: the order of instructions matters for cache effectiveness. `COPY package.json` + `RUN npm ci` should come before `COPY src/` so that the expensive npm install step is only re-run when `package.json` changes, not on every source code change.

---

## Q2: What is the difference between CMD and ENTRYPOINT in a Dockerfile? When would you use each?

**Answer:**
`ENTRYPOINT` defines the executable that always runs — it cannot be overridden by arguments passed to `docker run`. `CMD` provides default arguments to that executable, and can be overridden by passing arguments to `docker run`.

When used together: `ENTRYPOINT ["node"]` + `CMD ["dist/server.js"]` means `docker run my-app` executes `node dist/server.js`, but `docker run my-app dist/debug.js` overrides the CMD to run `node dist/debug.js`.

Using only `CMD` (as in most application containers) means the entire command can be overridden: `docker run my-app npm run migrate` works fine.

Prefer `CMD ["node", "dist/server.js"]` for application containers because it allows easy override in development and testing (e.g., running migrations, opening a shell). Use `ENTRYPOINT` for utility containers where you always want to run the same binary (e.g., a container that wraps the `aws` CLI).

---

## Q3: How do multi-stage Docker builds reduce image size, and why does image size matter in production?

**Answer:**
Multi-stage builds allow you to use a build environment (with compilers, dev dependencies, test tools) that never ships to production. The final image only copies the compiled artifacts from the build stage via `COPY --from=builder`.

For a Node.js TypeScript app: the builder stage has TypeScript compiler, `@types/*` packages, Jest, ESLint, and source `.ts` files — often 800MB+. The production stage copies only `dist/` (compiled JS) and installs only production `node_modules`, resulting in a 100–180MB image.

Image size matters because:
1. **Deploy speed:** Smaller images pull faster from the registry, reducing deploy latency. A 600MB size difference means 30-60 seconds faster deploys on a 100 Mbps connection.
2. **Attack surface:** Every package in the image is a potential vulnerability. Removing dev tools (compilers, debuggers) from production eliminates classes of exploits.
3. **Cold start time:** For Lambda container images, ECS Fargate, and Kubernetes, smaller images start faster.
4. **Storage cost:** ECR, GCR, and Docker Hub charge for stored image size × number of tags.

---

## Q4: Describe a complete CI/CD pipeline for a Node.js microservice. What stages exist, and what fails the build?

**Answer:**
A production-grade pipeline has these stages in order:

1. **Lint + type check** — ESLint with `--max-warnings 0` fails on any warning. `tsc --noEmit` fails on type errors. Fast (~30s), catches issues before wasting test time.
2. **Unit tests** — Jest with coverage threshold (e.g., 80% branch). Runs against Node matrix (18, 20). Fails if coverage drops below threshold.
3. **Integration tests** — Service containers (PostgreSQL, Redis) spin up via GitHub Actions `services:`. Tests run against real dependencies.
4. **Security scan** — `npm audit --audit-level=high` fails on high/critical CVEs. Container image scanning with Trivy or Docker Scout.
5. **Build** — `npm run build` (TypeScript compilation). Docker image build with layer caching from registry.
6. **Push** — Docker image pushed to ECR with commit SHA tag. Only runs on `main` branch.
7. **Deploy staging** — Update ECS service, wait for stability (`aws ecs wait services-stable`), smoke test `/health`.
8. **Deploy production** — Requires explicit approval (GitHub environment with required reviewers). Same ECS update + smoke test.

What fails the build: lint errors, test failures, coverage below threshold, high CVEs, TypeScript errors, image build failures, staging smoke test failure.

---

## Q5: Explain blue/green deployment. What are its advantages over rolling deployment, and what are the costs?

**Answer:**
Blue/green deployment maintains two identical production environments. The "blue" environment serves all traffic while "green" is idle. When deploying a new version:

1. Deploy the new version to the idle (green) environment.
2. Run smoke tests and health checks against green (before it receives traffic).
3. Atomically switch the load balancer to point to green (< 1 second). Blue is now idle.
4. If something goes wrong, switch back to blue instantly.

Advantages over rolling deployment:
- **Atomic cutover:** All traffic switches at once. With rolling, both old and new versions run simultaneously, requiring API backward compatibility.
- **Zero-risk verification:** Green is fully tested before receiving real traffic. Rolling deploys start sending user traffic to the new version immediately.
- **Instant rollback:** Switch the load balancer back. Rolling rollback requires re-deploying the previous version.

Costs and drawbacks:
- **Double infrastructure:** Both environments must be running, doubling compute costs during the transition window.
- **Database migrations:** The hardest problem. If green requires a schema change incompatible with blue, you can't keep blue as a rollback option without also reverting the migration. Solution: expand-contract migrations (additive-only, never rename/drop in the same deploy).
- **Session state:** Users mid-session on blue may lose state when switched to green unless sessions are stored externally (Redis).

---

## Q6: How does canary deployment work, and how do you automate the decision to roll forward vs. roll back?

**Answer:**
A canary deployment routes a small percentage of traffic (e.g., 5%) to the new version while the stable version handles the rest. AWS ALB supports this natively via weighted target groups — you split traffic without changing DNS.

The rollout is progressive: 5% → 25% → 50% → 100%. At each stage you observe key metrics before promoting:
- **Error rate** (5xx responses on the canary target group via CloudWatch)
- **Latency** (p99 latency spike indicates resource or performance regression)
- **Business metrics** (cart add rate, checkout completion — not just technical metrics)

Automation: a deployment script queries CloudWatch metrics after each stage. If the error rate exceeds a threshold (e.g., 1%), the script automatically sets canary weight to 0% (full rollback to stable) and exits with a failure. The Slack notification and GitHub deployment status are updated. The stable environment was never affected.

Key insight: the 5% stage is specifically sized so that even if the canary fails, only 5% of users are affected and the error rate is observable in CloudWatch within a few minutes. Setting the initial canary too high (e.g., 50%) defeats the purpose.

---

## Q7: What is the difference between a Kubernetes liveness probe and a readiness probe? Give a concrete example where using the wrong one causes a production incident.

**Answer:**
**Liveness probe:** "Is the container alive?" If it fails, Kubernetes restarts the container. Used to detect deadlocks, zombie processes, or application hangs that don't crash the process.

**Readiness probe:** "Is the container ready to receive traffic?" If it fails, Kubernetes removes the pod from the Service endpoints — stops routing traffic — but does NOT restart the container. Used during startup (waiting for DB connections) and during transient overload.

Concrete incident from using the wrong probe:

*Scenario: You configure `/health` as a liveness probe with `initialDelaySeconds: 5`.* Your application takes 20 seconds to establish its database connection pool on startup. During those 20 seconds, `/health` returns 500 because the DB isn't connected yet. Kubernetes sees 3 consecutive liveness failures and **restarts the pod**. The pod starts again, takes another 20 seconds to connect, fails liveness again — restart loop. The pod never becomes healthy. Symptoms: `CrashLoopBackOff`.

Correct approach: use `/health` (process alive) as liveness with a generous `initialDelaySeconds: 30`. Use `/ready` (DB connected, ready to serve) as readiness with `initialDelaySeconds: 5`. During startup, readiness fails (no traffic routed) but liveness succeeds (process is alive). Once the connection pool is ready, readiness passes and Kubernetes starts routing traffic.

---

## Q8: What is Docker layer caching, and how do you structure a Dockerfile to maximize cache hit rate?

**Answer:**
Docker layer caching saves the result of each instruction as an immutable layer. On subsequent builds, if the instruction and all preceding layers are unchanged, Docker reuses the cached layer instead of re-executing it.

Cache invalidation rules:
- Any change to the instruction text invalidates that layer and all subsequent layers.
- For `COPY` and `ADD`, Docker hashes the file contents. If any copied file changes, that layer and everything after it is invalidated.

Optimal Dockerfile structure (from least to most frequently changing):

```dockerfile
# 1. Base image — changes almost never
FROM node:20.11.1-alpine3.19

# 2. System dependencies — changes rarely
RUN apk add --no-cache curl

# 3. Application dependencies — changes when package.json changes
COPY package.json package-lock.json ./
RUN npm ci                           # cached unless package.json changes

# 4. Build config — changes occasionally
COPY tsconfig.json ./

# 5. Source code — changes on every commit
COPY src/ ./src/
RUN npm run build                    # re-runs only when source changes
```

The critical insight: if you write `COPY . .` first and then `npm ci`, every single source code change invalidates the `npm ci` layer — reinstalling all packages on every build (3–5 minutes). The optimized version only reinstalls when `package.json` changes.

Additional optimizations:
- Use `--cache-from` with BuildKit to restore layer cache from the registry in CI (stateless runners have no local cache).
- Pin base image versions exactly (`20.11.1-alpine3.19` not `20-alpine`) so an upstream tag update doesn't invalidate your cache unexpectedly.
- Use `.dockerignore` to exclude `node_modules/`, `.git/`, and test files from the build context, reducing the data sent to the daemon.
