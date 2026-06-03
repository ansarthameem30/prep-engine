# Day 50 – GenAI Mock Interview Day: Full Simulation — Architecture + Live RAG Build + System Design | DSA: Phase 5 Hard Review

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:10 | Quick Phase 5 concept refresh (no new learning — review your notes) |
| Hands-On | 00:10–00:50 | Live coding: build a mini RAG system from scratch in 40 minutes |
| DSA | 00:50–01:10 | Mixed review of Phase 5 Hard problems (timed, no peeking) |
| Interview Q | 01:10–01:30 | Full GenAI interview simulation: architecture Q + system design |

---

## Today's Objectives
- [ ] Complete Phase 5 mock interview simulation (architecture questions, live RAG coding, system design)
- [ ] Build a mini RAG system from scratch in 40 minutes without reference material
- [ ] Design an AI chatbot with RAG end-to-end in a system design format
- [ ] Review and self-grade Phase 5 Hard DSA problems
- [ ] Identify and log your top 3 weak areas from Phase 5 for final review in Phase 6

---

## Concept: Phase 5 Rapid Review

### What to Study (Review Only — No New Material)
- Re-read your Day 41–49 README concept sections at high speed
- **Flash card review:** Attention mechanism, tokenization, sampling params, RAG 8 stages, LCEL pipe operator, ReAct loop, SSE streaming headers, RAGAS metrics, LLM-as-judge rubric
- **Weak area identification:** Where did you score < 4/5 on interview questions this week? Mark them in `04-interview-prep/` for targeted review
- **Cheat sheet creation:** Write a 1-page cheat sheet of Phase 5 key facts, formulas, and decision trees — this becomes part of your Day 60 review kit

### Key Mental Models
- **GenAI systems are still software systems:** Every architectural principle from Phases 1–4 applies — observability, error handling, scalability, security — GenAI adds a non-deterministic layer on top
- **The RAG pipeline is the most testable GenAI architecture:** Each of the 8 stages can be independently tested and monitored — treat it like a microservice pipeline

### Why This Matters in Interviews
Day 50 is a calibration checkpoint. Real interviews compress Days 41–49 into 90 minutes. This simulation tests whether you can hold the full Phase 5 knowledge graph under pressure and execute a live coding challenge while explaining your thinking.

---

## DSA Focus: Phase 5 Mixed Hard Review

- **Problems:** LeetCode #122 (Stock II), #300 (LIS), #72 (Edit Distance), #139 (Word Break), #42 (Trapping Rain Water), #45 (Jump Game II), #1235 (Job Scheduling), #312 (Burst Balloons)
- **Difficulty:** Hard (Hard-weighted mixed review)
- **Pattern:** DP variants — choose two you're weakest on and solve without hints
- **Time Target:** < 20 minutes each
- **Key Insight:** Pattern recognition is the skill — identify the subproblem type before writing code

---

## Mock Interview Simulation

### Round 1: GenAI Architecture Questions (15 min)
Answer out loud (or write) — time yourself at 2–3 min per question:
1. Design the architecture for an AI customer support system that can answer questions about a 10,000-page product documentation library.
2. Your RAG system has 70% faithfulness — what are the possible causes and how do you systematically improve it?
3. Explain the difference between fine-tuning and RAG for adding company-specific knowledge to an LLM — when would you use each?
4. How do you handle a user query that requires information from 3 different documents that individually don't contain the full answer?
5. What would cause your AI API to suddenly cost 5x more overnight, and how do you diagnose and fix it?

### Round 2: Live Coding — Mini RAG System (40 min)
Build from scratch (no reference, no copy-paste):
```
Requirements:
1. Accept an array of text documents as input
2. Chunk each document into ~500 token pieces with 50-token overlap
3. Embed chunks using OpenAI text-embedding-3-small
4. Store in memory (no vector DB required — use a simple array)
5. Accept a query string
6. Embed the query, compute cosine similarity against all chunks
7. Return top-3 most relevant chunks
8. Construct a prompt with the chunks and query
9. Call OpenAI chat completions and return the answer
10. Log token usage and estimated cost
```
Self-grade: Did it run? Is it correct? Could you explain every line?

### Round 3: System Design — AI Chatbot with RAG (15 min)
Design prompt: *"Design a production AI chatbot for an e-commerce platform that can answer questions about products, orders, and policies. The platform has 1M products, 50M historical orders, and 500 policy documents. The chatbot must handle 10,000 concurrent users."*

Cover: data ingestion pipeline, vector storage architecture, retrieval strategy, conversation state management, multi-tenancy, cost management, evaluation, monitoring, graceful degradation.

---

## Today's 5 Interview Questions
1. [Architecture] Design an AI document Q&A system for a 10k-page corpus — full pipeline from ingest to response.
2. [Debugging] RAG faithfulness score is 0.65 — what are the 5 most likely causes and how do you isolate each?
3. [Trade-off] When do you use agents vs a simple RAG chain for a production use case?
4. [Production] How do you manage conversation history for a chatbot that needs to handle 1-hour long sessions without exceeding context limits?
5. [Cost] Your GenAI feature's monthly cost is $50k. Walk me through how you'd reduce it to $15k without degrading user experience.

---

## Files
- `01-concept/` → phase5-cheat-sheet.md — your 1-page Phase 5 summary for Day 60 review (create this today)
- `02-hands-on/` → mini-rag-system.js — your live coding output from Round 2; grade it honestly
- `03-dsa/` → phase5-hard-review.js — two Hard problems solved under timed conditions
- `04-interview-prep/` → mock-interview-scorecard.md — self-graded rubric for all 3 rounds + weak area log

---

## Success Criteria
- [ ] Completed mini RAG system in < 40 min with all 10 requirements met
- [ ] Can design an AI chatbot with RAG end-to-end in 15 minutes
- [ ] Solved 2 Phase 5 Hard problems in < 20 min each
- [ ] Identified and logged top 3 Phase 5 weak areas for Phase 6 review
- [ ] Phase 5 cheat sheet written and saved
