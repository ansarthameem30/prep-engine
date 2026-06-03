# Day 58 — System Design Mock Interview Guide

## The 7-Step SD Interview Framework (45-minute version)

System design interviews reward structured thinking. Interviewers are NOT looking for the perfect answer — they are looking for how you think, communicate, and handle trade-offs. Here is the battle-tested 7-step framework.

### Step 1: Requirements Clarification (5 minutes)
Ask focused questions. 3-5 questions max. You are narrowing scope, not stalling.

**Functional requirements** (what the system does):
- Who are the users? What are the core use cases?
- What is out of scope? (You define this)
- Any specific consistency/availability requirements?

**Non-functional requirements** (quality attributes):
- Scale: How many users? Requests per second?
- Latency: What's acceptable? Real-time or eventual consistency?
- Reliability: What's the SLA? Can we lose data?
- Storage: How much data, for how long?

**Good clarification questions**: "Should this be real-time or is 5-second delay acceptable?" / "Are we optimizing for read or write performance?" / "Do we need multi-region?"

### Step 2: Capacity Estimation (5 minutes)
Back-of-envelope math. Shows you understand scale.

**Traffic**: DAU × actions/day / 86,400 = req/sec. Multiply by 2-3x for peak traffic.
**Storage**: messages/day × avg size × retention period. Convert to TB/year.
**Bandwidth**: req/sec × avg response size = MB/s.

Write these numbers down and reference them throughout. They justify your architecture choices.

### Step 3: High-Level Architecture (10 minutes)
Draw the main components. Don't start with details.

Typical components: Client, Load Balancer/API Gateway, Application Servers, Cache, Database, Message Queue, CDN, Storage (S3).

State your assumptions: "I'll assume we're using AWS" / "I'll use a relational DB initially."

### Step 4: Data Model (5 minutes)
Define the core entities and their schemas. Choose storage type and justify it.

**SQL**: strong consistency, complex queries, known schema, moderate scale
**Cassandra/DynamoDB**: high write throughput, known access patterns, horizontal scaling, eventual consistency acceptable
**Redis**: caching, sessions, leaderboards, pub/sub
**S3**: object storage, files, backups, large blobs
**Elasticsearch**: full-text search, analytics

### Step 5: API Design (5 minutes)
Define the key API endpoints. Show you understand the interface.

```
POST /api/messages     { content, toUserId }     → 201 { messageId }
GET  /api/messages/:conversationId?cursor=...    → 200 { messages[], nextCursor }
```

### Step 6: Detailed Design — Deep Dive on 2-3 Components (10 minutes)
The interviewer will guide you toward their area of interest. Common deep-dive areas:
- Handling real-time delivery (WebSocket, pub/sub)
- Fan-out and message delivery at scale
- Database sharding and partition strategy
- Caching strategy
- Handling failures (retries, idempotency)

### Step 7: Scale and Bottlenecks (5 minutes)
Where will your design break at 10x traffic? How would you fix it?

Common bottleneck solutions:
- Single DB → read replicas → sharding → Cassandra
- No cache → Redis cache → cache-aside → write-through
- Synchronous fan-out → async queue (Kafka) → consumer group parallelism
- Single region → multi-region with active-active or active-passive

---

## Handling the "I Don't Know" Moment

Every candidate hits a question they can't fully answer. How you handle it matters more than the specific answer.

**Framework**: State what you know → acknowledge the uncertainty → propose a direction → ask for feedback.

Example: "I know at this scale we need to handle millions of messages per second. I'd reach for Kafka because I know it handles high throughput with consumer group semantics. I'm less certain about the partition key strategy for this use case — would you like me to think through that, or is the overall direction correct?"

**Never**: Go silent, give a wrong answer confidently, apologize excessively.

What this demonstrates: intellectual honesty, knowing your own knowledge boundaries, ability to reason under uncertainty — all valuable senior engineer traits.

---

## Top 5 System Design Patterns That Appear in Every Interview

### 1. Caching at Every Layer
- **CDN**: static assets, popular content
- **Application cache** (Redis): avoid DB reads for hot data, session storage
- **DB query cache**: careful — stale data, cache invalidation is hard
- **Cache-aside** (most common): app checks cache, reads DB on miss, writes to cache
- **Write-through**: write to cache and DB together — no staleness, slower writes
- **Eviction**: LRU (general), TTL (time-sensitive data), LFU (frequency-based)

### 2. Message Queues for Async Decoupling
When Service A should not wait for Service B:
- User registration → email service via queue (email delay is acceptable)
- Order placed → inventory update + analytics + notification via fanout queue
- File uploaded → thumbnail generation in background
Queue provides: load leveling (absorbs traffic spikes), failure isolation (consumer can retry), decoupling

### 3. Database Sharding
When a single DB node can't handle write throughput or storage:
- **Horizontal sharding** (partitioning): split rows across multiple DB servers by shard key
- **Shard key choice is critical**: bad key = hot shards (one shard gets all traffic)
- Good shard keys: userId, orderId (high cardinality, even distribution)
- Bad shard keys: timestamp (all recent writes to one shard), status (low cardinality)
- **Cross-shard queries are expensive**: design data access patterns to avoid them

### 4. Pub/Sub for Real-Time and Fan-out
When one event must be delivered to many consumers:
- User sends message → Message Service publishes to Kafka topic → Multiple consumers: Delivery Service, Notification Service, Analytics Service
- Each consumer reads at its own pace, independently
- Kafka: durable, ordered within partition, replay-able
- Redis Pub/Sub: ephemeral (no message replay), simpler, lower latency

### 5. Consistent Hashing for Distributed Caches/Servers
When you have N cache/server nodes and want to distribute data:
- Simple modulo: `key % N` — when N changes (add/remove node), almost all keys re-map → cache miss storm
- Consistent hashing: both keys and nodes are placed on a ring. A key maps to the nearest node clockwise. Adding/removing a node only remaps 1/N of the keys.
- Virtual nodes: each physical node has K virtual nodes on the ring → more even distribution
- Used by: Cassandra token ranges, DynamoDB, Redis Cluster, CDN node selection
