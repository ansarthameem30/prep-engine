# Day 57 — Full 15-Question Node.js + Database Mock Interview

---

## Q1 (Node.js Internals): Explain the Node.js event loop phases in order.

**Model Answer:**
The event loop processes callbacks in these phases sequentially:

1. **Timers**: `setTimeout` and `setInterval` callbacks whose thresholds have expired
2. **Pending callbacks**: I/O callbacks deferred from the previous iteration
3. **Idle, Prepare**: internal use
4. **Poll**: retrieve new I/O events; execute I/O-related callbacks. This phase blocks if there's no work and no timers pending.
5. **Check**: `setImmediate` callbacks run here
6. **Close callbacks**: `socket.on('close', ...)` type callbacks

**Microtasks** (Promises, `queueMicrotask`) run between EVERY phase — not just between macrotask iterations. `process.nextTick` runs before any other microtask, even before Promise callbacks.

**Order**: `process.nextTick` > `Promise.then` > `setImmediate` > `setTimeout(0)`

This matters for: understanding why a `setImmediate` inside an I/O callback runs before `setTimeout(fn, 0)`, and why `process.nextTick` can starve the I/O queue if called recursively.

---

## Q2 (Node.js Internals): What are Node.js streams and when do you use them?

**Model Answer:**
Streams are interfaces for handling data in chunks rather than loading everything into memory at once. Critical for large files, HTTP responses, database cursors.

**Four types**:
- **Readable**: source of data (HTTP request body, `fs.createReadStream`)
- **Writable**: destination (HTTP response, `fs.createWriteStream`)
- **Duplex**: both readable and writable (TCP socket, WebSocket)
- **Transform**: duplex that transforms data (gzip, encryption, JSON parsing)

**Why use streams**:
```js
// BAD: loads entire 1GB file into memory
const data = fs.readFileSync('large-file.csv');
res.send(data);

// GOOD: streams chunks, memory usage stays constant
fs.createReadStream('large-file.csv')
  .pipe(csvParser())
  .pipe(transformStream)
  .pipe(res);
```

**Backpressure**: When the writable destination can't keep up with the readable source, the stream signals via `false` return from `.write()`. Piping handles backpressure automatically. If you write manually, check the return value and pause the readable until `drain` event.

