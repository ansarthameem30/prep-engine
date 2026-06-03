# Day 30 – Backend Mock Interview Day: Node.js, Express, MySQL, MongoDB & Auth | DSA: Mixed DP + Greedy

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Comprehensive Phase 3 review — fill any gaps from Days 21-29 |
| Hands-On | 00:40–01:10 | Timed mock interview: backend design + live coding challenge |
| DSA | 01:10–01:25 | Mixed review: one DP problem + one Greedy problem from Days 21-29 |
| Interview Q | 01:25–01:30 | Full mock: 5 rapid-fire questions across all Phase 3 topics |

---

## Today's Objectives
- [ ] Complete a timed 30-minute mock interview covering all Phase 3 topics
- [ ] Identify and fill any gaps from Days 21-29 before moving to Phase 4
- [ ] Re-solve one DP and one Greedy problem under interview conditions (no notes)
- [ ] Solve: Chosen from: Coin Change / House Robber / Gas Station / Jump Game
- [ ] Review 5 comprehensive interview questions spanning all Phase 3 topics

---

## Concept: Phase 3 Comprehensive Review

### What to Study
- **Node.js:** Event loop phases order, microtask queue (nextTick vs Promise), libuv thread pool size and what it handles, Worker threads vs cluster for CPU-bound work, stream backpressure with `drain` event, `pipeline()` error propagation
- **Express.js:** Middleware execution order, 4-parameter error handler signature, async error propagation with `next(err)`, rate limiting strategies, helmet headers, compression placement
- **MySQL:** JOIN types (LEFT, INNER, RIGHT), composite index leftmost prefix rule, EXPLAIN `type` column values, window functions (ROW_NUMBER/RANK/DENSE_RANK/LAG/LEAD), all 4 isolation levels and their anomalies, deadlock detection
- **MongoDB:** Aggregation pipeline stages ($match/$group/$project/$lookup/$unwind/$facet), $lookup pipeline syntax, $graphLookup for trees, EXPLAIN on aggregations, index usage in pipelines
- **Auth & Security:** JWT structure and statelessness, refresh token rotation + family invalidation, OAuth 2.0 authorization code + PKCE, SameSite cookie attribute, CORS preflight, SQL injection parameterized queries

### Key Mental Models
- Phase 3 is the backend foundation — everything in Phase 4 (System Design, AWS) builds on these fundamentals
- Mock interviews reveal gaps that solo study hides — if you can't explain something in 60 seconds, you don't know it well enough yet
- DSA patterns from this phase (DP, Greedy, Heap, Recursion, Backtracking) recur throughout system design — knowing them cold frees mental bandwidth for architectural thinking

### Why This Matters in Interviews
Day 30 is a checkpoint — you're halfway through the sprint. Senior interviews often blend topics: "Design an API that queries MySQL efficiently and caches in Redis — explain your auth strategy." The ability to connect these areas is what separates a 3-year developer from a junior. Today's mock interview simulates that pressure.

---

## DSA Focus: Mixed Review – DP + Greedy

- **Problem:** Pick one: Coin Change (#322) or House Robber (#198) for DP — Gas Station (#134) or Jump Game (#55) for Greedy
- **Difficulty:** Medium
- **Pattern:** Bottom-up DP / Greedy with constraint tracking
- **Time Target:** Solve in under 20 minutes — under interview conditions, no notes
- **Key Insight:** For both patterns, the key is recognizing the optimal substructure (DP) or the locally optimal choice (Greedy) — articulate your reasoning aloud as you code

---

## Today's 5 Interview Questions (Flash Review)
1. Walk me through what happens when Node.js executes `setTimeout(() => {}, 0)` — which event loop phase picks it up, and does it run before or after `Promise.resolve().then()`?
2. You have a MySQL table with 50 million rows and a query that takes 8 seconds — what is your systematic approach to diagnosing and fixing it?
3. You need to store a user's order history in MongoDB where each order has line items, and you need to query "all orders containing product X" efficiently — how do you model this?
4. Your Express API is getting CORS errors in production but not locally — what are the three most likely causes?
5. A user's JWT was stolen — they are still within the token's 15-minute expiry window. How would you invalidate it?

---

## Files in This Folder
- `01-concept/` → Review: Phase 3 summary notes — event loop, streams, SQL, MongoDB, auth cheat sheet
- `02-hands-on/` → Code: mock-interview.js (timed coding challenge: build a mini REST API with auth, MySQL query, and error handling)
- `03-dsa/` → DSA: phase3-review.js (re-solve chosen DP + Greedy problems from scratch without notes)
- `04-interview-prep/` → Full Q&A: Phase 3 comprehensive mock interview with 20 questions and model answers

---

## Success Criteria
- [ ] Completed 30-minute mock interview covering at least 4 of the 5 Phase 3 topics
- [ ] Re-solved DSA problems under interview conditions in < 20 minutes
- [ ] Confident answering all 5 cross-topic interview questions
- [ ] Phase 3 checklist: all Days 21-29 success criteria met — ready to advance to Phase 4
