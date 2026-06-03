# System Design: WhatsApp (Full Design)

## 1. Requirements

### Functional Requirements
- 2 billion users, ~100 billion messages/day
- 1-on-1 and group messaging (up to 256 members)
- Real-time message delivery to online users
- Offline message storage + push notification for offline users
- Media sharing: images, videos, documents (up to 100MB)
- Read receipts (single check = sent, double check = delivered, blue = read)
- End-to-end encryption (E2EE)
- Last seen / online presence

### Non-Functional Requirements
- **Availability**: 99.99% (WhatsApp has very high availability requirement)
- **Latency**: messages delivered within 1-2 seconds for online users
- **Consistency**: eventual consistency acceptable (brief delay in delivery status ok)
- **Durability**: messages must not be lost (but can be cleared after delivery confirmation)

---

## 2. Capacity Estimation

**Traffic**:
- 100B messages/day = 100,000,000,000 / 86,400 = **~1.16 million messages/second**
- Peak traffic ~3x average = **~3.5M messages/second**

**Storage**:
- Average message size: ~100 bytes (text) + metadata
- 100B × 100 bytes = 10 TB/day just for text
- Media: assume 10% of messages have media, avg 500KB → 5B × 500KB = **2.5 PB/day** (media stored in object storage)
- Message retention: 30 days on server → ~300 TB text messages stored at any time
- Long-term: media stored in S3 indefinitely (user's responsibility to clear)

**Connections**:
- 2B users, ~30% active concurrently = 600M active WebSocket connections
- Connection servers: if each server handles 100K connections → **6,000 connection servers**

---

## 3. High-Level Architecture (ASCII Diagram)

```
Clients (Mobile/Web)
        │
        │ HTTPS/WSS
        ▼
┌───────────────────┐
│  Load Balancer    │  (L7, sticky sessions for WebSocket)
└─────────┬─────────┘
          │
    ┌─────┴──────┐
    │            │
    ▼            ▼
┌────────┐  ┌────────────┐
│  Chat  │  │  API       │  (REST for non-real-time: media, profile, contacts)
│Servers │  │  Servers   │
│(WS)    │  │            │
└───┬────┘  └─────┬──────┘
    │             │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │   Kafka     │  (message bus — decouples delivery from storage)
    │  (Message   │
    │   Queue)    │
    └──────┬──────┘
           │
    ┌──────┴──────────────────────────┐
    │              │                  │
    ▼              ▼                  ▼
┌────────┐   ┌──────────┐    ┌──────────────┐
│Message │   │Presence  │    │Notification  │
│Storage │   │Service   │    │Service       │
│Service │   │(Redis)   │    │(APNs/FCM)    │
│(Cass.) │   │          │    │              │
└────────┘   └──────────┘    └──────────────┘
    │
    ▼
┌──────────────────┐
│  Cassandra       │  (messages, conversations)
│  Cluster         │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│  S3 + CDN        │  (media files)
└──────────────────┘
```

---

## 4. Message Flow

### Online Sender → Online Receiver
1. **Alice** sends message → WebSocket to Chat Server A
2. Chat Server A publishes to Kafka topic `messages` (partition key: `conversationId`)
3. **Delivery Service** consumes from Kafka
4. Delivery Service checks **Presence Service**: is Bob online? On which Chat Server?
5. Delivery Service publishes to Redis Pub/Sub channel `user:bob`
6. **Chat Server B** (where Bob is connected) subscribes to `user:bob` channel
7. Chat Server B delivers message to Bob via WebSocket
8. Bob's client sends ACK → delivery receipt sent back to Alice (double check)

### Sender → Offline Receiver
1. Steps 1-4 same as above
2. Presence Service: Bob is offline
3. Delivery Service stores message in **Cassandra** (Messages table)
4. Delivery Service sends push notification via **APNs (iOS) / FCM (Android)**
5. Bob's device receives push notification, app opens WebSocket
6. App fetches missed messages from Message Storage Service
7. Bob reads messages → read receipt → blue check for Alice

---

## 5. Data Model

### Messages Table (Cassandra)
```
messages (
  conversation_id   UUID        -- partition key
  message_id        TIMEUUID    -- clustering key, ordered by time
  sender_id         UUID
  content           TEXT        -- encrypted
  media_url         TEXT        -- nullable, S3 URL
  message_type      ENUM(text, image, video, doc, voice)
  created_at        TIMESTAMP
  delivered_at      TIMESTAMP
  read_at           TIMESTAMP
)
-- PRIMARY KEY: (conversation_id, message_id)
-- Read pattern: WHERE conversation_id = ? ORDER BY message_id DESC LIMIT 50
```

**Why Cassandra?**
- Write-heavy: 1.16M msg/sec — Cassandra's LSM-tree handles massive write throughput
- Read pattern is known: always read by `conversation_id` — perfect for a partition key
- Horizontal scaling: add nodes linearly as data grows
- Tunable consistency: use QUORUM for writes, LOCAL_ONE for reads (acceptable eventual consistency)

### Users Table (PostgreSQL)
```sql
users (id, phone_number, name, profile_photo_url, last_seen, created_at)
-- Phone number is the primary identifier
-- PostgreSQL: ACID, complex queries for user search, friend graph
```

### Conversations / Group Table (PostgreSQL)
```sql
conversations (id, type ENUM(direct, group), name, created_by, created_at)
conversation_members (conversation_id, user_id, joined_at, role ENUM(admin, member))
```

### Media Storage (S3)
```
s3://whatsapp-media/{userId}/{year}/{month}/{mediaId}.{ext}
```
Pre-signed upload URLs (sender uploads directly to S3), pre-signed download URLs (time-limited access).

---

## 6. Presence Service

**Problem**: With 600M active users, tracking online status must be fast and efficient.

**Implementation**:
- User connects → WebSocket → Chat Server → UPDATE Redis key: `presence:{userId}` = `{serverId, connectedAt}` with TTL 30s
- Client sends **heartbeat every 5 seconds** → server refreshes TTL
- No heartbeat for 30 seconds → TTL expires → user is "offline"
- On disconnect: immediate delete of Redis key

**Scale**: Redis Cluster with key partitioned by `userId`. 600M keys × ~50 bytes each = ~30GB — fits in Redis comfortably.

**"Last seen"**: Stored in Users table, updated on disconnect. Not real-time — batch updated every few minutes to avoid DB write storms.

---

## 7. Message Delivery and WebSocket Routing

**Connection Server Discovery**: When the Delivery Service needs to find Bob's connection server, it looks up `presence:{userId}` in Redis — this key contains the server ID (e.g., `chat-server-247`). The Delivery Service then uses Redis Pub/Sub to publish to that server's channel.

**Why not direct service-to-service calls?**: With 6,000 chat servers, direct RPC creates N² connection complexity. Pub/Sub through Redis decouples this — each chat server subscribes to its own channel.

**Kafka for durability**: Between the Chat Server (ingress) and Delivery Service, Kafka provides durability and replay. If the Delivery Service is briefly down, messages don't get lost — they wait in Kafka. When the service recovers, it replays.

---

## 8. Group Messaging Fan-out

For a group with 256 members:

**Write fan-out** (on send):
1. Message written to Kafka with group conversation ID
2. Group Fan-out Service reads the message
3. Fetches 256 member IDs from group members table
4. For each online member: deliver via Redis Pub/Sub → Chat Server
5. For each offline member: store in their unread queue + send push notification

**Optimization for large groups**:
- Don't do 256 individual presence lookups — batch lookup
- Use a Kafka topic per group for busy groups (isolates fan-out work)
- Offline storage: write one message record to the messages table + per-user read-status table

---

## 9. End-to-End Encryption (Signal Protocol, conceptually)

WhatsApp uses the Signal Protocol:
1. Each device generates a **key pair** (public + private). Private key never leaves the device.
2. During account setup: public keys uploaded to WhatsApp servers
3. When Alice first messages Bob: Alice's client fetches Bob's public key, performs **Diffie-Hellman key exchange** to derive a shared session key (neither server nor anyone else knows this key)
4. Messages are encrypted on Alice's device with the session key, decrypted only on Bob's device
5. WhatsApp servers see only ciphertext — they cannot read messages

**Multi-device**: A separate key exchange per device. Message encrypted once per destination device.

---

## 10. Scale Bottlenecks and Solutions

| Bottleneck | Solution |
|---|---|
| Single DB write node | Cassandra multi-master, all nodes accept writes |
| WebSocket server memory (600M connections) | 6,000+ servers with consistent hash-based routing |
| Fan-out for 256-member groups | Async Kafka consumer, batch presence lookups, parallel delivery |
| Media upload bandwidth | Clients upload directly to S3 via presigned URLs (bypasses app servers) |
| Presence reads for fan-out | Redis Cluster with read replicas |
| Message deduplication | Idempotency key in message (UUID from client), Cassandra TIMEUUID prevents duplicates |
| Push notification storms | Batch APNs/FCM calls, rate limiting per device |
