# Day 31 — System Design: Foundations + Scalability

## Why System Design Matters at the Senior Level

System design interviews separate mid-level developers from senior engineers. A senior engineer is expected to reason about distributed systems, identify failure points, estimate scale, and communicate tradeoffs fluently. This document covers the foundational vocabulary and mental models that underpin every system design conversation.

---

## Vertical vs Horizontal Scaling

**Vertical scaling** (scaling up) means adding more resources to a single machine — more CPU cores, RAM, or faster storage. It is the simplest approach: no application code changes, no distribution complexity. The limits are stark:
- The largest AWS EC2 instance (u-24tb1.metal) has 448 vCPUs and 24TB RAM, costing ~$218/hour
- Single machine = single point of failure
- Diminishing returns: doubling CPU does not double throughput for I/O-bound workloads
- Hardware failures still cause downtime

**Horizontal scaling** (scaling out) means adding more machines. It is cost-effective (commodity hardware), provides redundancy, and theoretically has no upper limit. The requirement is **statelessness**: if any request can be routed to any server, the server cannot hold session state in memory. State must live in shared storage (database, Redis, S3). This is why JWT replaced server-side sessions for many architectures.

---

## Load Balancing

A load balancer distributes incoming traffic across multiple backend servers. Two major layers:

**L4 (Transport Layer):** Operates on TCP/UDP. Faster because it does not inspect packet contents. Routes based on IP + port. Example: AWS Network Load Balancer. Use when you need raw throughput (gaming, streaming raw bytes).

**L7 (Application Layer):** Operates on HTTP/HTTPS. Can inspect headers, cookies, URL paths, and body. Enables content-based routing (route `/api/*` to API servers, `/static/*` to CDN), SSL termination, and sticky sessions. Example: AWS Application Load Balancer. The standard choice for web applications.

**Load balancing algorithms:**
- **Round Robin:** Request 1 → Server A, Request 2 → Server B, Request 3 → Server C, repeat. Simple, assumes equal server capacity.
- **Weighted Round Robin:** Server A gets 60% (more powerful), Server B gets 40%. Handles heterogeneous hardware.
- **Least Connections:** Route to whichever server currently has the fewest active connections. Better for variable-length requests (long-polling, file uploads).
- **IP Hash:** Hash client IP to deterministically select a server. Same client always hits same server. Provides session stickiness without shared session store — but breaks if a server goes down.
- **Consistent Hashing:** Used in distributed caches and databases. Servers and keys are mapped onto a ring. A key goes to the first server clockwise. Adding/removing servers only remaps ~1/N of keys instead of all keys.

---

## CAP Theorem

Eric Brewer's theorem: in a distributed system, you can guarantee at most **two** of three properties simultaneously:

- **Consistency (C):** Every read receives the most recent write or an error. No stale data.
- **Availability (A):** Every request receives a response (not necessarily the most recent data). No timeouts.
- **Partition Tolerance (P):** The system continues to operate despite network partitions (dropped messages between nodes).

**The critical insight:** Network partitions are not optional in real distributed systems. Hardware fails, cables get cut, data centers lose connectivity. Therefore, **P is mandatory**. The real choice is between **CP** and **AP** when a partition occurs.

Real-world examples:
- **MySQL Cluster / HBase = CP:** During a partition, refuses writes to maintain consistency. Banking systems prefer this.
- **Cassandra / DynamoDB (default) = AP:** During a partition, still accepts writes. Returns potentially stale data. Favors uptime. Good for shopping carts, social feeds.
- **MongoDB = CP by default:** Writes go to primary; if primary is unreachable, no writes accepted until election completes.
- **DynamoDB = Tunable:** Consistent reads (CP-like) or eventually consistent reads (AP-like) per request.

**Why "CA" does not exist:** A CA system would have to guarantee both consistency and availability even during a network partition. But during a partition, you physically cannot guarantee that two nodes have the same data while also accepting writes to both. The only CA systems are single-node databases — which are not distributed.

---

## PACELC: Extending CAP

CAP only describes behavior during partitions. PACELC asks: even when there is **no partition (E = Else)**, there is a tradeoff between **Latency (L)** and **Consistency (C)**.

A synchronous replication system (strong consistency) has higher latency because the primary must wait for replicas to acknowledge. An asynchronous system has lower latency but risks stale reads.

DynamoDB: PA/EL — during partition: available; else: low latency (eventual consistency default).
Spanner: PC/EC — during partition: consistent; else: consistent (globally distributed transactions at cost of latency).

---

## Consistency Models

From strongest to weakest:

1. **Strong consistency:** After a write, all subsequent reads see that write immediately. Most expensive (requires global coordination or locks).
2. **Causal consistency:** Operations that are causally related are seen in the same order by all nodes. "Reply before tweet" ordering is preserved.
3. **Read-your-writes:** After you write, you will always read your own write. Others may still see stale data.
4. **Monotonic reads:** Once you read a value, you will never read an older value. No time-travel reads.
5. **Eventual consistency:** Given no new writes, all replicas will converge to the same value — eventually. No timing guarantees.

---

## BASE vs ACID

**ACID (traditional RDBMS):** Atomicity, Consistency, Isolation, Durability. Strong guarantees. All-or-nothing transactions. Required for financial systems.

**BASE (NoSQL/distributed):** Basically Available (system stays up), Soft state (values may change over time due to eventual consistency), Eventually consistent. Sacrifices strong consistency for scale and availability.

---

## Latency Numbers Every Developer Should Know

| Operation | Latency |
|---|---|
| L1 cache reference | 1 ns |
| L2 cache reference | 4 ns |
| Main memory (RAM) | 100 ns |
| SSD random read | 100 µs |
| HDD random read | 10 ms |
| Cross-region network (US→EU) | 150 ms |
| Mutex lock/unlock | 100 ns |
| Redis GET (local) | ~0.5 ms |

Implications: a database query with a disk seek (10ms) is 100,000x slower than a RAM access. Caching even 1% of hot queries can dramatically reduce tail latency.

---

## Back-of-Envelope Estimation

Estimation in interviews demonstrates engineering judgment. Use these building blocks:

- 1 day = 86,400 seconds ≈ 100K seconds
- 1 million req/day ≈ 12 req/sec
- 1 billion req/day ≈ 11,500 req/sec

**Example: Photo sharing app with 500M users**
- DAU: 10% × 500M = 50M daily active users
- Each user views 20 photos/day = 1 billion reads/day ≈ 11,600 read req/sec
- Each user uploads 1 photo every 10 days = 5M uploads/day ≈ 58 writes/sec
- Storage: 1 photo ≈ 3MB compressed → 5M × 3MB = 15TB/day → 5.4PB/year
- Bandwidth: 11,600 reads/sec × 3MB = 34GB/sec outbound → requires CDN

**Storage sizing keywords:** 1KB (tweet), 1MB (small document), 100KB (profile picture thumbnail), 3MB (photo), 500MB (HD video).

---

## Single Points of Failure (SPOF)

A SPOF is any component whose failure brings down the entire system. Identification and elimination is a core senior-engineer skill.

Common SPOFs and mitigations:
- **Single DB server:** → Primary-replica with automatic failover (RDS Multi-AZ)
- **Single app server:** → Multiple instances behind load balancer + Auto Scaling Group
- **Single load balancer:** → AWS ALB is managed and multi-AZ by default; for self-hosted, use Keepalived/VRRP
- **Single availability zone:** → Deploy across 3 AZs minimum
- **Single region:** → Active-active or active-passive multi-region (Route53 failover)
- **DNS provider:** → Use secondary DNS (Route53 + Cloudflare)
- **Single CDN:** → Multi-CDN strategy for critical assets

---

## Stateless vs Stateful Services

**Stateful:** Server stores client session data in memory. Sticky sessions required. Adding/removing servers is disruptive. Cannot freely route requests.

**Stateless:** All state externalized to shared store (Redis, DB). Any server can handle any request. Load balancer can freely distribute traffic. Auto-scaling works seamlessly.

Transition: Replace `express-session` (in-memory) with Redis session store. Replace JWT stored in httpOnly cookie with a stateless token the server validates without lookup (or with Redis for revocation).

---

## The 7-Step System Design Interview Framework

1. **Clarify requirements (5 min):** Ask about scale (users, QPS), functional requirements, non-functional (latency, consistency, availability). Never start designing without this.
2. **Back-of-envelope estimates (3 min):** QPS, storage, bandwidth. Shows whether you need a cache, sharding, CDN.
3. **High-level design (10 min):** Draw the major components — clients, load balancers, app servers, databases, caches, CDN. No deep details yet.
4. **Deep dive key components (15 min):** Interviewer will guide. Typically: database schema, API design, a specific algorithm (short code generation, feed ranking).
5. **Identify bottlenecks (5 min):** Where does the system fail under load? What are the hotspots?
6. **Scale the design (5 min):** Add read replicas, sharding, caches, CDN, message queues as needed.
7. **Wrap up with trade-offs (2 min):** What did you sacrifice for scalability? What would you do differently with more time?

---

## Summary

System design is about making confident tradeoffs under constraints. Mastering the vocabulary (CAP, BASE, consistent hashing, fan-out, SPOF) lets you communicate at a senior level. The 7-step framework prevents rambling and demonstrates structured thinking — which is what interviewers actually evaluate.
