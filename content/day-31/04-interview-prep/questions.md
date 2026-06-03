# Day 31 — Interview Prep: System Design Foundations

## Q1: Explain the CAP theorem. Why does "CA" not meaningfully exist in distributed systems?

**Answer:**
CAP states that a distributed data store can guarantee at most two of: Consistency (every read reflects the latest write), Availability (every request gets a response), and Partition Tolerance (the system operates despite network partitions).

The key insight is that network partitions are a physical reality, not a choice. Hardware fails, network cables get cut, and data centers lose connectivity. Therefore, partition tolerance is not optional — every real distributed system must tolerate partitions to some degree.

During a partition, you must choose: do you return an error (sacrificing availability) to avoid returning stale data, or do you return potentially stale data (sacrificing consistency) to stay available? That is the CP vs AP choice.

A "CA" system would need to guarantee both consistency and availability even when nodes cannot communicate — which is physically impossible if you want to accept writes to multiple nodes simultaneously. Single-node databases (like SQLite) are technically CA, but they're not "distributed."

**Real examples:**
- **CP:** HBase, ZooKeeper — refuse writes during partition to maintain consistency. Critical for coordination services.
- **AP:** Cassandra, DynamoDB (default), CouchDB — serve reads/writes during partition, accept temporary inconsistency. Good for shopping carts, social feeds.
- **Tunable:** DynamoDB with `ConsistentRead: true` per-request gives CP behavior.

---

## Q2: Your application is getting 10x traffic. Walk me through your scaling strategy.

**Answer:**
I approach this systematically:

1. **Identify the bottleneck first** — is it CPU (app tier), I/O (database), memory (cache), or network? Profile before scaling.

2. **Caching layer first** — most traffic spikes can be handled by adding Redis in front of the database. 80% of traffic typically reads the same 20% of data (Pareto). A cache miss rate drop from 100% to 20% reduces DB load by 80%.

3. **Horizontal scaling of the app tier** — add more stateless app servers behind the load balancer. Requires stateless sessions (JWT or Redis-backed sessions). Add Auto Scaling Group with target tracking on CPU.

4. **Read replicas for the database** — add read replicas and route SELECT queries there. This handles read-heavy workloads without changing the primary.

5. **CDN for static assets** — offload HTML/CSS/JS/images to CloudFront. 60-80% of requests are often static assets.

6. **Database sharding** — only if steps 1-5 are insufficient. Sharding adds significant operational complexity.

7. **Async processing** — move non-critical work (email, image processing, analytics) to message queues (Kafka, SQS). Reduces synchronous request latency.

---

## Q3: What is consistent hashing and why is it better than modulo hashing for distributed caches?

**Answer:**
**Modulo hashing:** `server = hash(key) % N`. Simple, but when N changes (adding/removing a server), almost all keys hash to different servers — causing a cache miss storm and database overload.

**Consistent hashing:** Both servers and keys are mapped onto a circular ring (0 to 2^32). A key is assigned to the first server clockwise from its position. When you add or remove a server, only ~1/N of keys need to be remapped (only those between the new/removed server and its predecessor).

**Virtual nodes** solve the uneven distribution problem. Each physical server is represented by multiple points on the ring (e.g., 150 virtual nodes). This ensures even distribution and smooth load redistribution when nodes change.

**Interview-level detail:** Consistent hashing is used by DynamoDB, Apache Cassandra, Memcached (ketama), and Redis Cluster for key-to-node assignment.

---

## Q4: How do you identify and eliminate single points of failure in a system design?

**Answer:**
A SPOF is any component whose failure takes down the entire system. My process:

1. **Trace each request path** — every hop is a potential SPOF.
2. **Ask "what happens if this component fails?"** for each component.

Common SPOFs and fixes:
- **Single load balancer** → AWS ALB (managed, multi-AZ) or Nginx with Keepalived
- **Single app server** → Auto Scaling Group with min 2 instances across 2+ AZs
- **Single database** → Primary-replica with automatic failover (RDS Multi-AZ)
- **Single cache node** → ElastiCache cluster mode or Redis Sentinel (3-node minimum)
- **Single AZ** → Deploy across ≥2 AZs; RDS Multi-AZ is cross-AZ by definition
- **Single region** → Route53 failover routing to secondary region (for critical systems)
- **DNS** → Use Route53 with health checks; consider secondary DNS provider

The goal is eliminating single points, not eliminating failures — failures will happen.

---

## Q5: What is the difference between L4 and L7 load balancing? When would you choose each?

**Answer:**
**L4 (Transport layer):** Routes based on IP address and TCP/UDP port. Does not inspect packet payload. Very fast, low latency. Cannot perform content-based routing. Preserves connection state (same TCP connection goes to same backend). Example: AWS Network Load Balancer (NLB).

