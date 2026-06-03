# Day 58 — System Design Mock Interview Q&A

---

## Q1: Walk through your WhatsApp design — how does message delivery work for online vs offline users?

**Model Answer:**
(See the full design in `design-whatsapp.md`)

**Online path**: Alice sends a message via WebSocket to a Chat Server. The Chat Server publishes to a Kafka topic (partitioned by `conversationId`). The Delivery Service consumes from Kafka, checks the Presence Service (Redis lookup: `presence:{bobUserId}`), finds Bob's Chat Server ID, publishes to Redis Pub/Sub on that server's channel, and the Chat Server delivers to Bob's WebSocket. Bob's client sends an ACK, which flows back as a delivery receipt (double check).

**Offline path**: Same start, but Presence Service shows Bob as offline. Delivery Service stores the message in Cassandra (partitioned by `conversationId`). It also sends a push notification via APNs (iOS) or FCM (Android). When Bob's device receives the push, the app opens a WebSocket, fetches missed messages from the Message Storage Service, and sends read receipts.

**The key design decision**: Using Kafka between the Chat Server and Delivery Service provides durability — if the Delivery Service crashes, messages wait in Kafka and are delivered when it recovers. Without Kafka, a crash would lose messages in flight.

---

## Q2: Your WhatsApp design has 600M concurrent WebSocket connections. How do you route them?

**Model Answer:**
A critical challenge: when Bob is connected to Chat Server #247, how does the Delivery Service know to use Server #247?

**Solution: Presence Service as routing table**
- On WebSocket connect: Chat Server writes `SET presence:{userId} {serverId} EX 30` to Redis
- On disconnect or TTL expiry: key disappears
- Delivery Service: look up `presence:{userId}` → get `serverId` → publish to Redis Pub/Sub channel `server:{serverId}:msgs`
- Chat Server subscribes to its own channel and delivers to connected WebSockets

**Scaling Redis**: Redis Cluster with consistent hashing partitions presence keys across multiple nodes. 600M keys × ~50 bytes = ~30GB — fits in a reasonably sized Redis Cluster.

**Load Balancer for WebSockets**: L7 load balancer with sticky sessions (route reconnects to the same server) OR stateless routing (always look up presence). Stateless is more resilient but requires every reconnect to re-register presence.

**Alternative**: Kubernetes service mesh with sidecar proxies (Envoy/Istio) handles connection management transparently, but still needs the presence layer for cross-server routing.

---

## Q3: How does WhatsApp handle message ordering and exactly-once delivery?

**Model Answer:**
**Ordering**:
- Kafka partitions by `conversationId` — all messages in the same conversation are processed in order within one partition
- Cassandra uses `TIMEUUID` as the clustering key — ordered by creation time, unique even at microsecond resolution
- Client-side: messages are sorted by `TIMEUUID` for display — even if two messages arrive out of order on the client, sorting corrects it

**At-least-once delivery** (Kafka default):
- Kafka consumer commits offset AFTER delivering to the client, not before — if the consumer crashes after delivery but before commit, it reprocesses and delivers again
- **Idempotency**: Client generates a UUID for each message before sending. The client deduplicates on receipt: `SET msg:{messageId} 1 NX EX 86400` in Redis — only process if NX (not exists) succeeds

**Delivery receipts** (acknowledgment chain):
1. Message sent → stored in Cassandra → "sent" status (single tick)
2. Recipient's Chat Server ACKs delivery → "delivered" status (double tick)
3. Recipient's app opens and reads the message → "read" receipt sent → blue ticks

If network fails between any step, the ACK is retried. Cassandra's idempotent writes handle duplicate ACKs safely.

---

## Q4: What if WhatsApp needs to support 1 trillion users instead of 2 billion?

**Model Answer:**
1 trillion users is ~500x current scale. The architectural changes needed:

**Database sharding at a new level**: Cassandra's horizontal scaling handles storage — just add more nodes. The key challenge is cross-region replication: Cassandra multi-datacenter replication with `NetworkTopologyStrategy` — replicate to 3 data centers per region, 6+ regions globally.

**WebSocket connection servers**: From 6,000 to 3 million servers. Kubernetes auto-scaling with consistent hash-based routing. Geographic routing: users connect to the nearest region, inter-region message routing when sender and receiver are in different regions.

**Presence Service**: Redis at this scale requires partitioning. Hash `userId` to one of 1,000 Redis shards. Each shard handles 1B entries — feasible with Redis Cluster.

**Fan-out for groups**: At trillion users, a group with 256 members and all members online = 256 concurrent push operations. This still works. The problem is large groups — if WhatsApp allowed 100K member groups, fan-out would need dedicated group-fan-out partitions in Kafka.

**CDN for media**: Already handled — S3 + CloudFront scales independently.

**The real challenge**: At 1T users, you're primarily dealing with infrastructure management, multi-region coordination, and network topology — not fundamentally different architecture, just more of it.

---

