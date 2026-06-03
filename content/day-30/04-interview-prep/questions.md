# Day 30 — Backend Mock Interview: 15 Questions + Model Answers

---

**Q1. Walk me through what happens when Node.js receives 1,000 concurrent HTTP requests. How does it handle them without crashing?**

Node.js uses a single JavaScript thread backed by libuv's event loop. When 1,000 requests arrive simultaneously, the OS queues the TCP connections. Node's event loop picks them up via the poll phase (epoll/kqueue), registering a callback for each. The JavaScript thread processes each request's callback one at a time, but because most work is I/O (database queries, file reads), each callback quickly kicks off an async operation and returns control to the event loop. The event loop processes the next request while the first one's database query runs in libuv's thread pool or the OS's async I/O subsystem. Node can handle 10,000+ concurrent connections this way because it never blocks — it orchestrates I/O rather than waiting for it. The limit is CPU-bound work: if any one request does 500ms of pure JavaScript computation, all other requests wait.

---

**Q2. A senior engineer shows you this code: `app.get('/users', async (req, res) => { const users = await db.getAll(); res.json(users); })`. What's wrong with it and how do you fix it?**

In Express 4, if `db.getAll()` rejects (database down, query error), the rejected Promise is an unhandled promise rejection — Express never catches it, and the error middleware is never called. The request hangs or produces an unhandled rejection warning. The fix: wrap with an `asyncHandler`: `app.get('/users', asyncHandler(async (req, res) => { const users = await db.getAll(); res.json(users); }))` where `asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`. This catches any thrown error or rejected promise and passes it to `next(err)`, which routes it to the error middleware. Alternative: install `express-async-errors` which patches Express to handle this automatically. In Express 5, this is handled natively.

---

**Q3. You have a MySQL table with 50 million rows. `SELECT * FROM orders WHERE user_id = 123` takes 3 seconds. Diagnose and fix.**

Run `EXPLAIN SELECT * FROM orders WHERE user_id = 123`. If `type=ALL` and `key=NULL`, there's no index on `user_id` — full table scan of 50M rows. Fix: `CREATE INDEX idx_user_id ON orders (user_id)`. This drops the query to O(log n) index lookup. But also check: (1) `SELECT *` loads all columns including large text/blob fields — replace with specific columns. (2) Is `user_id` actually selective? If every user has 100K orders, the index finds 100K rows, which is still slow. Add more filter conditions or use cursor-based pagination. (3) Check `EXPLAIN` for `Using filesort` — if there's an `ORDER BY`, add that column to the composite index: `INDEX(user_id, created_at)`. (4) Enable the slow query log and use `pt-query-digest` to find all slow queries systematically.

---

**Q4. Explain the difference between a session cookie and a JWT. Which would you choose for a new Node.js API?**

Sessions store state server-side (in Redis or a database) and give the client an opaque session ID in a cookie. Verification is a Redis lookup on every request. Advantages: instant revocation (delete the session), small cookie payload, centralized session management. Disadvantages: requires shared session store for horizontal scaling. JWTs are self-contained: the server embeds user data in the token and signs it cryptographically. Verification is pure computation (no database). Advantages: stateless (scales horizontally with no shared store), works naturally for microservices. Disadvantages: cannot be revoked before expiry without a blocklist (which adds DB round-trips). For a new API: use short-lived JWTs (15 minutes) + refresh token rotation (stored in DB) — you get stateless verification for most requests while maintaining revocation capability via the refresh token store.

---

**Q5. What is the N+1 query problem and how do you solve it in both SQL and MongoDB?**

N+1 occurs when you fetch N parent records then execute one query per parent to fetch related data. Example: fetch 100 posts, then for each post execute `SELECT * FROM users WHERE id = ?` to get the author — that's 101 queries total. In **SQL**: use a JOIN — `SELECT posts.*, users.name FROM posts JOIN users ON users.id = posts.author_id` — one query. Or use an ORM with eager loading: `Post.findAll({ include: User })`. In **MongoDB**: similar anti-pattern occurs when you loop over documents and do individual `findOne` calls per document. Fix: use `$lookup` in an aggregation pipeline to join in one operation, or use the `populate` method in Mongoose (which batches into one `$in` query behind the scenes). Detection: count your database queries in development — if you see a query count proportional to result set size, you have N+1.

---

**Q6. Walk me through designing the authentication system for a multi-service backend (API Gateway + 3 microservices).**