**Pipeline** (modern): `stream.pipeline(readable, transform, writable, callback)` — handles cleanup on error automatically (unlike `.pipe()` which doesn't close all streams on error).

---

## Q3 (Node.js Internals): How does Node.js clustering work?

**Model Answer:**
Node.js is single-threaded. To utilize multiple CPU cores, use the `cluster` module — spawns multiple worker processes, each running the same server code.

```js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker) => cluster.fork()); // restart crashed workers
} else {
  require('./server'); // each worker runs the full server
}
```

**How requests are distributed**: The primary process binds to the port. When a connection arrives, the OS (Linux: round-robin) distributes it to a worker. Workers don't share memory — each has its own process space.

**pm2 alternative**: In production, `pm2 start app.js -i max` does clustering automatically, adds zero-downtime reload, log management, and restart on crash. Preferred over manual cluster implementation.

**Stateful servers**: Session data must be in Redis (shared store), not in-process memory — otherwise requests routed to different workers won't find the session.

---

## Q4 (Node.js Internals): How do you handle memory leaks in Node.js?

**Model Answer:**
**Common causes**:
1. **Global variables accumulating data**: `global.cache = {}` with unbounded growth
2. **Event listeners not removed**: `emitter.on('data', handler)` without `removeListener` — the handler holds a closure reference preventing GC
3. **Closures holding large objects**: a timer or interval closing over a large array
4. **Unbounded caches**: Map/Object used as a cache without eviction policy — grows indefinitely

**Detection**:
1. `process.memoryUsage()` in metrics — `heapUsed` growing over time = leak
2. Chrome DevTools with `--inspect`: take heap snapshots at intervals, compare "objects allocated between snapshots"
3. `clinic.js`: `clinic heapdump` automatically detects growing heap

**Fix pattern**: Use `WeakMap` for caches keyed by objects (auto-garbage-collects when key has no other reference), always remove event listeners in cleanup functions, limit cache sizes with LRU eviction.

---

## Q5 (SQL): Write a query to find the top 3 products by revenue in each category.

**Model Answer:**
```sql
SELECT category, product_name, revenue
FROM (
  SELECT 
    category,
    product_name,
    SUM(quantity * price) AS revenue,
    RANK() OVER (PARTITION BY category ORDER BY SUM(quantity * price) DESC) AS rnk
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  GROUP BY category, product_name
) ranked
WHERE rnk <= 3
ORDER BY category, rnk;
```

**Explanation**: `PARTITION BY category` creates a separate ranking for each category. `RANK()` gives rank 1, 2, 3... within each category. We filter to top 3 in the outer query.

**RANK vs DENSE_RANK vs ROW_NUMBER**: 
- `RANK()`: ties get same rank, next rank skips (1,1,3)
- `DENSE_RANK()`: ties get same rank, no skip (1,1,2) — better for "top N"
- `ROW_NUMBER()`: unique row numbers even for ties (1,2,3)

---

## Q6 (SQL): Write a query for month-over-month revenue growth.

**Model Answer:**
```sql
WITH monthly AS (
  SELECT 
    DATE_TRUNC('month', created_at)::date AS month,
    SUM(amount) AS revenue
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY 1
)
SELECT 
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
  ROUND(
    (revenue - LAG(revenue) OVER (ORDER BY month)) 
    / NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100, 2
  ) AS growth_pct
FROM monthly
ORDER BY month;
```

Key: `NULLIF(..., 0)` prevents division by zero when previous month revenue is 0.

---

## Q7 (SQL): What is a covering index? When is it useful?

**Model Answer:**
A covering index is an index that contains all columns needed to satisfy a query — the database engine can answer the query entirely from the index without touching the main table (no "table lookup" step).

```sql
-- Query: find users by email, return email and name
SELECT email, name FROM users WHERE email = 'x@y.com';

-- Regular index on (email): index lookup → row ID → table lookup → return name
-- Covering index on (email, name): index lookup → return email + name directly

CREATE INDEX idx_users_email_name ON users(email, name);
```

**When to use**: For high-frequency queries where you know exactly which columns are needed. The trade-off: larger index size, slower inserts/updates.

**PostgreSQL**: `EXPLAIN` output shows "Index Only Scan" for covering index use vs "Index Scan" (still needs heap fetch).

---

## Q8 (MongoDB): Design an aggregation pipeline to find users who made purchases every month for the last 6 months.

**Model Answer:**
```js
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

db.orders.aggregate([
  // Step 1: Filter to last 6 months
  { $match: { createdAt: { $gte: sixMonthsAgo } } },

  // Step 2: Extract year-month from date
  { $group: {
    _id: {
      userId: '$userId',
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
    }
  }},

  // Step 3: Count distinct months per user
  { $group: {
    _id: '$_id.userId',
    activeMonths: { $sum: 1 }
  }},

  // Step 4: Keep only users with 6 consecutive months
  { $match: { activeMonths: { $gte: 6 } } },

  // Step 5: Join with users collection
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
  { $unwind: '$user' },
  { $project: { email: '$user.email', name: '$user.name', activeMonths: 1 } }
]);
```

---

## Q9 (MongoDB): How would you model a social media feed in MongoDB?

**Model Answer:**
**The fan-out problem**: User A has 10M followers. When A posts, do you write to 10M followers' feeds? (fan-out on write = expensive) Or compute each user's feed on read? (fan-out on read = slow)

**Hybrid approach** (Twitter/Instagram):
- Regular users (< N followers): fan-out on write — push post to followers' feed collections in background
- Celebrities (> N followers): fan-out on read — don't pre-compute, merge celebrity posts at read time

**Schema for regular fan-out**:
```js
// posts collection
{ _id, userId, content, createdAt, likeCount, commentCount }

// feeds collection (pre-computed per user)
{ userId, posts: [{ postId, authorId, createdAt }], updatedAt }
// Index: { userId: 1, 'posts.createdAt': -1 }

// On new post: background job writes to all followers' feeds
// On read: look up feed document, populate post details
```

**Cursor-based pagination**: Store the last `createdAt` as the page cursor — `{ createdAt: { $lt: lastSeenAt } }`. Consistent even as new posts are added (unlike offset pagination which shifts).

---

## Q10 (API Design): Critique this API design.

```
POST /user/updateEmail { email: "new@example.com" }
GET /user/getAllPosts?userId=123&format=json&token=secret123
```

**Model Answer:**
Issues:
1. **Verb in URL**: `/updateEmail` violates REST. Should be `PATCH /users/:id` with body `{ email: "..." }`
2. **Singular `/user`**: conventions differ, but plural `/users/:id` is more common
3. **Token in query string**: `?token=secret123` is logged in server logs, browser history, proxy logs, CDN logs. Credentials must go in `Authorization: Bearer <token>` header
4. **`format=json`**: unnecessary. Content negotiation via `Accept: application/json` header is the standard. The API should default to JSON.
5. **`GET` with sensitive data**: `?token=secret123` combined with GET means the URL will appear in referrer headers when users click links

Fixed:
```
PATCH  /users/:id     Authorization: Bearer <token>   Body: { "email": "..." }
GET    /users/:id/posts  Authorization: Bearer <token>
```

---

## Q11 (API Design): How would you design a versioned, backward-compatible REST API?

**Model Answer:**
**Versioning strategies**:
1. **URL path** (`/api/v1/users`): explicit, easy to test with curl, cache-friendly. Most common.
2. **Header** (`Accept: application/vnd.myapi.v2+json`): cleaner URLs, but harder to test/share
3. **Query param** (`?v=2`): easy for clients, messy URLs

**Backward-compatible changes** (no version bump needed):
- Add new optional response fields
- Add new optional request parameters
- Add new endpoints

**Breaking changes** (require new version or deprecation period):
- Remove or rename fields
- Change field types
- Remove endpoints
- Change authentication mechanism

**Deprecation strategy**:
1. Keep both versions running simultaneously
2. Add `Deprecation: true` and `Sunset: <date>` response headers on v1
3. Monitor v1 traffic — reach out to API consumers
4. Remove v1 after sunset date

**API contract testing**: Consumer-driven contract tests (Pact) ensure a v2 release doesn't accidentally break v1 consumers.

---

## Q12 (System Design Mini): Design an authentication system.

**Model Answer:**
**Components**: Registration, Login, Token issuance, Token validation, Refresh, Logout, Password reset.

**Token strategy**: JWT access token (short-lived: 15 min) + refresh token (long-lived: 30 days, stored in httpOnly cookie).

**Token storage**: Access token in memory (JS variable/state) — XSS can't read it. Refresh token in httpOnly, Secure, SameSite=Strict cookie — JS can't read it.

**Flow**:
1. Login: validate credentials, create JWT (15min) + refresh token (random UUID, stored in Redis with userId), return both
2. API requests: include JWT in Authorization header — verified on each service (stateless)
3. JWT expired: client sends refresh token cookie → server validates against Redis → issue new JWT
4. Logout: delete refresh token from Redis (invalidates the session despite JWT still being valid for 15min — acceptable)
5. Password change: invalidate all refresh tokens for user (Redis: `DEL refresh:userId:*`)

**Security hardening**: bcrypt for password hashing (cost factor 12), rate limit login endpoint (5 attempts/IP/15min), account lockout after 10 failed attempts, email verification for new accounts, optional TOTP/FIDO2 MFA.

---

## Q13 (System Design Mini): Design a file upload service.

**Model Answer:**
**Requirements**: upload files up to 1GB, support resumable uploads, store securely, serve via CDN.

**Architecture**:
1. **Pre-signed URL**: Client requests a signed URL from your API. Your API generates a signed S3 PutObject URL (expires in 5 min). Client uploads directly to S3 — your server never sees the file bytes.
2. **Multipart upload (> 100MB)**: AWS S3 multipart upload. Split file into 5-100MB chunks. Upload chunks in parallel (faster). Server generates pre-signed URLs for each chunk. Client assembles.
3. **Resumable uploads**: Save multipart upload ID. If interrupted, client resumes from the last completed chunk.

**Post-upload processing**:
- S3 event → Lambda → scan for viruses (ClamAV), validate file type/size, generate thumbnails if image
- Lambda publishes to SQS on completion → backend processes the file

**Serving**: Files served via CloudFront CDN. Signed CloudFront URLs for private files (prevent direct S3 access). Cache-Control headers for static assets.

**Security**: Validate `Content-Type` on server side (don't trust client), limit file sizes, scan for malware, store in a private S3 bucket (no public access), use presigned URLs for time-limited access.

---

## Q14 (Security): Audit this code for vulnerabilities.

```js
app.get('/user', async (req, res) => {
  const { username } = req.query;
  const result = await db.query(`SELECT * FROM users WHERE username = '${username}'`);
  res.json(result.rows[0]);
});
```

**Model Answer:**
Five vulnerabilities:
1. **SQL injection**: `username = "' OR '1'='1' --"` dumps all users. Fix: parameterized query `db.query('SELECT ...WHERE username = $1', [username])`
2. **No authentication**: any anonymous user can query any username
3. **Information disclosure via `SELECT *`**: returns password hash, private fields. Fix: select specific columns: `SELECT id, username, email, created_at`
4. **No input validation**: `username` is undefined/unchecked. Null/empty query could fail or return unexpected results
5. **User enumeration**: returns different response for found vs not-found user. Fix: return same generic response or check authorization before revealing whether user exists

---

## Q15 (Behavioral): Tell me about a database performance issue you solved.

**Model Answer (STAR):**
**Situation**: An order history page was taking 8-12 seconds to load. Users were complaining and dropping off the page. The query ran fine with 100 rows in development but degraded catastrophically with 50M rows in production.

**Task**: Diagnose and fix the performance problem without data migration or schema changes (we couldn't afford downtime).

**Action**:
1. Ran `EXPLAIN ANALYZE` on the slow query — found a sequential scan on the `orders` table (50M rows): `Seq Scan on orders (cost=0.00..1847000.00 rows=50000000)`
2. The query was: `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`
3. The fix should have been obvious — `user_id` and `created_at` had no composite index
4. Created: `CREATE INDEX CONCURRENTLY idx_orders_user_created ON orders(user_id, created_at DESC)` — `CONCURRENTLY` avoided locking the table (zero downtime)
5. After index creation: query went from sequential scan (8-12s) to index scan (2ms)
6. Also found `SELECT *` was fetching a large `metadata` JSONB column not used by the page — changed to select specific columns

**Result**: Page load time went from 8-12 seconds to under 100ms. Zero downtime during the fix. Added `EXPLAIN ANALYZE` to our PR review checklist for all new queries touching large tables.
