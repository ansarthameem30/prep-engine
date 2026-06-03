# Day 30 — Backend Mock Interview Prep

## Top 25 Backend Concepts Checklist

### Node.js
- [ ] Event loop phases (timers → pending I/O → idle/prepare → poll → check → close)
- [ ] process.nextTick vs setImmediate vs setTimeout(fn,0) execution order
- [ ] Worker threads vs child_process — when to use each
- [ ] libuv thread pool — what operations use it, how to size it
- [ ] Blocking the event loop — common mistakes and detection
- [ ] Streams: 4 types, pipeline(), backpressure mechanism

### Express.js
- [ ] Middleware execution order and error middleware (4-param signature)
- [ ] asyncHandler pattern — why Express 4 doesn't catch async errors
- [ ] Rate limiting for distributed systems (Redis store)
- [ ] Helmet headers — what each protects against
- [ ] Request validation with Zod — why better than express-validator

### REST API Design
- [ ] URL design: nouns not verbs, plural resources, max 2 nesting levels
- [ ] HTTP method semantics: PUT vs PATCH, idempotency
- [ ] Status codes: 400 vs 401 vs 403 vs 422 vs 409
- [ ] Cursor-based vs offset pagination — why cursor is better at scale
- [ ] API versioning strategies — URI path vs header
- [ ] Idempotency keys for POST requests

### MySQL
- [ ] B-tree index structure — how range queries work
- [ ] Clustered vs secondary index — the double lookup
- [ ] Composite index leftmost prefix rule
- [ ] EXPLAIN output — type=ALL vs range vs ref vs const
- [ ] ACID properties — how each is implemented in InnoDB
- [ ] Transaction isolation levels — REPEATABLE READ default in MySQL
- [ ] Deadlock — detection, rollback, prevention strategies

### MongoDB
- [ ] Aggregation pipeline — $match early for index usage
- [ ] $lookup performance considerations
- [ ] Embed vs reference decision — access pattern drives the choice
- [ ] $facet — multiple aggregations in one pass

### Authentication
- [ ] JWT structure and signature verification
- [ ] HS256 vs RS256 — symmetric vs asymmetric
- [ ] Refresh token rotation + reuse detection
- [ ] CORS preflight — why `*` doesn't work with credentials
- [ ] SameSite cookie attribute — Lax vs Strict vs None
- [ ] bcrypt cost factor — why MD5/SHA1 are wrong for passwords

---

## Common Trick Questions

**"What happens when you `await` a non-Promise?"**
It wraps the value in `Promise.resolve(value)`, which resolves immediately. `await 42` is equivalent to `await Promise.resolve(42)` — it yields to the microtask queue once but immediately resolves. This is defined behavior in the spec.

**"Can MongoDB do joins?"**
Yes, via `$lookup` in the aggregation pipeline. However, MongoDB is not optimized for complex joins like a relational database — the join runs per document in the pipeline, and without proper indexing on `foreignField`, each lookup is a collection scan. For complex, highly relational data, MongoDB joins are significantly less efficient than SQL JOINs. The architectural answer: MongoDB is designed for embedded data access patterns; if you find yourself doing many joins, the data might be better served by a relational database.

**"Is Node.js single-threaded?"**
Yes and no. JavaScript execution is single-threaded (one V8 thread). But Node.js uses multiple threads through libuv: the thread pool (default 4 threads) handles filesystem operations, DNS lookups, and crypto. The OS I/O (network, pipes) uses the OS async APIs. Worker Threads (`worker_threads` module) can add true multi-threaded JavaScript execution. So the accurate answer is: "Node.js JavaScript is single-threaded, but the runtime uses multiple threads for I/O and provides Worker Threads for CPU-bound JavaScript."

**"When would you use SQL vs NoSQL?"**
Decision framework:
- **SQL** when: complex queries with multiple JOINs, strict schema enforcement, many-to-many relationships, ACID transactions across multiple entities, complex aggregate reports
- **NoSQL (MongoDB)** when: flexible/evolving schema, document-oriented data accessed together (denormalized), horizontal scaling required from the start, time-series data, content management with variable structure
- **The honest answer**: many apps work fine with either. The real deciding factor is often team expertise and the specific data access patterns.

**"How do you scale a Node.js app?"**

1. **Vertical scaling**: increase server CPU/RAM (limited, expensive)
2. **Clustering**: use `cluster` module or PM2 to run N worker processes per server (N = CPU cores). Each worker handles requests. Built-in Node.js cluster module or PM2 `instances: 'max'`
3. **Horizontal scaling**: run multiple servers behind a load balancer. Requires **stateless design** — no in-memory session state (use Redis for sessions), no local file storage (use S3)
4. **Async everything**: non-blocking I/O means one Node.js process handles thousands of concurrent connections
5. **Caching**: Redis for frequently accessed data to reduce DB load
6. **Database**: read replicas for read-heavy workloads, connection pooling

---

## Coding Challenge Prep: REST API Design Questions

**"Design a URL structure for..."** — Remember: nouns, plural, max 2 nesting levels, use query params for filtering.

**"What status code for..."** — 422 for validation, 409 for conflicts, 401 for missing auth, 403 for insufficient permissions.

**"How would you handle..."**
- Payment idempotency → `Idempotency-Key` header + Redis cache
- Rate limiting in a cluster → Redis-backed store with sliding window
- Large file upload → multipart stream to S3 (never buffer)
- Slow database query → add index, use EXPLAIN, consider caching

---

## System Design Mini: Multi-tenant SaaS Database

**Question**: "How would you design the database for a multi-tenant SaaS application?"

**Answer framework**:

1. **Clarify requirements**: How many tenants? Compliance needs (GDPR, SOC2)? Per-tenant customization? Tenant size range?

2. **Row-level isolation** (start here for most SaaS):
   - All tenants share tables
   - Every table has `tenant_id` column
   - Application enforces `WHERE tenant_id = ?` on every query
   - Risk: missing filter = data breach. Mitigate with ORM-level default scopes
   - Indexes: all hot columns composite with `tenant_id` first: `INDEX(tenant_id, created_at)`
   - Pro: cheap, easy migrations (one schema)

3. **Schema-per-tenant** (for enterprise plans):
   - Each tenant gets a PostgreSQL schema or MySQL database
   - No accidental cross-tenant queries possible
   - Migration tools (Flyway, Liquibase) must run per tenant
   - Connection routing: `SET search_path = tenant_123` on connection checkout

4. **Database-per-tenant** (for highly regulated customers):
   - Complete isolation, GDPR data residency (EU tenants on EU servers)
   - Most expensive: N × connection pools, N × migrations
   - Use with: customer-managed encryption keys, audit requirements

5. **Hybrid** (most practical at scale):
   - Free/pro: row isolation
   - Enterprise: separate schema or database
   - Route by subdomain or tenant metadata to the correct isolation strategy
