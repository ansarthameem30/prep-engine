# Day 40 – CI/CD Deep Dive: Pipelines, Docker Multi-Stage, Deployment Strategies & Feature Flags | DSA: System Design Mock

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | CI/CD pipeline stages, Docker multi-stage builds, deployment strategies, feature flags, Terraform intro |
| Hands-On | 00:40–01:10 | Write a complete Node.js + React CI/CD pipeline with Docker multi-stage build and canary deploy workflow |
| DSA | 01:10–01:25 | System design mini-mock: design a rate limiter service |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Design a complete CI/CD pipeline with all required stages for a production Node.js API
- [ ] Write a Docker multi-stage build that produces a minimal production image
- [ ] Compare rolling, blue/green, and canary deployment strategies with failure scenarios
- [ ] Solve: Design a distributed rate limiter (system design DSA exercise)
- [ ] Review 5 CI/CD interview questions

---

## Concept: CI/CD Deep Dive

### What to Study
- **Pipeline stages:** Source (git push triggers pipeline); Build (compile TS, bundle React, generate artifacts); Test (unit tests → integration tests → E2E tests — fail fast, run fastest tests first); Lint/Format (ESLint, Prettier — non-blocking warning vs blocking error); Security scan (npm audit, Snyk, Trivy for Docker image CVEs, SAST with SonarQube); Publish (push Docker image to ECR, tagged with git SHA); Deploy (promote to env — dev → staging → prod)
- **GitHub Actions full workflow for Node.js + React:** Trigger on `push` to main and `pull_request`; jobs: `test` (npm ci, npm test -- --coverage), `lint` (eslint + prettier check), `build` (npm run build, upload artifact), `docker-build` (needs: [test, lint, build] — build image, push to ECR with `:${{ github.sha }}`), `deploy-staging` (update ECS service), `deploy-prod` (environment: production with required review — update ECS service, run smoke tests)
- **Docker multi-stage builds:** `FROM node:20-alpine AS builder` — install deps + build; `FROM node:20-alpine AS production` — copy only built output from builder, install only prod deps, run as non-root user, expose port; `COPY --from=builder /app/dist ./dist`; result: 50–80MB image vs 500MB single-stage; layers: each RUN/COPY is a layer — combine RUN commands with `&&` to minimize layers; .dockerignore to exclude node_modules, .git, test files
- **Container registry (ECR):** Push: `docker tag app:latest 123456.dkr.ecr.us-east-1.amazonaws.com/app:sha-abc123`; ECR lifecycle policy to auto-delete old images (keep last 10 per tag prefix); image scanning on push (Clair/native ECR scanning for CVEs)
- **Deployment strategies:** Rolling update (replace instances one by one — zero downtime, but mixed versions briefly coexist — AWS ECS default); Blue/Green (run two identical environments — switch traffic instantly, instant rollback by pointing LB back — doubles infrastructure cost during deploy); Canary (route 1-5% of traffic to new version — monitor error rate and latency — gradually increase — safest for detecting regressions — requires weighted routing in ALB/Route53)
- **Feature flags:** Decouple deploy from release — deploy code with feature hidden behind a flag; toggle for % of users or specific user IDs; tools: LaunchDarkly (SaaS, real-time, targeting), Unleash (open source), custom Redis-backed flags; enables: A/B testing, gradual rollout, kill switch for bad features, trunk-based development without long-lived branches
- **Rollback strategies:** Container-based: deploy previous ECR image tag (fast, < 30s with ECS); DB migrations: always use additive-first (never delete columns in the same deploy as the code that stops using them — two-phase migration); feature flags: toggle off without redeploy; blue/green: flip ALB target group back; never rely on `git revert` in production as your primary rollback
- **Terraform intro:** Infrastructure as Code; `provider`, `resource`, `variable`, `output`, `module` blocks; `terraform init → plan → apply`; state stored in S3 + DynamoDB lock; HCL syntax; resource: `aws_ecs_service`, `aws_s3_bucket`, `aws_lb`; Terraform enables reproducible, version-controlled infrastructure

### Key Mental Models
- CI is about confidence — every commit should be automatically validated so you know it's safe to deploy; fast CI (< 5 minutes) is a team productivity multiplier
- The goal of CD is to make deployment boring — if deploying takes 2 minutes and is fully automated, you deploy 10x per day; if it takes 2 hours and requires manual steps, you deploy once per sprint
- Feature flags separate deployment risk from business risk — you can merge unfinished features to main, deploy them, and release them on your own schedule without a long-lived branch

### Why This Matters in Interviews
CI/CD is tested at senior level because it reflects how you ship software. Interviewers ask about deployment strategy choices (when would you use canary vs blue/green?), rollback procedures (how do you handle a bad deploy at 2am?), and Docker best practices (why multi-stage builds?). Feature flags signal product engineering maturity. Terraform knowledge is increasingly expected for senior full-stack roles.

---

## DSA Focus: System Design Mini – Distributed Rate Limiter

- **Problem:** Design a distributed rate limiter (e.g., 100 requests per minute per user)
- **Difficulty:** Hard (System Design)
- **Pattern:** Token Bucket / Sliding Window with Redis
- **Time Target:** Design in under 20 minutes
- **Key Insight:** Fixed window (INCR + EXPIRE) is simple but has boundary burst problem; sliding window log (ZADD timestamps + ZCOUNT) is accurate but memory-heavy; sliding window counter (store window buckets in Redis Hash) balances accuracy and memory; token bucket (DECR a Redis counter refilled by a background job) smooths bursts — choose based on strictness requirement

---

## Today's 5 Interview Questions (Flash Review)
1. What is the difference between a rolling deployment and a blue/green deployment — in what scenario would you prefer blue/green?
2. Why do you use multi-stage Docker builds and what goes in each stage?
3. How do feature flags enable trunk-based development — what problem do they solve compared to long-lived feature branches?
4. How do you handle database migration rollback when your new code and old code need to run simultaneously during a rolling deploy?
5. Your canary deploy shows a 2% increase in 500 errors after routing 5% of traffic — what is your immediate next action?

---

## Files in This Folder
- `01-concept/` → Read: Docker multi-stage build docs, AWS ECS deployment strategies, LaunchDarkly feature flags guide, Terraform getting started
- `02-hands-on/` → Code: `Dockerfile` (multi-stage Node.js + React), `.github/workflows/full-pipeline.yml` (test → lint → build → push ECR → deploy ECS → canary)
- `03-dsa/` → DSA: rate-limiter-design.js (sliding window counter in Redis + token bucket implementation comparison)
- `04-interview-prep/` → Full Q&A: 5 CI/CD questions with YAML workflow examples, Docker commands, and deployment decision trees

---

## Success Criteria
- [ ] Can write a Docker multi-stage Dockerfile for Node.js from memory
- [ ] Designed a distributed rate limiter with trade-off analysis in < 20 minutes
- [ ] Confident answering all 5 CI/CD interview questions
- [ ] Phase 4 checkpoint: all Days 31-39 success criteria met — ready to advance to Phase 5 (React + Next.js + TypeScript)
