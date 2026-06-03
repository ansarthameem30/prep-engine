# Day 58 – System Design Mock Interview: Design WhatsApp or Design Uber | DSA: Hard System Design Problem

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:05 | No new concept — simulation day. Scan your system design framework notes only. |
| Hands-On | 00:05–01:00 | Full system design mock: pick WhatsApp OR Uber, go deep for 55 minutes |
| DSA | 01:00–01:20 | Hard system design-adjacent coding problem under timed conditions |
| Interview Q | 01:20–01:30 | Self-grade your design, log weak areas |

---

## Today's Objectives

> **Note:** `01-concept/` contains only a `.gitkeep` — this is a simulation day with no new concept files. All study material is in `04-interview-prep/`.

- [ ] Complete a full 55-minute system design interview for one of the two prompts
- [ ] Cover all required dimensions: scale, storage, real-time, edge cases, tradeoffs
- [ ] Score yourself honestly using the rubric
- [ ] Solve the Hard DSA problem in < 20 min
- [ ] Identify your 2 weakest system design dimensions

---

## Concept: Simulation Day

> No new learning. Spend max 5 min reviewing your system design framework:
> - Clarify → Estimate → High-level design → Deep dive → Tradeoffs

Quick mental checklist before starting:
- What are the read/write ratios?
- What's the storage estimate (rough math)?
- Where are the bottlenecks (read-heavy? write-heavy? real-time?)?
- What does the CAP theorem choice look like for this system?

---

## System Design Prompt — Pick ONE

---

### Option A: Design WhatsApp (Messaging System)

**Interviewer prompt:** *"Design WhatsApp. We need to support 2 billion users, 100 billion messages per day, both 1:1 and group chats (up to 256 members). Users expect messages to arrive in < 100ms on good networks, and we must deliver messages even when the recipient is offline."*

**Required coverage:**

**1. Clarify (5 min)**
- Message types: text, media, read receipts, typing indicators
- Max group size: 256
- Media: stored separately, messages store references
- Message ordering guarantee: yes, within a conversation
- E2E encryption: yes (high level only)

**2. Scale Estimation (5 min)**
- 100B messages/day → ~1.2M messages/second
- Message size: ~1KB text → 100TB/day storage → ~36PB/year
- Peak multiplier: 2x → 2.4M msg/sec at peak
- Active connections: 1B concurrent users, WebSocket connections

**3. High-Level Design (10 min)**
Design these components at a whiteboard level:
- Client ↔ Chat Server (WebSocket for real-time, HTTP for fallback)
- Message queue for async delivery (Kafka)
- Message storage (Cassandra — why?)
- Presence service (Redis pub/sub)
- Notification service (APNs/FCM for offline users)
- Media storage (S3 + CDN)
- API Gateway + load balancer

**4. Deep Dive Topics (25 min — go deep on all)**

**A. Real-time message delivery:**
- WebSocket connection management — how do you route a message to the correct chat server holding the recipient's connection?
- Message routing: sender → Chat Server A → Kafka → Chat Server B (holding recipient connection)
- What if recipient is on the same server? Skip the queue
- Connection registry: Redis sorted set mapping userId → serverID (with TTL for stale connections)

**B. Message storage:**
- Why Cassandra? (write-heavy, time-series access pattern, horizontal scaling, eventual consistency acceptable)
- Schema design: partition key = conversation_id, clustering key = message_id (time-ordered UUID)
- Message ID: Snowflake-style (time + machine + sequence) for ordering without central coordinator
- Why NOT SQL for messages? (write throughput, horizontal scaling complexity)

**C. Offline message delivery:**
- Messages stored in Cassandra regardless of recipient online status
- On reconnect: client sends "last seen message ID", server fetches all newer messages
- Push notifications (APNs/FCM) for offline users: send notification, app fetches messages on open
- Delivery acknowledgment: sent → delivered → read receipt chain

**D. Presence system:**
- Redis pub/sub: user publishes heartbeat every 30s; connections subscribe to contacts' presence channels
- Scale: 1B users × 30s heartbeat = 33M heartbeats/sec — use batch presence updates
- Privacy: allow users to hide presence

**E. Group messages:**
- Fan-out on write (deliver to all group members immediately) vs fan-out on read (deliver on fetch)
- 256 members: fan-out on write is acceptable (256 writes per message); for larger groups, fan-out on read
- Group message Cassandra schema: separate table vs shared conversation table

**5. Tradeoffs and Edge Cases (10 min)**
- Message ordering in group chats across multiple data centers (vector clocks? Lamport timestamps?)
- Network partition: can users still read old messages? (yes — serve from local replica)
- Hot partition: extremely active group chats (celebrity groups) — shard by message_id range, not just conversation_id

---

### Option B: Design Uber (Ride-Sharing Platform)

**Interviewer prompt:** *"Design Uber's core ride-hailing system. Support 10M rides/day globally, real-time location tracking for drivers, matching algorithm, surge pricing, and the full trip lifecycle from request to completion."*

**Required coverage:**

