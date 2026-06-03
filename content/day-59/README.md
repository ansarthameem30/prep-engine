# Day 59 – GenAI + DevOps Mock Interview: Full 90-Minute Simulation | DSA: Timed Mixed Hard

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:05 | No new concept — simulation day. Quick scan of Phase 5 cheat sheet + CI/CD notes. |
| Hands-On | 00:05–01:00 | Full simulation: GenAI architecture Q + mini RAG endpoint + CI/CD design + Docker/K8s + AWS + behavioral |
| DSA | 01:00–01:20 | Timed mixed Hard problems — 2 problems, 10 min each |
| Interview Q | 01:20–01:30 | Self-grade all rounds, finalize weak area list for Day 60 |

---

## Today's Objectives

> **Note:** `01-concept/` contains only a `.gitkeep` — this is a simulation day with no new concept files. All study material is in `04-interview-prep/`.

- [ ] Complete full GenAI + DevOps interview simulation under realistic conditions
- [ ] Build a mini RAG endpoint live (without reference, in 15 minutes)
- [ ] Design a CI/CD pipeline for a full-stack app end-to-end
- [ ] Answer behavioral question about leading a technical decision using STAR format
- [ ] Solve 2 Hard DSA problems in 10 min each
- [ ] Finalize and consolidate your weak areas list for Day 60 targeted review

---

## Concept: Simulation Day

> No new learning. Spend max 5 min reviewing:
> - Your Phase 5 cheat sheet (created on Day 50)
> - The 8-stage RAG pipeline from memory
> - Docker: container vs image, Dockerfile best practices, multi-stage builds
> - Kubernetes: pod/deployment/service/ingress mental model
> - GitHub Actions workflow structure (on:, jobs:, steps:)

---

## Full Mock Interview Simulation

### Ground Rules
- Timer running for every round. No docs.
- Write all code, run it. Behavioral answers spoken aloud (timed at 3 min each).
- Grade after each round using 1–5 scale.

---

### Round 1: GenAI Architecture Deep Questions (15 min)
Answer each in < 2 minutes — no code required, but be specific:

1. **Architecture:** You're building a customer support chatbot for a SaaS product. It needs to answer questions about the product docs (5,000 pages), the user's specific account data (orders, billing, usage), and general how-to questions. Design the RAG architecture — what are the different retrieval paths and how do you route between them?

2. **Tradeoff:** A product manager asks why you're building RAG instead of just fine-tuning GPT-4o on your documentation. Give a thorough technical and business answer — what are the real tradeoffs?

3. **Debugging:** Your RAG system has high answer relevance scores but low faithfulness scores. What does this tell you and how do you fix it?

4. **Scaling:** Your AI feature is being used by 100k users/day and costs $0.05 per conversation on average — monthly cost is $150k. The business wants it under $50k/month. Walk through your optimization roadmap in priority order.

5. **Safety:** Your AI chatbot started giving incorrect billing advice that could have legal liability. What safeguards do you implement immediately, and how do you design a more robust system?

---

### Round 2: Build a Mini RAG Endpoint Live (15 min)
**No reference material. Timer starts now.**

Build an Express endpoint `POST /ask` that:
1. Accepts `{ question: string, documents: string[] }` in request body
2. Validates input with a simple check
3. Chunks each document into ~200-character pieces with 20-char overlap
4. Generates embeddings for all chunks using OpenAI `text-embedding-3-small`
5. Generates an embedding for the question
6. Computes cosine similarity between question embedding and all chunk embeddings
7. Selects top-3 most similar chunks
8. Constructs a prompt: system (role + instruction) + user (question + context chunks)
9. Calls `gpt-4o-mini` with the prompt
10. Returns `{ answer: string, sources: string[], tokensUsed: number }`

**Self-grade criteria:**
- Did it run without errors?
- Is cosine similarity implemented correctly (dot product / (||a|| × ||b||))?
- Is the prompt well-structured?
- Did you handle errors (API failure, empty documents, no relevant chunks)?

---

### Round 3: CI/CD Pipeline Design (10 min)
Design a complete CI/CD pipeline for this stack:
- Monorepo with React frontend + Node.js API + PostgreSQL
- Hosted on AWS (ECS Fargate + RDS)
- Three environments: dev, staging, production
- Team of 8 engineers using trunk-based development

Design the pipeline covering:
1. **Trigger:** What events trigger what workflows? (PR, merge to main, manual)
2. **Build stage:** Linting, type checking, unit tests, build Docker image
3. **Test stage:** Integration tests (test DB), E2E tests (Cypress), security scan (npm audit, Snyk)
4. **Docker:** Multi-stage Dockerfile structure, image tagging strategy (commit SHA + environment), ECR
5. **Deploy to staging:** How does the deploy work? (ECS task definition update, blue-green or rolling)
6. **Deploy to production:** Gate (manual approval? automated?), blue-green deployment, smoke tests post-deploy
7. **Rollback:** How do you roll back a bad deploy in < 5 minutes?
8. **Database migrations:** How do you handle PostgreSQL schema migrations safely in CI/CD?