Architecture: single Auth Service issues JWTs signed with an RS256 private key. (1) **Auth Service** (auth.api.example.com): handles register, login, refresh token rotation. Issues access tokens (15min, RS256-signed) and refresh tokens (7 days, stored in Redis). (2) **API Gateway**: validates the JWT on every request using the Auth Service's public key (fetched from `/.well-known/jwks.json`). No database lookup needed — pure signature verification. Attaches decoded claims to the forwarded request headers. (3) **Microservices**: trust the gateway's forwarded headers — don't re-verify the JWT. Service-to-service calls use Client Credentials flow with short-lived machine tokens. (4) **Revocation**: refresh token reuse detection handles account compromise. For logout, add the `jti` claim to a short-lived Redis blocklist (max 15 minutes TTL = access token lifetime). This way, most requests are stateless, but compromise is addressable within the access token window.

---

**Q7. Your Node.js service is consuming 2GB of RAM and growing. How would you find the leak?**

Systematic approach: (1) **Confirm it's a leak** not just normal memory growth: restart the service, observe `process.memoryUsage().heapUsed` every minute. If it grows monotonically and never decreases, it's a leak. (2) **Take heap snapshots**: use `--inspect` flag, open Chrome DevTools, take a heap snapshot at startup, another after 30 minutes under traffic. Compare: look for object types that grew significantly between snapshots. (3) **Common culprits**: event listeners not removed (accumulate on emitters per request), closures holding references to request/response objects (cached callback array), global caches without eviction (Map growing forever), third-party module with a known leak. (4) **Clinic.js heapprofiler** generates a flamegraph showing allocation hotspots. (5) Check `emitter.listenerCount()` for key emitters — should stay constant under load. Fix: ensure all event listeners registered during request processing are removed when the request ends.

---

**Q8. Explain MongoDB's $lookup and when you should NOT use it.**

`$lookup` performs a left outer join by, for each document in the pipeline, querying another collection. The join runs per-document — if 10,000 documents reach the `$lookup` stage, MongoDB executes 10,000 sub-queries against the joined collection. With a proper index on the `foreignField`, each sub-query is O(log n). Without it, each is a collection scan — catastrophic. When NOT to use `$lookup`: (1) When the joined collection is enormous and the relationship is complex (MongoDB's join optimizer is far less sophisticated than a relational DB's query planner). (2) When you're doing multi-level joins (`$lookup` inside a `$lookup` pipeline) — this gets expensive quickly. (3) When the access pattern clearly shows you always access the joined data together — embed it instead and eliminate the join entirely. The right answer in MongoDB is often to restructure the schema to avoid frequent joins, not to optimize the join.

---

**Q9. Write a SQL query to find all customers who made a purchase in Q1 but not in Q2 of this year.**

```sql
SELECT DISTINCT customer_id
FROM orders
WHERE YEAR(created_at) = YEAR(CURDATE())
  AND QUARTER(created_at) = 1
  AND customer_id NOT IN (
    SELECT DISTINCT customer_id
    FROM orders
    WHERE YEAR(created_at) = YEAR(CURDATE())
      AND QUARTER(created_at) = 2
  );
```

Better (avoids NULL pitfall in NOT IN):
```sql
SELECT DISTINCT q1.customer_id
FROM orders q1
WHERE QUARTER(q1.created_at) = 1 AND YEAR(q1.created_at) = YEAR(CURDATE())
  AND NOT EXISTS (
    SELECT 1 FROM orders q2
    WHERE q2.customer_id = q1.customer_id
      AND QUARTER(q2.created_at) = 2 AND YEAR(q2.created_at) = YEAR(CURDATE())
  );
```

`NOT EXISTS` is preferred over `NOT IN` because if the subquery can return NULLs, `NOT IN` returns false for all rows. `NOT EXISTS` handles NULLs correctly.

---

**Q10. What is the difference between optimistic and pessimistic locking? Give a real-world scenario for each.**

**Pessimistic locking** acquires an exclusive lock on read (`SELECT FOR UPDATE`). Other readers/writers block until the lock is released. Scenario: bank transfer — read account balance, lock the row, verify funds, deduct. You cannot tolerate any concurrent modification to the balance between reading and writing. **Optimistic locking** reads without locking, includes a `version` column, and the update includes `WHERE id=? AND version=5`. If 0 rows updated, a conflict occurred — retry. Scenario: product inventory for an e-commerce flash sale. Most users browsing don't conflict; occasional simultaneous "add to cart" retries are acceptable. Optimistic locking scales much better for read-heavy workloads — no readers block each other. Choose pessimistic for high-contention, high-stakes operations; optimistic for low-contention, acceptable-retry scenarios.

---

**Q11. A user reports they can still use the app after clicking "Log Out". What's likely wrong and how do you fix it?**

