# Day 33 — Interview Prep: Database Scaling

## Q1: When would you add read replicas vs when would you shard? Walk me through the decision.

**Answer:**
These solve different problems:

**Read replicas** address read-heavy workloads. You have one primary that accepts all writes, and N replicas that serve SELECT queries. The primary replicates its write log to replicas continuously. This is appropriate when: 90%+ of queries are reads, read latency is the bottleneck, and your dataset fits on a single node.

Tradeoff: Replication lag — replicas may be milliseconds to seconds behind. Reads that must be current (balance checks, inventory availability for purchase decisions) must go to the primary.

**Horizontal sharding** addresses write throughput limits or dataset size exceeding a single node. Sharding splits data across multiple nodes, each responsible for a subset. Appropriate when: write QPS exceeds what one node can handle, or data volume exceeds single-node capacity.

Sharding is significantly more complex — it requires: careful shard key selection, application-level routing, scatter-gather for cross-shard queries, and a complex resharding process.

**My decision order:**
1. Add indexes (free, try first)
2. Add Redis cache in front of DB (handles most read load)
3. Add read replicas (simple, no app-level sharding logic)
4. Vertical scale the primary (buy a bigger machine — still simple)
5. Shard only when the above is insufficient

Sharding should be a last resort because it adds permanent operational complexity.

---

## Q2: What makes a good shard key? What are the symptoms of a bad shard key?

**Answer:**
A shard key determines which shard each row lives on. A bad choice ruins the entire benefit of sharding.

