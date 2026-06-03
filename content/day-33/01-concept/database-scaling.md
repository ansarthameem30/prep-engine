# Day 33 — System Design: Database Scaling

## The Scaling Journey

Most applications start with a single relational database. As load grows, you follow a predictable path: add indexes → add caching → add read replicas → shard horizontally. Understanding each step, its tradeoffs, and when to apply it is core to senior-level system design.

---

## Read Replicas

The first scaling move for read-heavy applications. A primary database accepts all writes. One or more replicas receive a continuous stream of write operations (replication log) and apply them.

**Replication lag:** Replicas are always slightly behind the primary — anywhere from milliseconds (synchronous) to minutes (under heavy write load). This is critical for application design.

**What reads can tolerate lag?**
- Acceptable: social feed (a 100ms delay seeing a new post is fine), product catalog, analytics dashboards
- Not acceptable: "show my just-submitted order confirmation," financial balances, inventory counts used for purchase decisions

**How to handle read-your-writes consistency:**
1. Route writes and immediate follow-up reads to the primary
2. Use a session token carrying the write timestamp; route reads to replicas only if replication has caught up past that timestamp
3. For critical reads: add `/* master */` comment in SQL to force primary routing (works with ProxySQL)

**Setting up read routing in Node.js with Sequelize:**
```javascript
const sequelize = new Sequelize({
  replication: {
    read: [{ host: 'replica-1' }, { host: 'replica-2' }],
    write: { host: 'primary' }
  }
});
```

---

## Vertical Scaling Limits

Before sharding, max out the single node. The largest production database instances:
- AWS RDS PostgreSQL: `db.x2iedn.32xlarge` — 128 vCPUs, 4TB RAM, ~$26/hr
- AWS RDS MySQL: `db.x2g.16xlarge` — 64 vCPUs, 1TB RAM
- Amazon Aurora: up to 128 vCPUs, 512GB RAM

Beyond these, vertical scaling is impossible. More importantly: cost curves exponentially, and a single instance is still a single point of failure.

---

## Horizontal Sharding Strategies

Sharding splits data across multiple database instances (shards). Each shard holds a subset of rows.

### Range-Based Sharding
Partition by value range: users with `id 1-10M` → shard 1, `10M-20M` → shard 2.

Pros: Simple to implement. Range queries stay on one shard (`WHERE created_at BETWEEN ...`).

Cons: **Hot spots** — all new users go to the latest shard. All recent activity on the highest shard. Uneven load distribution. Resharding requires moving data.

### Hash-Based Sharding
`shard = hash(user_id) % num_shards`

Pros: Even distribution. No hot spots (assuming good hash function).

Cons: Range queries are impossible without scatter-gather across all shards. **Resharding is painful** — changing `num_shards` remaps almost all keys. Standard fix: consistent hashing.

### Directory-Based Sharding
Maintain a lookup table: `user_id → shard_id`. Most flexible — can move individual users between shards, supports non-uniform partition sizes.

Cons: The lookup table becomes a **bottleneck and single point of failure**. Must be highly available, fast, and consistent.

### Geographic Sharding
Users in the US → US data center, EU users → EU data center.

Pros: Low latency for users. Data sovereignty (GDPR requires EU data in EU).

Cons: Queries across regions are expensive. Account recovery (user travels) requires cross-region lookups.

---

## Consistent Hashing for Sharding

Using `hash % N` means resharding remaps (N-1)/N keys — nearly everything. Consistent hashing limits remapping to ~1/N of keys.

Both database nodes and keys map to a ring. A key belongs to the first node clockwise from its hash. Adding a node: takes keys from its clockwise neighbor. Removing a node: its keys migrate to the next node clockwise.

**Virtual nodes** (vnodes) give each physical server 100-200 positions on the ring, ensuring even distribution and minimizing the variance in how many keys each node gets.

CockroachDB, Cassandra, and DynamoDB all use consistent hashing variants internally.

---

## Shard Key Selection: The Most Important Decision

A bad shard key causes hotspots and ruins horizontal scaling.

**Rules for good shard keys:**
1. **High cardinality:** The key must have many unique values (user_id: millions of values is good; country_code: 200 values is bad — creates exactly 200 shards max)
2. **Even write distribution:** Avoid monotonically increasing keys (auto-increment IDs, timestamps) — all new writes go to one shard
3. **Aligned with query patterns:** The most common queries should target one shard (no scatter-gather)
4. **Avoid hotspots:** Celebrity users, popular products will receive disproportionate traffic — consider compound keys or separate treatment

**Bad shard key example:** `created_at` for an orders table. All today's orders go to today's shard. Yesterday's shard is idle.