Most likely the JWT access token is still valid on the client (hasn't expired yet). Logout only deletes the refresh token from the server-side store, but the access token itself is stateless — the server has no record of it. Fix options: (1) **Short expiry**: keep access tokens to 15 minutes. User is fully logged out in at most 15 minutes — acceptable for most apps. (2) **Token blocklist**: store the `jti` (JWT ID) claim in a Redis blocklist with TTL = token expiry time. Check the blocklist on every request. Adds one Redis lookup per request but enables instant revocation. (3) **Switch to sessions**: session invalidation is instant because the server controls the session store. (4) **Refresh token rotation with short access token**: if the user logs out and the access token expires in 15 minutes, the attacker can't get a new one (the refresh token was deleted from the DB). The 15-minute window is an acceptable tradeoff for stateless scaling.

---

**Q12. How would you implement rate limiting for a login endpoint to prevent brute-force attacks?**

Multiple layers: (1) **Per-IP rate limiting**: `5 attempts per 15 minutes per IP` — prevents one IP from trying many passwords. But corporate NATs share IPs; too aggressive blocks legitimate users. (2) **Per-account rate limiting**: `10 failed attempts per hour per email` — prevents distributed attacks targeting one account from many IPs. Lock the account after threshold, send unlock email. (3) **Progressive delays**: 1st failure = 0ms, 5th failure = 1s, 10th = 10s delay. (4) **CAPTCHA after N failures**: Google reCAPTCHA v3 invisible scoring. (5) **Never reveal whether email exists**: return the same error for wrong email AND wrong password (`"Invalid credentials"`) — prevents account enumeration. (6) **bcrypt work factor**: makes each guess computationally expensive. Even without rate limiting, cost factor 12 allows ~4 guesses/second on a modern server.

---

**Q13. What happens when you add a new `NOT NULL` column without a default to a table with 50 million rows in production?**

In MySQL 8 InnoDB, `ALTER TABLE t ADD COLUMN x INT NOT NULL` without a default will fail immediately because existing rows would violate the NOT NULL constraint. In MySQL 5.7+, this would have locked the table. The safe approaches: (1) **Add with default**: `ADD COLUMN x INT NOT NULL DEFAULT 0` — InnoDB can often do this online with `ALGORITHM=INPLACE` (instant metadata change for virtual defaults in some versions). (2) **Nullable first**: add `x INT NULL`, backfill in batches (`UPDATE t SET x=0 WHERE x IS NULL LIMIT 5000`), then alter to NOT NULL after backfill. (3) **pt-online-schema-change**: Percona's tool creates a new table, copies in batches with triggers, then swaps with minimal downtime. (4) **gh-ost**: GitHub's online schema change tool, similar to pt-osc but uses binlog-based replication. Always test migration timing on a production-size staging database first.

---

**Q14. What is a covering index? Give an example of a query that would benefit from one.**

A covering index contains all columns that a query needs — for filtering, sorting, AND projection (SELECT list). When a covering index exists, MySQL reads only index pages and never touches the actual table data pages. This eliminates the "double lookup" (secondary index → primary key → row data) for secondary indexes. Example: `SELECT email, name FROM users WHERE department_id = 5 ORDER BY last_name`. A regular index on `(department_id)` finds the rows by department, then fetches each row for `email`, `name`, and `last_name`. A covering index `(department_id, last_name, email, name)` satisfies the entire query from the index alone — no table page access. EXPLAIN shows `Extra: Using index`. Benefit is largest when rows are large (many columns) and the index is narrow — index pages are smaller and fit better in the buffer pool.

---

**Q15. Coding scenario: Design the API and data flow for a "transfer money" feature that must be safe from double charges, race conditions, and server crashes mid-transfer.**

**Complete design**:

Database: Two accounts table with `balance` and `version` columns. Transfers table records every transfer attempt.

**API endpoint**: `POST /transfers` with `Idempotency-Key` header.

**Flow**:
1. Check idempotency key in Redis — if found, return cached response (prevents double charge from client retry)
2. Validate request (positive amount, source account owned by authenticated user)
3. Start a database transaction (`BEGIN`)
4. Lock both accounts with `SELECT FOR UPDATE` — always in consistent order (lower ID first) to prevent deadlocks
5. Check sufficient balance
6. Debit source account, credit destination account
7. Insert a record into `transfers` table with status=`completed`
8. Commit the transaction
9. Store the transfer ID in Redis with the idempotency key (TTL = 24 hours)
10. Return `201 Created` with transfer details

**What this handles**:
- Double charge: idempotency key + cached response
- Race condition: `SELECT FOR UPDATE` prevents concurrent balance modifications
- Crash mid-transfer: the uncommitted transaction is rolled back automatically by InnoDB; the idempotency key was not stored yet, so the client's retry creates a new transfer safely
- Deadlock: consistent lock ordering (lower account ID first)