**Characteristics of a good shard key:**
- **High cardinality:** Must have many unique values. Using `country` as a shard key gives you at most 200 possible shard locations.
- **Even write distribution:** Avoid monotonically increasing values (auto-increment IDs, timestamps). All new rows land on the same shard — temporal hotspot.
- **Query alignment:** The most common queries should be answered from a single shard. If 90% of queries are "get orders for user X," shard by `user_id` so all that user's orders are co-located.
- **Low hotspot probability:** Celebrity users (millions of queries/second) or trending products can overload a single shard. Consider separate handling (like Twitter's celebrity tweet injection).

**Symptoms of a bad shard key:**
- One shard at 90% disk/CPU utilization while others are idle (hotspot)
- Almost every query requires scatter-gather across all shards (wrong alignment)
- The "latest" shard constantly getting hammered while historical shards are cold (temporal hotspot from timestamp key)
- You can never reshard without touching every row (extremely poor hash function)

---

## Q3: Explain CQRS. Why would you use it and what consistency model does it imply?

**Answer:**
CQRS (Command Query Responsibility Segregation) separates the write path (commands: create, update, delete) from the read path (queries). They use separate data models and often separate storage.

**Why use it:**
Write operations require business logic validation, normalization, consistency guarantees, and transaction support. Read operations need denormalized, pre-joined, view-friendly data — often very different from the normalized write schema.

Trying to serve both from the same schema creates tension: normalize for writes (slower reads requiring joins), or denormalize for reads (complex writes maintaining denormalized state). CQRS eliminates this tension by using different schemas for each concern.

**Implementation:**
1. Command handler validates business rules and writes to the write store (normalized relational DB)
2. Domain event is published (to Kafka, outbox table, or in-process EventEmitter)
3. Read model projector subscribes to events and updates read stores (denormalized DB tables, Elasticsearch, Redis cache)
4. Query handler reads from the read store only

**Consistency model:** Eventual consistency between write and read models. The read model lags behind by the event propagation latency (milliseconds to seconds). This is acceptable for most features (product catalog, order history, analytics). Not acceptable for: "show balance immediately after deposit" — which requires either reading from the write model for that specific case, or using read-your-writes tracking.

**When to use:** Complex domain with many different read patterns (dashboard, reports, user-facing views), high read:write ratio, need to scale reads independently, multiple bounded contexts consuming the same data.

---

## Q4: What is event sourcing? How is it different from CQRS?

**Answer:**
**Event sourcing** is a persistence pattern where, instead of storing the current state, you store the sequence of events that led to that state. The current state is derived by replaying all events from the beginning (or from the last snapshot).

Example — bank account:
- **Traditional:** Store `{accountId: 1, balance: 3800}` — just the current state
- **Event sourcing:** Store `[AccountOpened(balance=0), Deposited(5000), Withdrawn(1200)]` — and compute balance by replay

**Benefits:**
- Complete audit trail with zero extra effort
- Rebuild state at any historical point in time (temporal queries)
- Can create new read projections retroactively by replaying the event log
- Events are facts — append-only, immutable, no lost information
- Natural fit for domain-driven design

**Drawbacks:**
- Eventual consistency of read models (derived from async event replay)
- Long event streams require snapshots (every 1000 events, save current state as snapshot, replay only from there)
- Schema evolution is hard — if an event's structure changes, old events must still be understood
- Debugging is complex (must trace event chain)

**CQRS vs Event Sourcing:**
These are different concepts that are often combined but don't require each other:
- CQRS: architectural pattern separating read/write models
- Event Sourcing: persistence pattern where state = replay of events
- You can use CQRS without event sourcing (separate read/write tables)
- You can use event sourcing without CQRS (replay events to single model)
- They're commonly combined because event sourcing naturally produces events that update CQRS read models

---

## Q5: What is connection pooling and why does pool exhaustion cause outages?

**Answer:**
**Why pooling:** PostgreSQL creates a new OS process per connection (~10MB RAM each). Accepting 10,000 application connections = 10,000 PostgreSQL processes = 100GB RAM just for connection overhead + context-switching overhead. PgBouncer solves this by multiplexing many application connections to a small number of actual PostgreSQL connections.

**Connection pool exhaustion:**
When all pool connections are in use and a new request arrives, it enters a wait queue. If the wait time exceeds the request timeout (typically 5-30 seconds), the request fails with a connection timeout error.

**Cascade failure scenario:**
1. Slow query starts taking 30 seconds instead of 100ms (DB issue)
2. Connections are held for 30s instead of 100ms → pool exhausts 300x faster
3. New requests queue up → queue fills → requests start timing out
4. Clients retry → more requests → deeper queue → more timeouts
5. Application appears completely down even though the DB is technically responding

**Fixes:**
- Configure pool size based on: `num_cores × 2 + effective_spindle_count` (HikariCP recommendation), not "as large as possible"
- Set pool `connectionTimeout` = max acceptable wait in queue (fail fast, don't queue forever)
- Use `PgBouncer` in transaction pooling mode: connection returned to pool after each transaction, not after session ends — allows 1000 app connections to share 50 PG connections
- Set `statement_timeout` on DB to kill runaway queries that hold connections
- Monitor: alert when pool utilization > 80%

---

## Q6: Explain consistent hashing. How does it handle node addition and removal?

**Answer:**
Standard `hash(key) % N` causes `(N-1)/N` of keys to remap when N changes — catastrophic for a cache (cache miss tsunami) or distributed database.

Consistent hashing maps both nodes and keys to a circular ring (0 to 2^32). A key belongs to the first node clockwise from its hash position on the ring.

**Adding a node:** The new node is inserted between two existing nodes on the ring. Only the keys between the new node and its counter-clockwise predecessor need to move from the predecessor to the new node. Approximately 1/N of total keys are remapped.

**Removing a node:** Its keys move to the next clockwise node. Only that node receives the migrated keys. Again ~1/N keys affected.

**Virtual nodes solve uneven distribution:** Without virtual nodes, nodes are assigned random positions on the ring. With 3 nodes, distribution might be 60%/25%/15% by chance. Virtual nodes give each physical node 100-200 positions on the ring, statistically guaranteeing near-equal distribution. When adding a new node with virtual nodes, keys migrate from many different existing nodes (not just one) — the load is spread during migration.

**Used in:** DynamoDB, Cassandra, Redis Cluster (hash slots variant), Memcached (ketama), content-delivery systems for CDN node selection.

---

## Q7: What are the tradeoffs between multi-master and primary-replica replication?

**Answer:**

**Primary-Replica (single-primary):**
- All writes go to one primary; replicas are read-only
- No write conflicts — only one node accepts writes
- Simple consistency model
- Tradeoff: write throughput limited to one machine; primary failure requires failover (brief downtime or loss of uncommitted writes with async replication)
- Use when: strong consistency, single geographic region, write throughput fits on one machine

**Multi-Master:**
- Multiple nodes accept writes simultaneously
- Higher write availability: any node can accept writes
- Required for: active-active multi-region (write to local region, replicate across)
- Tradeoff: **write conflicts** — two nodes can accept conflicting writes to the same row simultaneously

**Conflict resolution strategies:**
1. **Last-write-wins (LWW):** Use wall clock timestamp; latest timestamp wins. Problem: clock skew between servers means "later timestamp" may actually be an older write. Can silently lose data.
2. **Logical clocks / vector clocks:** Each update carries a vector of logical timestamps per node. Detects when two writes are causally unrelated (true conflict) vs one happened-before the other.
3. **CRDTs:** Data structures mathematically guaranteed to merge without conflicts. Increment counters, grow-only sets, etc. Used in collaborative editing (Google Docs uses OT, similar principle).
4. **Application-level resolution:** On conflict detection, call custom logic. Most flexible, highest complexity.

**Bottom line:** Multi-master is worth the complexity only when: active-active multi-region is required for write latency or availability, AND the data model can tolerate or has defined conflict resolution for concurrent writes.

---

## Q8: How does database federation differ from sharding, and when would you choose federation first?

**Answer:**
**Sharding:** Takes one large table (e.g., the users table) and splits its rows across multiple database instances based on a shard key. All instances hold the same table schema; each holds a subset of rows.

**Federation:** Splits the database by functional domain. Instead of one monolithic database serving all of your application, you have separate databases: users_db, products_db, orders_db, analytics_db. Each service owns its own database schema — the schemas are completely different.

**Why federation first:**
1. **Simpler operationally:** Each database is small and manageable. No shard key selection, no scatter-gather queries, no cross-shard join complexity.
2. **Independent scaling:** The products catalog database (read-heavy, small) scales differently from the orders database (write-heavy, large). With a monolith DB, you scale the whole thing even if only orders need more resources.
3. **Team ownership:** In a microservices architecture, each team owns their database schema. No schema migration coordination across teams.
4. **Natural fit for microservices:** Each service's data model evolves independently.

**When to shard instead:** When a single functional domain's data grows beyond what one database can handle. For example, the orders service eventually grows to 10TB of orders data — then shard the orders database by customer_id. You shard within a domain after federation.

The evolution is typically: monolith DB → federated databases per service → shard individual databases as they grow.