**Good shard key example:** `customer_id` for orders. Assuming even customer distribution, each customer's orders (including new ones) are on the same shard. Range queries for one customer stay local.

---

## Cross-Shard Queries

When your query spans multiple shards, you have two options:

**Scatter-gather:** Send the query to all shards in parallel, collect results in the application, merge/sort/aggregate. Works but adds latency proportional to the slowest shard. OK for analytics. Bad for real-time user-facing queries.

**Denormalization:** Pre-compute cross-shard joins when data is written. Store derived data with each entity so reads need only one shard. Trade: write complexity for read simplicity. Standard in high-scale systems (Twitter, Instagram).

**Application-level join:** Retrieve IDs from one shard, fetch full objects from another shard by their IDs. Two sequential queries vs one DB join. Usually acceptable if IDs fit in one response.

---

## Database Proxies

**ProxySQL (MySQL):** Sits between application and database. Features: connection pooling (applications open 10K connections, ProxySQL maintains 100 to MySQL), read/write splitting (`SELECT` → replicas, writes → primary), query routing, query rewriting, slow query analysis.

**PgBouncer (PostgreSQL):** Lightweight connection pooler. PostgreSQL forks a process per connection — 10,000 connections = 10,000 processes = CPU collapse. PgBouncer maintains a small pool (50-200 connections), queuing application requests. Three modes: session pooling, transaction pooling (most common), statement pooling.

**Connection pool exhaustion** is one of the most common production database outages. A traffic spike causes more connections than the pool allows → new requests queue → queue fills → requests fail with "too many connections" or timeout.

---

## CQRS: Command Query Responsibility Segregation

Separate the write model (commands: CreateOrder, UpdateInventory) from the read model (queries: GetOrderHistory, DashboardStats).

**Why:** Write operations often involve complex business logic, validations, and normalization (3NF). Read operations often need denormalized, pre-joined, view-friendly data. Trying to serve both from the same model creates competing requirements.

**Implementation:**
1. **Command side:** Receives mutations, applies business rules, writes to the write store (normalized relational DB), publishes domain events
2. **Event bus:** Kafka topic, outbox table, or in-process events
3. **Read side:** Consumes events, maintains read-optimized projections (denormalized tables, pre-aggregated views, Elasticsearch index, Redis cache)

**Tradeoff:** The read model is eventually consistent with the write model. Fine for most features. Not suitable for: "show me the balance I just deposited" (needs strong consistency).

---

## Event Sourcing

Instead of storing current state, store an append-only log of all events:
```
AccountCreated { userId: 1, initialBalance: 0 }
MoneyDeposited { userId: 1, amount: 1000 }
MoneyWithdrawn { userId: 1, amount: 200 }
```

Current state = replay all events. Kafka can serve as the event store.

**Benefits:** Complete audit trail for free. Reconstruct state at any point in time. Multiple read projections from the same event stream. Enables temporal queries ("what was the balance at 2PM yesterday?").

**Drawbacks:** Eventually consistent read models. Snapshot optimization needed for long event streams. Complex to implement correctly (event schema evolution, replaying millions of events).

---

## Multi-Master Replication

Multiple nodes accept writes simultaneously. Useful for: geo-distributed systems (write to nearest region), high write availability.

**Conflict resolution strategies:**
- **Last-write-wins (LWW):** Use timestamps; latest write wins. Risk: clock skew causes data loss.
- **CRDTs (Conflict-free Replicated Data Types):** Data structures mathematically guaranteed to merge consistently (counters, sets, LWB registers). Used by Riak, Apple iCloud.
- **Application-level resolution:** On conflict detection, call custom business logic. Most flexible, most complex.

---

## When to Consider NoSQL

Switch from relational DB when you have genuine need, not just because NoSQL is trendy:
- **Flexible/unpredictable schema:** Document DB (MongoDB) allows schema evolution without migrations
- **Horizontal write scale:** Wide-column (Cassandra) distributes writes across nodes automatically
- **Simple key lookups at massive scale:** DynamoDB, Redis — no need for relational query power
- **Graph data:** Neo4j when relationship traversal is the primary query type
- **Time series data:** InfluxDB, TimescaleDB (Postgres extension) optimized for append-heavy time-ordered data

---

## Federation: Splitting Before Sharding

Before sharding a single large database horizontally, split it by functional domain:
- `users_db` — user accounts, authentication
- `products_db` — catalog, inventory
- `orders_db` — order processing, payments
- `analytics_db` — read-only, can be eventual, separate infra

Each service owns its database. This is the microservices database pattern. Benefits: independent scaling per domain (orders DB scales independently of users DB), independent team ownership, smaller databases are easier to shard later.

The tradeoff: cross-service queries now require API calls instead of SQL joins. Denormalization and eventual consistency are required.
