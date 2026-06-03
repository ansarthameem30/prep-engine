# Day 57 – Node.js + Database Mock Interview: Full 90-Minute Simulation | DSA: Timed Backend Coding Challenge

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:05 | No new concept — simulation day. Scan your Node.js + DB weak areas from Days 21-30 only. |
| Hands-On | 00:05–01:00 | Full Node.js + Database interview simulation: internals + middleware + SQL + MongoDB + auth design + API critique |
| DSA | 01:00–01:20 | Timed backend coding challenge — implement a rate limiter with sliding window |
| Interview Q | 01:20–01:30 | Self-grade all rounds, log weak areas |

---

## Today's Objectives

> **Note:** `01-concept/` contains only a `.gitkeep` — this is a simulation day with no new concept files. All study material is in `04-interview-prep/`.

- [ ] Complete full Node.js + Database interview simulation under realistic conditions
- [ ] Score yourself honestly on each round (1–5 rubric)
- [ ] Identify your top 2 backend weak areas and log them
- [ ] Implement a sliding window rate limiter from scratch in < 20 minutes
- [ ] Re-do any round you scored < 3 after the session

---

## Concept: Simulation Day

> No new learning today. Review your notes from Days 21–30 if needed (spend max 5 min).

Key areas to quickly scan if shaky:
- Node.js event loop phases, `libuv`, thread pool (Day 21)
- Express middleware chain, error handling middleware (Day 22)
- SQL: JOINs, window functions, CTEs, EXPLAIN ANALYZE (Days 25–26)
- MongoDB aggregation pipeline (Day 27)
- Authentication: JWT vs session, refresh token rotation (Day 29)

---

## Full Mock Interview Simulation

### Ground Rules
- Timer must be running. No docs, no Stack Overflow.
- Write all code in actual files and run it.
- For SQL, write queries and check them against a mental execution plan.

---

### Round 1: Node.js Internals (10 min)
Answer out loud — < 2 min each:
1. Explain the Node.js event loop phases in order. What happens in each phase?
2. What is the thread pool in Node.js? What operations use it and how many threads does it have by default?
3. What is the difference between `process.nextTick()` and `setImmediate()`? Which runs first?
4. If you have CPU-intensive code (image processing, crypto), why does it block the event loop, and what are your options?
5. What is backpressure in Node.js streams? How do you handle it?

---

### Round 2: Express Middleware Design (10 min)
Live code these (write them, run them against a test case):

1. Implement a request logging middleware that logs `{method, path, statusCode, durationMs}` as JSON for every request.
2. Implement an authentication middleware that validates a JWT Bearer token and attaches the decoded user to `req.user`; return 401 on missing token, 403 on invalid token.
3. Implement a global error handler middleware (4-argument function) that:
   - Returns structured JSON `{error: message, code, traceId}`
   - Distinguishes validation errors (400) from auth errors (401/403) from unexpected errors (500)
   - Never exposes stack traces to clients in production
4. Implement async error handling middleware that catches rejected Promises from async route handlers without requiring try/catch in every handler.
5. Explain Express middleware ordering — why does error handler placement matter?

---

### Round 3: SQL Query Writing (15 min)
Write these queries without looking at documentation — run them mentally with EXPLAIN logic:

**Given schema:**
```sql
users(id, name, email, created_at, plan)
orders(id, user_id, total_amount, status, created_at)
order_items(id, order_id, product_id, quantity, unit_price)
products(id, name, category, price)
```

1. Find the top 5 users by total spend in the last 30 days, showing name, email, order count, and total spend.
2. For each user, find their most recent order. Return user name, order id, order total, and days since last order.
3. Using a window function: rank products by revenue within each category. Show product name, category, revenue, and rank within category.
4. Find all users who have placed more than 3 orders but have never ordered from the 'Electronics' category.
5. Write a CTE that calculates a 7-day rolling average of daily revenue.

---

### Round 4: MongoDB Aggregation (10 min)
**Given a `logs` collection:** `{userId, action, timestamp, metadata: {pageUrl, deviceType}}`

Write aggregation pipelines for:
1. Count events by action type for the last 7 days, sorted by count descending.
2. Find the top 10 most active users by event count, with their first and last activity timestamps.
3. Group by deviceType, then by day, and calculate daily active users per device type.
4. Find users who triggered a `purchase` action within 5 minutes of a `view_product` action (complex — explain your approach even if you can't fully write it).
5. What index would you create to make queries 1 and 2 efficient? Explain the compound index field order.

---

### Round 5: Authentication Flow Design (10 min)
Design and explain (draw on paper or describe precisely):
1. Design a complete JWT authentication system with access tokens (15min) and refresh tokens (7 days). What are the exact request/response flows for login, access, refresh, and logout?
2. How do you implement refresh token rotation? What is the security benefit?
3. Where do you store tokens on the client? Compare localStorage, sessionStorage, httpOnly cookie — security and UX tradeoffs for each.
4. How do you invalidate a JWT (revoke a specific token) given that JWTs are stateless?
5. What is PKCE and when do you need it in an OAuth flow?

---

### Round 6: API Design Critique (5 min)
You're shown this REST API design — identify problems and suggest fixes:
```
POST /getUser                     → returns user by ID from request body
GET /users/delete?id=123          → deletes user
POST /updateUserPassword          → takes {userId, oldPassword, newPassword}
GET /api/orders?user=123&include_items=true&include_user=true
PUT /users/123/orders             → creates a new order for user
GET /users?page=1&count=50&sort=name&dir=ASC&include_deleted=0
```

Critique: HTTP method correctness, URL naming, query vs path params, response codes, idempotency, pagination design.

---

## DSA Focus: Timed Backend Coding Challenge

- **Problem:** Implement a sliding window rate limiter (Redis-compatible API) that allows N requests per window
- **Difficulty:** Medium (implementation challenge)
- **Pattern:** Sliding window counter using sorted set (timestamp-based)
- **Time Target:** < 20 minutes
- **Key Insight:** Store request timestamps in a sorted set; on each request: remove entries older than `now - windowMs`; count remaining entries; if count < limit, add current timestamp and allow; else reject with 429; use Redis ZREMRANGEBYSCORE + ZCARD + ZADD in a pipeline for atomicity

```javascript
// Target API:
const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });
await limiter.check(userId); // returns { allowed: bool, remaining: int, resetAt: Date }
```

---

## Today's 5 Interview Questions

> Self-assessment questions — answer after the simulation.

1. Can you explain Node.js event loop phases and thread pool without hesitation?
2. Can you implement JWT auth middleware and an error handler from scratch?
3. Can you write complex SQL (window functions, CTEs, multi-table JOINs) in an interview setting?
4. Can you design a complete JWT access + refresh token flow and explain all security decisions?
5. Can you critique a REST API design and articulate specific HTTP conventions?

---

## Files

> `01-concept/` — Simulation day: no concept notes. See your Phase 3 notes (Days 21-30) for reference.

- `01-concept/` → `.gitkeep` only — simulation day, no new concept files
- `02-hands-on/` → node-mock-solutions/ — your middleware implementations from Rounds 2 and 5
- `03-dsa/` → sliding-window-limiter.js — rate limiter implementation
- `04-interview-prep/` → node-db-mock-scorecard.md — self-graded rubric (1–5 per round), SQL answers, weak areas

---

## Success Criteria
- [ ] Completed all 6 simulation rounds without pausing
- [ ] All 4 middleware implementations run correctly
- [ ] Rate limiter implementation works with correct sliding window semantics
- [ ] Logged top 2 backend weak areas for targeted review before Day 60
- [ ] Scored 4+ on at least 4 of the 6 rounds