Draw the pipeline as a text diagram in your answer file.

---

### Round 4: Docker & Kubernetes Basics (10 min)
Answer precisely without looking up syntax:

1. What is the difference between a Docker image and a Docker container? What is a layer?
2. Write a multi-stage Dockerfile for a Node.js Express app that:
   - Stage 1: installs all dependencies + builds TypeScript
   - Stage 2: production image with only `node_modules` (prod only) + compiled JS
   - Uses `node:20-alpine` base, non-root user, correct WORKDIR
3. Explain Kubernetes: what is a Pod, Deployment, Service, and Ingress? How do they relate?
4. You have a Node.js API deployed in Kubernetes and it needs to scale from 2 to 20 replicas under load — what Kubernetes features handle this and what metrics trigger scaling?
5. How does a Secret in Kubernetes differ from a ConfigMap? How do you inject both into a container?

---

### Round 5: AWS Architecture Question (5 min)
**Question:** Your Node.js API currently runs on a single EC2 instance. Traffic has grown 10x and you're seeing downtime. Design the AWS architecture to make it highly available and auto-scaling.

Describe: ALB + Auto Scaling Group + ECS Fargate (or EC2 ASG) + RDS Multi-AZ + ElastiCache + S3/CloudFront for static assets + Route 53 + VPC design (public/private subnets).

What changes when you add a second AWS region for disaster recovery?

---

### Round 6: Behavioral — Leading Technical Decisions (5 min)
**Question:** *"Tell me about a time you made a significant technical decision that others disagreed with. How did you get alignment, and what was the outcome?"*

Use STAR format (2–3 min). Your answer must include:
- **Situation:** Set the context (team size, project, constraint)
- **Task:** What decision needed to be made
- **Action:** How you evaluated options, got stakeholder input, communicated your reasoning, handled pushback
- **Result:** Outcome — what happened 3–6 months later? What did you learn?

Prepare 2 versions: one where the decision worked out well, one where you were wrong and what you learned.

---

## DSA Focus: Timed Mixed Hard

- **Problem 1:** LeetCode Hard from your weakest Phase category (pick from Days 41–58 Hard problems) — 10 minutes
- **Problem 2:** LeetCode #239 Sliding Window Maximum (Hard) — 10 minutes
  - **Pattern:** Monotonic deque — maintain a deque of indices where values are decreasing; front is always the max of the current window; remove indices outside window from front; remove smaller elements from back before adding new element
- **Difficulty:** Hard × 2
- **Time Target:** 10 minutes each (strict)
- **Key Insight:** The ability to solve Hard problems in 10 min requires pattern recognition — identify the data structure before writing a single line of code

---

## Today's 5 Interview Questions

> Self-assessment — answer after the simulation:

1. Can you design a multi-path RAG system that routes between different data sources based on query type?
2. Can you build a mini RAG endpoint from scratch in 15 minutes with correct cosine similarity?
3. Can you design a complete CI/CD pipeline including safe database migration strategy?
4. Can you write a multi-stage Dockerfile for a TypeScript Node.js app from memory?
5. Can you answer a behavioral question using STAR format with quantified results?

---

## Final Weak Area Consolidation

> After today's simulation, fill out this final assessment in `04-interview-prep/final-weak-areas.md`:

```
My top weak areas going into Day 60 (be honest):

JavaScript:    [weak area 1] | [weak area 2]
React:         [weak area 1] | [weak area 2]
Node.js:       [weak area 1] | [weak area 2]
Databases:     [weak area 1] | [weak area 2]
System Design: [weak area 1] | [weak area 2]
GenAI:         [weak area 1] | [weak area 2]
DSA Patterns:  [weak area 1] | [weak area 2]
Behavioral:    [weak area 1] | [weak area 2]
```

This list drives your Day 60 review. Do not skip this step.

---

## Files

> `01-concept/` — Simulation day: no concept notes.

- `01-concept/` → `.gitkeep` only — simulation day, no new concept files
- `02-hands-on/` → genai-devops-mock-solutions/ — mini RAG endpoint (Round 2), CI/CD pipeline design (Round 3), Dockerfile (Round 4)
- `03-dsa/` → mixed-hard-timed.js — two Hard problems solved in 10 min each with timer-honest comments
- `04-interview-prep/` → genai-devops-scorecard.md + final-weak-areas.md — scorecard + consolidated weak area list

---

## Success Criteria
- [ ] Completed all 6 simulation rounds without stopping
- [ ] Mini RAG endpoint runs correctly in < 15 minutes
- [ ] CI/CD pipeline design covers all 8 required sections
- [ ] final-weak-areas.md is filled out honestly with specific items per domain
- [ ] Scored 4+ on at least 4 of the 6 rounds
