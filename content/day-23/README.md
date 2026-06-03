# Day 23 – Express.js Advanced: Middleware Architecture & Security | DSA: Dynamic Programming Intro

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Middleware execution order, error handling, rate limiting, helmet, compression |
| Hands-On | 00:40–01:10 | Build a full middleware stack: auth + rate limit + validation + error handler |
| DSA | 01:10–01:25 | Climbing Stairs (#70) + House Robber (#198) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Trace middleware execution order for a given Express app setup
- [ ] Implement a 4-parameter error handling middleware correctly
- [ ] Wire up async error handling without try/catch in every route
- [ ] Solve: Climbing Stairs (#70) and House Robber (#198) using DP
- [ ] Review 5 interview questions for Express middleware

---

## Concept: Express.js Advanced Middleware

### What to Study
- **Middleware execution order:** `app.use()` registers in order — request flows top-to-bottom through each middleware; `next()` passes to the next function, `next(err)` skips to error handler; router-level middleware runs inside the router's mount path only
- **Error handling middleware:** Must have exactly 4 parameters `(err, req, res, next)` — Express detects this signature to treat it as error middleware; must be registered LAST after all routes; calling `next(err)` from any middleware jumps straight here, skipping remaining route handlers
- **Async error handling:** Express 4 does NOT catch rejected promises automatically — wrap async route handlers with a utility `asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)` or upgrade to Express 5 which handles it natively
- **Security middleware stack:** `helmet()` sets 11+ HTTP security headers (CSP, HSTS, X-Frame-Options, etc.); `express-rate-limit` uses a sliding window counter per IP stored in memory or Redis; `compression()` uses gzip/br and should go before routes but after static files

### Key Mental Models
- Think of Express middleware as a pipeline of functions — each one gets `(req, res, next)` and must either end the request (send response) or call `next()` to continue — dead-end middleware that does neither will hang the request
- Error middleware is an escape hatch — any `next(err)` call anywhere in the chain bypasses all remaining regular middleware and goes directly to the 4-parameter error handler
- Rate limiting should be applied selectively: tight limits on auth routes (/login, /register), looser on API routes, none on health checks

### Why This Matters in Interviews
Express middleware is the foundation of every Node.js backend. Interviewers test whether you understand execution ordering (a common source of bugs), can implement proper async error propagation, and know why security headers matter. At senior level, you're expected to design the middleware stack from scratch — not just use it.

---

## DSA Focus: Dynamic Programming – Climbing Stairs & House Robber

- **Problem:** Climbing Stairs (LeetCode #70) + House Robber (LeetCode #198)
- **Difficulty:** Easy / Medium
- **Pattern:** 1D Dynamic Programming (bottom-up)
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Both reduce to "you can't use adjacent elements" — Climbing Stairs is Fibonacci in disguise; House Robber adds the choice of rob vs skip, with `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`

---

## Today's 5 Interview Questions (Flash Review)
1. How does Express determine that a function is an error-handling middleware vs a regular middleware?
2. What happens if an async route handler throws an error and you have no `try/catch`?
3. In what order does Express process middleware — describe the flow for a POST /api/users request?
4. What does `helmet()` protect against and which headers does it set?
5. How would you implement per-user rate limiting instead of per-IP?

---

## Files in This Folder
- `01-concept/` → Read: Express middleware docs, error handling guide, helmet & express-rate-limit documentation
- `02-hands-on/` → Code: middleware-stack.js (full app with auth, rate limit, validation, error handler), async-handler.js
- `03-dsa/` → DSA: climbing-stairs.js (dp + space-optimized), house-robber.js (dp table + O(1) space)
- `04-interview-prep/` → Full Q&A: 5 questions with detailed answers on Express middleware architecture

---

## Success Criteria
- [ ] Can implement a complete Express middleware stack from memory
- [ ] Solved both DP problems in < 20 minutes with O(1) space optimization
- [ ] Confident answering all 5 interview questions
- [ ] Bonus: Build a custom request logging middleware that measures response time and logs status code