**1. Clarify (5 min)**
- Scope: driver location updates, ride matching, surge pricing, trip lifecycle — yes
- Scale: 10M rides/day, 5M active drivers in peak
- Real-time location: drivers update location every 4 seconds
- Matching SLA: < 5 seconds to match

**2. Scale Estimation (5 min)**
- 10M rides/day → ~116 rides/sec average, ~500/sec peak
- 5M active drivers × 1 update per 4s → 1.25M location writes/sec
- Location data: {driver_id, lat, lng, timestamp, heading} → ~100 bytes × 1.25M/sec → 125MB/sec

**3. High-Level Design (10 min)**
- Rider app → API Gateway → Ride Request Service
- Location Service (driver location updates)
- Matching Service
- Pricing Service (surge calculation)
- Trip Service (lifecycle management)
- Notification Service (driver/rider notifications)
- Map Service (ETA calculation, routing)

**4. Deep Dive Topics (25 min)**

**A. Driver location tracking:**
- 1.25M writes/sec — Redis Geospatial (GEOADD command), partitioned by city/region
- `GEOSEARCH` command for finding nearby drivers within radius
- Why Redis? (in-memory, O(log N) geo queries, pub/sub for real-time)
- Driver goes offline: TTL on location key (expire after 30s without update)

**B. Matching algorithm:**
- Find available drivers within 5km radius using Redis GEOSEARCH
- Filter: car type, rating, consecutive rejections
- Sort by: ETA (Google Maps API for precise ETA), not just distance
- Parallel offer dispatch: offer to top 3 drivers simultaneously, first accept wins
- Rejected offer → next candidate in sorted list

**C. Surge pricing:**
- Demand/supply ratio per geographic cell (H3 hexagonal grid at resolution 8 — ~0.7km² cells)
- Supply = available drivers per cell; demand = incoming ride requests per cell (rolling 5-min window)
- Surge multiplier = f(demand/supply) — step function at thresholds (1.2x, 1.5x, 2.0x, 2.5x)
- Update frequency: every 30 seconds
- Notify drivers of high-surge zones to incentivize repositioning

**D. Trip lifecycle:**
- States: REQUESTED → MATCHED → DRIVER_EN_ROUTE → DRIVER_ARRIVED → IN_TRIP → COMPLETED
- Each transition is an event; Kafka topic per event type
- Trip record: PostgreSQL (ACID important for payments and receipts)
- Real-time trip tracking: WebSocket from driver app → Trip Service → Rider app (driver location during trip)

**E. Scalability:**
- Geographic sharding: users in London don't interact with users in NYC
- City-level service isolation: each city is a separate matching pool
- Data centers: region-local for low latency

**5. Tradeoffs (10 min)**
- SQL vs NoSQL for trip data: SQL for trips (ACID for payment), NoSQL (Redis) for location
- Matching consistency: if two riders match with the same driver simultaneously (optimistic locking on driver availability)
- ETA accuracy vs computation cost (approximate ETA first, precise on match confirmation)

---

## DSA Focus: Hard System Design-Adjacent Problem

- **Problem:** Design Skip List (Custom) OR LFU Cache (LeetCode #460)
- **Difficulty:** Hard
- **Pattern:** Design / Ordered data structure
- **Time Target:** < 20 minutes
- **Key Insight (LFU Cache):** Use a `HashMap<key, {value, freq}>` + `HashMap<freq, LinkedHashSet<key>>` + `minFreq` tracker; on get: increment freq, move key from old freq set to new; on put: if at capacity, evict from `minFreq` set; after every get/put, update `minFreq` accordingly

---

## Today's 5 Interview Questions

> Self-assessment — answer after your design:

1. How do you route a message to the correct chat server holding the recipient's WebSocket connection?
2. Why is Cassandra a better fit than PostgreSQL for storing 100 billion messages per day?
3. How does Uber's surge pricing work technically — from data ingestion to multiplier calculation to driver notification?
4. What is the fan-out problem in group messaging, and how do you decide between fan-out on write vs fan-out on read?
5. How do you handle real-time driver location for 5 million concurrent drivers — what data store and what data structure?

---

## Files

> `01-concept/` — Simulation day: no concept notes. See your Phase 4 notes (Days 31-40) for reference.

- `01-concept/` → `.gitkeep` only — simulation day, no new concept files
- `02-hands-on/` → system-design-diagram.md — your whiteboard design captured in text/ASCII (write this during the simulation)
- `03-dsa/` → lfu-cache.js — LFU Cache implementation with O(1) all operations
- `04-interview-prep/` → system-design-scorecard.md — self-graded rubric across all 5 dimensions + weak areas

---

## Success Criteria
- [ ] Completed full 55-minute system design without getting stuck for more than 2 minutes
- [ ] Covered all required sections: estimation, high-level design, all 5 deep-dive topics, tradeoffs
- [ ] Can explain the most critical design decision (message routing / driver location) without hesitation
- [ ] Solved Hard DSA problem in < 20 min
- [ ] Logged top 2 system design weak areas for Day 60 review