## Q5: How would you implement exactly-once message delivery?

**Model Answer:**
True exactly-once delivery is extremely hard in distributed systems. The realistic goal is **at-least-once + idempotent consumers**.

**Pattern**:
1. Client generates a `messageId` (UUID v4) before sending
2. Server checks: `INSERT INTO messages (id, ...) WHERE NOT EXISTS` (Cassandra's conditional write) — returns success or "already exists"
3. If already exists, return success with the existing message — client thinks it succeeded
4. For delivery to recipient: idempotency key in the delivery event. Consumer checks `SET delivered:{messageId} 1 NX EX 86400` in Redis before processing — only deliver if key doesn't exist

**Where exactly-once is guaranteed vs not**:
- **Storage**: Cassandra's conditional write gives idempotent storage
- **Delivery to recipient**: we guarantee at-most-once by checking Redis, but if Redis fails after delivery and before the check is recorded, we might deliver twice
- **Push notifications**: APNs/FCM have at-least-once semantics — a user may get duplicate push notifications. Acceptable: the client deduplicates by `messageId`

**The CAP theorem implication**: Under network partition, you choose availability (keep delivering, accept potential duplicates) or consistency (stop delivering to ensure exactly-once). WhatsApp chooses availability — brief duplicate delivery is less bad than message loss.

---

## Q6-10: Design Alternatives and Trade-offs

### Q6: Why Cassandra over PostgreSQL for messages?

**Model Answer:**
At 1.16M writes/second, PostgreSQL would need extensive sharding, complex replication setup, and significant operational overhead. Cassandra was designed for exactly this pattern:

- **Write path**: LSM-tree (Log-Structured Merge Tree) — writes go to an in-memory memtable + append-only commit log. No random disk writes. Naturally high write throughput.
- **Horizontal scaling**: add nodes to a ring, data redistributes automatically. PostgreSQL sharding requires custom proxy logic.
- **Known access pattern**: always query by `conversation_id` — Cassandra's partition key maps perfectly.

**Trade-offs**: Cassandra doesn't support complex queries (no JOINs, limited secondary indexes). User profiles, group memberships, contacts — these have complex query patterns and benefit from PostgreSQL.

---

### Q7: SQL vs Cassandra for message storage — when would you choose SQL?

For small-medium scale (< 10K messages/second) or when you need complex queries across conversations, PostgreSQL with proper sharding (Citus, PlanetScale) is simpler to operate. Cassandra's operational complexity (tuning, repairs, compaction) is justified only at high scale.

---

### Q8: WebSocket vs HTTP Long Polling — when would you use each?

**WebSocket**: When you need low-latency bidirectional communication. WhatsApp messages, live gaming, collaborative editing — all need < 100ms round trip and bidirectional flow. WebSocket maintains a persistent connection.

**Long Polling**: Fallback for environments where WebSocket is blocked (corporate proxies, some CDNs). Client makes HTTP request, server holds it open until a message arrives (or timeout), client immediately sends another request. Higher latency, more CPU/memory per connection, but works everywhere HTTP works.

**SSE**: Unidirectional server→client, built on HTTP/2 — good for notifications that don't need client→server streaming.

---

### Q9: Push model vs Pull model for message delivery.

**Push** (WhatsApp's approach): Server maintains a connection per client, pushes new messages immediately. Pros: low latency, efficient (no wasted polls). Cons: requires persistent connections, complex routing.

**Pull** (email, RSS): Client periodically polls for new messages. Pros: simple, stateless server. Cons: latency = poll interval, wasted requests when nothing new. Only appropriate when real-time delivery is not required.

**Hybrid**: Server sends push notification → client connects and pulls the message. Used for offline users — notification is the "wake up" signal, client pulls the actual messages. Avoids maintaining persistent connections for all 2B users.

---

## Q11 (Behavioral): Describe a significant architectural decision you made on a project.

**Model Answer (STAR):**
**Situation**: Our application used synchronous email sending in the request path. As the user base grew, slow email providers (SparkPost occasionally taking 3-8 seconds) started causing API timeouts. P99 latency for user registration was 6+ seconds.

**Task**: Fix the latency without changing the client-facing API contract. The registration endpoint had to remain fast.

**Action**:
1. Identified that email sending is a side effect — it doesn't affect the API response. The user is registered regardless of email delivery.
2. Proposed moving email to an async background worker via a Redis-backed job queue (Bull).
3. The debate: some team members worried about losing track of unsent emails if Redis crashed. Counter-proposal: persist pending emails to the database before enqueueing.
4. Final design: registration writes to DB (atomic) + creates a `pending_notifications` record in the same transaction. A background worker reads `pending_notifications`, sends emails, updates status to `sent`. Idempotent retry on failure.
5. Migration was zero-downtime: deployed the worker first (reads but doesn't act), then deployed the API change to write to the queue.

**Result**: P99 registration latency dropped from 6+ seconds to 180ms. Email delivery reliability improved because failures now trigger retries rather than just returning errors to users.

---

## Q12 (Behavioral): Technical challenge requiring research into unfamiliar territory.

**Model Answer (STAR):**
**Situation**: We needed to implement real-time collaborative document editing — multiple users editing the same document simultaneously without conflicts (like Google Docs). Neither I nor my team had direct experience with Operational Transformation or CRDTs.

**Task**: Research and implement a prototype in 2 weeks to evaluate feasibility.

**Action**:
1. Researched both approaches: OT (used by Google Docs) vs CRDTs (used by Figma, Notion). Spent 3 days reading academic papers and existing implementations.
2. Decision: CRDTs — specifically Yjs (a CRDT library) — because it handles network partitions better, the eventual consistency model fit our use case, and Yjs had a mature Node.js implementation.
3. Built a prototype: WebSocket server broadcasting Yjs document updates, client-side integration with ProseMirror.
4. Performance concern: Yjs history accumulation made large documents slow. Solution: document snapshots every 100 updates + garbage collection.
5. Presented findings to team with benchmarks, trade-offs, and a working demo.

**Result**: Prototype became the production system. Still running 18 months later with 10K+ concurrent document sessions. The key learning: when facing unfamiliar territory, time-box research deeply, then build a small prototype before committing.

---

## Q13 (Trade-off): Analyze the trade-offs in using a message queue for WhatsApp.

**Model Answer:**
**Benefits**:
- **Durability**: messages in Kafka survive Chat Server crashes — no data loss during restarts
- **Decoupling**: Chat Servers don't need to know about delivery logic, storage, or notification systems
- **Load leveling**: sudden spike in messages queues up in Kafka instead of overloading downstream services
- **Replay**: Kafka retains messages — you can replay to rebuild state (analytics, debugging)
- **Fanout**: multiple consumers (storage, notifications, analytics) independently process each message

**Costs**:
- **Additional latency**: Kafka adds 5-20ms per message (vs direct service call)
- **Operational complexity**: Kafka cluster management, partition rebalancing, consumer lag monitoring
- **Ordering semantics**: ordered within a partition only. Messages from different users in the same conversation go to the same partition (by `conversationId`) — but cross-conversation ordering is not guaranteed.
- **At-least-once complexity**: requires idempotent consumers, increases implementation complexity

**Trade-off verdict**: The durability and decoupling benefits far outweigh the latency cost for a messaging system. 5-20ms extra latency is imperceptible to users. Message loss is catastrophic to trust.

---

## Q14 (Trade-off): When would you use SQL over NoSQL?

**Model Answer:**
Choose SQL (PostgreSQL) when:
- **ACID transactions across multiple entities**: financial transactions, inventory management, booking systems where partial updates would corrupt data
- **Complex, ad-hoc queries**: analytics, reports with JOINs across multiple tables, window functions
- **Schema enforcement**: you want the DB to reject invalid data, not just your application code
- **Moderate scale** (< 10-20M rows): PostgreSQL handles this well with proper indexing; horizontal scaling complexity isn't justified

Choose NoSQL when:
- **Cassandra**: high write throughput (>50K writes/sec), known access patterns (no ad-hoc queries), horizontal scaling critical, eventual consistency acceptable
- **MongoDB**: flexible schema that changes frequently, document-oriented data, embedded documents avoid JOINs
- **Redis**: in-memory speed required, ephemeral data, cache, pub/sub, leaderboards, sessions
- **DynamoDB**: AWS-native, serverless scale, pay-per-request billing model, predictable single-digit millisecond latency

**Anti-pattern**: Using NoSQL just because it sounds "modern" or "scalable." Most applications are better served by PostgreSQL. Add NoSQL when a specific scaling or data model problem genuinely can't be solved by a well-tuned SQL database.

---

## Q15 (Trade-off): Design trade-off analysis: centralized vs distributed logging.

**Model Answer:**
**Centralized logging** (ELK stack, CloudWatch, Datadog):
- Pros: single place to search, correlate logs across services, sophisticated querying (Kibana, Splunk), retention policies, alerting
- Cons: single point of failure for log visibility, network bandwidth from all services to log aggregator, cost scales with log volume

**Distributed/structured logging** (Pino/Winston per service, stdout to container log driver):
- Pros: no external dependency during the request path, app doesn't slow down waiting for log delivery
- Cons: logs scattered across services, manual correlation, no cross-service search without aggregation

**Best practice: both**:
- Applications log structured JSON to stdout (async, non-blocking)
- Container orchestrator (Kubernetes) collects logs via Fluentd/Fluent Bit sidecar
- Logs shipped to a centralized store (Elasticsearch, OpenSearch, Loki) for correlation and search
- Critical: every log line includes `correlationId` (trace ID) so you can filter all logs for a single request across all services

This hybrid approach: no latency impact on the application (logs to stdout), full search capability (centralized store), graceful degradation (application runs fine even if log shipping breaks).