**Use L4 when:** Ultra-low latency is critical (gaming, real-time), non-HTTP protocols (custom TCP, UDP, WebSocket connections that shouldn't be re-terminated), or when SSL termination is not desired at the LB.

**L7 (Application layer):** Routes based on HTTP headers, URL, cookies, or body content. Can do path-based routing (`/api/*` → API servers), host-based routing, SSL termination, sticky sessions via cookie, health checks at HTTP level, WAF integration. Example: AWS Application Load Balancer (ALB).

**Use L7 when:** You have multiple services (microservices) on the same domain, you need sticky sessions, you want SSL termination at the LB, or you need HTTP-aware features like rate limiting or request routing.

**In practice:** Most web applications use L7. L4 is for edge cases requiring maximum throughput or non-HTTP protocols.

---

## Q6: Walk me through the PACELC theorem. How is it more useful than CAP for real-world database selection?

**Answer:**
CAP only describes behavior during network partitions, which are relatively rare. PACELC extends CAP: **P**artition → choose between **A**vailability and **C**onsistency; **E**lse (no partition) → choose between **L**atency and **C**onsistency.

The "Else" part is what makes PACELC more useful. During normal operation (no partition), a database choosing strong consistency must perform synchronous replication — all replicas must acknowledge writes before returning to the client. This increases write latency. A database choosing low latency uses asynchronous replication — write returns immediately, replicas catch up later — risking stale reads.

**Examples:**
- **DynamoDB:** PA/EL — prefers availability during partition; prefers low latency during normal operation (eventual consistency default, consistent reads optional at higher latency/cost)
- **Google Spanner:** PC/EC — consistent during partition AND during normal operation, at the cost of higher latency (uses GPS/atomic clocks for global time sync)
- **Cassandra:** PA/EL — highly available, low latency, eventually consistent
- **MySQL (synchronous replication):** PC/EC — consistent always, higher write latency

**Practical use:** When a client says "we need the database to always return up-to-date data," ask about their latency tolerance — PACELC shows that strong consistency has a latency cost even in the happy path.

---

## Q7: How do you approach back-of-envelope estimation in a system design interview?

**Answer:**
The goal is not a precise answer — it's to show structured reasoning and identify architectural constraints.

**My framework:**

1. **Establish users:** DAU = Total Users × 10-20% (typical engagement rate)
2. **Calculate QPS:** Requests/day ÷ 86,400 seconds = QPS. Multiply by 2-3x for peak.
3. **Separate read/write ratio:** Most systems are 90:10 or 95:5 read-heavy.
4. **Storage:** Average object size × writes per day × retention period
5. **Bandwidth:** Read QPS × average object size = outbound bandwidth

**Key numbers to memorize:**
- 1 day ≈ 100,000 seconds
- 1M req/day ≈ 12 req/sec
- 1 tweet ≈ 280 bytes ≈ 1KB with metadata
- 1 photo ≈ 100KB thumbnail, 3MB full
- 1 second of 1080p video ≈ 4MB

**Why it matters architecturally:**
- If QPS > 10,000: must think about horizontal scaling
- If storage > 1TB: object storage (S3) not just a DB
- If bandwidth > 1 Gbps: CDN is mandatory, not optional
- If write QPS > 10,000: consider write-behind caching, sharding

---

## Q8: What is the difference between BASE and ACID, and when would you choose each?

**Answer:**
**ACID (Atomicity, Consistency, Isolation, Durability):** All-or-nothing transactions. A bank transfer either debits AND credits, or neither happens. Used in PostgreSQL, MySQL, Oracle. Guarantees that the database is always in a valid state. Ideal for financial systems, order processing, inventory management — anywhere where data correctness is critical and partial writes are catastrophic.

**BASE (Basically Available, Soft state, Eventually consistent):** Accepts that the system will be available even if data is temporarily inconsistent. A shopping cart showing a stale item count is acceptable. User profile updates propagating to 99% of servers in 200ms is fine. Used in Cassandra, DynamoDB, CouchDB.

**Choosing ACID:**
- Financial transactions (money movement)
- Inventory management (preventing overselling)
- Any operation where a partial state causes real-world harm
- When strong consistency is a business requirement

**Choosing BASE:**
- Social media feeds, activity streams
- Analytics, metrics aggregation
- User preference/settings storage
- Systems where scale requirements make ACID prohibitively expensive
- Shopping carts (eventual consistency of "items in cart" is acceptable)

**The nuance:** Many modern systems use ACID for the core critical path (order placement) and BASE for surrounding features (recommendation history, view counts). This hybrid is often the right architectural choice.
