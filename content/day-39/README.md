# Day 39 – GitHub Advanced: Branch Protection, Actions, Secrets & AWS Deployments | DSA: Math

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Branch protection, GitHub Actions workflow syntax, matrix builds, caching, artifacts, Secrets, Environments |
| Hands-On | 00:40–01:10 | Write a complete GitHub Actions workflow: test → lint → build → deploy to AWS |
| DSA | 01:10–01:25 | Reverse Integer (#7) + Happy Number (#202) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Configure branch protection rules with required status checks and reviews
- [ ] Write a GitHub Actions workflow with jobs, steps, matrix strategy, and caching
- [ ] Deploy to AWS (S3 + CloudFront or ECR + ECS) from a GitHub Actions workflow
- [ ] Solve: Reverse Integer (#7) and Happy Number (#202) using math operations
- [ ] Review 5 GitHub advanced workflow questions

---

## Concept: GitHub Advanced Workflows

### What to Study
- **Branch protection rules:** Require PR before merge; require N approvals; require status checks to pass (CI must be green); require branches to be up to date; dismiss stale reviews on new commits; require signed commits; restrict who can push directly to main; "include administrators" to enforce for everyone
- **GitHub Actions workflow syntax:** `.github/workflows/*.yml`; `on:` triggers (push, pull_request, workflow_dispatch, schedule); `jobs:` with `runs-on: ubuntu-latest`; `steps:` with `uses:` (actions) or `run:` (shell); `needs:` for job dependencies; `if:` for conditional jobs; `env:` and `${{ secrets.NAME }}` for variables; `${{ github.sha }}`, `${{ github.ref_name }}` context variables
- **Matrix builds:** `strategy.matrix` runs the same job with different parameter combinations: `matrix: { node: [18, 20, 21], os: [ubuntu-latest, windows-latest] }` — generates N×M jobs; `fail-fast: false` continues other combinations on single failure; `include`/`exclude` to add/remove specific combinations
- **Caching and artifacts:** `actions/cache@v3` caches `node_modules` by `package-lock.json` hash — saves 30–60s per run; `actions/upload-artifact@v3` stores build output (dist/, test results) for use in later jobs or download; `actions/download-artifact@v3` in subsequent jobs
- **Secrets and Environments:** `Settings > Secrets and variables > Actions` — repository secrets available to all workflows; Environment secrets (staging, production) with deployment protection rules (required reviewers, wait timer); access via `environment: production` on a job — secrets only available to jobs with matching environment; use OIDC + AWS role assumption instead of long-lived AWS access keys
- **Deploy to AWS from Actions:** OIDC authentication (preferred): configure AWS IAM role with trust policy for GitHub Actions OIDC provider, use `aws-actions/configure-aws-credentials@v4` with `role-to-assume` — no static credentials stored; deploy to S3: `aws s3 sync dist/ s3://bucket-name --delete`; invalidate CloudFront; or push Docker image to ECR and update ECS service
- **Dependabot:** Auto-creates PRs for dependency version updates; configure in `.github/dependabot.yml`; set `schedule.interval`, `target-branch`, `allow`/`ignore` rules; combine with required reviews to prevent automatic merges

### Key Mental Models
- GitHub Actions is a DAG (Directed Acyclic Graph) of jobs — `needs:` creates dependencies, jobs without `needs:` run in parallel automatically; steps within a job are sequential
- OIDC authentication to AWS eliminates the "secrets rotation" problem — GitHub gets a short-lived token from AWS dynamically, no long-lived AWS credentials in GitHub Secrets
- Think of Environments as deployment gates — "production" environment requires manual approval before a job can run, protecting against accidental deploys

### Why This Matters in Interviews
GitHub Actions is the industry-standard CI/CD tool. Senior developers are expected to write and maintain workflows, not just use them. Interviewers ask about caching strategies (how do you speed up CI?), secret management (how do you securely deploy to AWS from CI?), and branch protection (how do you prevent broken code from reaching main?). OIDC knowledge for AWS is a strong signal of security awareness.

---

## DSA Focus: Math – Reverse Integer & Happy Number

- **Problem:** Reverse Integer (LeetCode #7) + Happy Number (LeetCode #202)
- **Difficulty:** Easy / Easy
- **Pattern:** Math operations / Floyd's Cycle Detection
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Reverse Integer: extract digits with `% 10` and `/ 10`; check 32-bit overflow before appending; Happy Number: sum of squares of digits — either reaches 1 (happy) or enters a cycle (unhappy); use Floyd's slow/fast pointer to detect cycle without a Set

---

## Today's 5 Interview Questions (Flash Review)
1. How would you set up a GitHub Actions workflow that only deploys to production after manual approval?
2. What is OIDC authentication in GitHub Actions and why is it better than storing AWS Access Key + Secret in GitHub Secrets?
3. How do you speed up a GitHub Actions workflow that runs `npm install` on every run?
4. What is a matrix build strategy and when would you use it?
5. How do you prevent secrets from being accidentally logged in a GitHub Actions workflow?

---

## Files in This Folder
- `01-concept/` → Read: GitHub Actions documentation, OIDC for AWS guide, branch protection docs, Dependabot configuration
- `02-hands-on/` → Code: `.github/workflows/deploy.yml` (lint → test → build → deploy to S3 + CloudFront with OIDC), `dependabot.yml`
- `03-dsa/` → DSA: reverse-integer.js (digit extraction with overflow check), happy-number.js (fast/slow pointer cycle detection)
- `04-interview-prep/` → Full Q&A: 5 GitHub Actions questions with complete YAML examples and security reasoning

---

## Success Criteria
- [ ] Can write a complete GitHub Actions deploy workflow from scratch without reference
- [ ] Solved both math problems in < 20 minutes
- [ ] Confident answering all 5 GitHub workflow interview questions
- [ ] Bonus: Set up a workflow that uses matrix strategy to test across Node.js 18, 20, and 21 simultaneously
