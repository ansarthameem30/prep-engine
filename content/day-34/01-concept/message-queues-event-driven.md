# Day 34 — Message Queues + Event-Driven Architecture

## Why Message Queues?

Synchronous architectures create tight coupling: the order service directly calls the payment service, which directly calls the inventory service. If any service is slow or down, the entire chain fails or blocks. Message queues introduce asynchronous decoupling.

**Three core benefits:**

1. **Decoupling:** Producer doesn't know or care who consumes its messages. The payment service publishes "PaymentProcessed" and the inventory, notification, and analytics services all independently consume it.

2. **Traffic buffering:** An order spike at 9 PM generates 50,000 orders/minute. Your downstream email service can only handle 5,000/minute. A queue absorbs the difference — orders are processed as fast as the email service can go, without dropping messages or overwhelming the service.

3. **Async processing:** Don't make users wait for email confirmation, PDF generation, or image resizing. Write the order to DB, put a message in the queue, return HTTP 200. Process side effects asynchronously.

---

## Kafka Architecture Deep Dive

Apache Kafka is the industry-standard distributed event streaming platform, processing trillions of messages per day at companies like LinkedIn (where it was invented), Netflix, and Uber.

### Core Components

**Brokers:** Kafka servers that store and serve messages. A Kafka cluster has 3-12+ brokers in production.

**Topics:** Named streams of records. A topic is split into partitions. Each partition is an ordered, immutable sequence of records stored on disk.

**Partitions:** The unit of parallelism. More partitions = more consumers in parallel = more throughput. A topic with 12 partitions can be consumed by up to 12 consumers in a group simultaneously.

**Replication:** Each partition has N replicas on different brokers. One replica is the leader (serves all reads and writes). Others are followers. If the leader fails, a follower is elected as new leader. `replication.factor = 3` is the production minimum.

**ISR (In-Sync Replicas):** The set of replicas that are fully caught up with the leader. A producer configured with `acks=all` waits for all ISR replicas to acknowledge before returning success. This guarantees no data loss on leader failure (as long as ≥1 ISR replica survives).

**ZooKeeper / KRaft:** ZooKeeper was historically used for controller election and cluster metadata. Kafka 2.8+ introduced KRaft (Kafka Raft) — Kafka manages its own metadata without ZooKeeper. KRaft is production-ready as of Kafka 3.3.

### Producers

**Partition strategy:**
- No key: round-robin across all partitions
- With key: `partition = hash(key) % num_partitions` — all messages with same key go to same partition (ordering guarantee per key)
- Custom partitioner: implement `Partitioner` interface

**Producer acknowledgment levels (`acks`):**
- `acks=0`: Fire and forget. Maximum throughput, no durability guarantee.
- `acks=1`: Wait for leader acknowledgment. Leader write succeeded, but if leader crashes before follower replication, message is lost.
- `acks=all` (`acks=-1`): Wait for all ISR replicas. Strongest durability. Use for financial events, order creation.

**Idempotent producer:** `enable.idempotence=true` — Kafka assigns each producer a unique ID and sequence number. Duplicate messages (from retry on network error) are deduplicated automatically.

### Consumers

**Consumer groups:** Multiple consumer instances sharing a group ID form a consumer group. Kafka assigns each partition to exactly one consumer in the group. If 10 consumers in a group subscribe to a 10-partition topic, each consumer gets 1 partition. Adding an 11th consumer leaves one idle.

**Offset management:** Kafka stores which messages each consumer group has processed in the internal `__consumer_offsets` topic. `enable.auto.commit=false` + manual offset commit after processing = at-least-once semantics. Commit before processing = at-most-once.

**Rebalancing:** When consumers join/leave the group, Kafka redistributes partition assignments. During rebalance, no partition is being consumed (stop-the-world). Cooperative rebalancing (Kafka 2.4+) minimizes this disruption.

### Log Compaction vs Retention

**Time-based retention:** `retention.ms=604800000` (7 days). Old segments deleted after TTL.

**Log compaction:** For change-data-capture topics. Kafka retains only the latest value per key. Tombstone records (null value) mark deletions. Useful for: materializing the current state of entities from event streams (CDC topics, event-sourced state topics).

### Throughput

Kafka achieves millions of messages/second per broker through:
- Sequential disk writes (append-only) vs random writes
- Zero-copy transfer: data goes from disk to network socket without copying through user space
- Batching: producers batch multiple records in one request
- Compression: producer can compress batches (lz4, snappy, gzip)

---

## Kafka vs RabbitMQ: Decision Framework

| Concern | Kafka | RabbitMQ |
|---|---|---|
| Throughput | Millions/sec per broker | ~50K messages/sec |
| Message retention | Days/weeks (configurable) | Until consumed (by default) |
| Message replay | Yes — rewind offset | No — consumed = gone |
| Consumer model | Pull-based (consumers control pace) | Push-based (broker pushes to consumers) |
| Routing | Topic + partition key | Exchanges + binding rules (direct, fanout, topic, headers) |
| Message ordering | Per-partition guarantee | Per-queue FIFO |
| Use cases | Event streaming, audit log, stream processing, event sourcing | Task queues, RPC, complex routing, small-to-medium throughput |
| Operations | Higher complexity | Simpler, management UI included |

**Choose Kafka when:** High throughput, event replay needed, multiple independent consumers of the same stream, stream processing (Kafka Streams, Flink), event sourcing source of truth.

**Choose RabbitMQ when:** Complex routing logic (headers exchange, binding keys), low-volume reliable task queues, RPC patterns with reply queues, existing AMQP ecosystem.

---

## Delivery Guarantees

**At-most-once:** Message delivered 0 or 1 times. On failure, message is dropped. Used when: metrics/analytics where occasional loss is acceptable, UDP-like patterns.

**At-least-once:** Message delivered 1 or more times. On failure, message is retried. Consumer may process the same message multiple times. Requires **idempotent consumers** — processing the same message twice must not cause double effects (e.g., double-charging a customer). Typical default for most systems.

**Exactly-once:** Message delivered exactly once. Hardest to achieve. Kafka provides exactly-once with idempotent producers + transactional API. Requires: idempotent producer (sequence numbers), transactional writes (atomic write to multiple topics), and consumer reading only committed offsets (`isolation.level=read_committed`).

---

## The Outbox Pattern

**Problem:** You need to write to your database AND publish an event atomically. If you write to DB and then fail before publishing, you have a stored record but no event. If you publish then fail before writing to DB, you have an event for a transaction that never happened. This is the dual-write problem.

**Solution:** The outbox pattern uses a single database transaction:

```sql
BEGIN TRANSACTION;
  INSERT INTO orders (id, status, ...) VALUES (...);
  INSERT INTO outbox (event_type, payload, status) VALUES ('OrderCreated', '...', 'pending');
COMMIT;
```

A separate **message relay service** (poller or Debezium CDC) reads unpublished outbox records, publishes them to Kafka, and marks them as published. If the publish fails, it retries. If the DB commit fails, neither record is written — atomicity maintained.

This ensures: if the order is in the DB, the event will eventually be published. If the DB write fails, no event is published. Guarantees at-least-once delivery of events tied to DB state.

---

## Saga Pattern: Distributed Transactions

Distributed transactions across microservices cannot use traditional ACID transactions (services have separate DBs). The Saga pattern manages a sequence of local transactions with compensating transactions for rollback.

### Choreography-based Saga
Services communicate purely through events. No central coordinator.

```
OrderService → publishes OrderCreated
PaymentService → listens, processes payment, publishes PaymentProcessed
InventoryService → listens, reserves stock, publishes StockReserved
ShippingService → listens, creates shipment
```

On failure:
```
InventoryService fails → publishes StockReservationFailed
PaymentService listens → publishes PaymentRefunded  
OrderService listens → marks order as Failed
```

Pro: Loosely coupled, each service is autonomous.
Con: Hard to trace the full saga state, complex failure scenarios, no central place to see "where is this order in the process?"

### Orchestration-based Saga
A central saga orchestrator (a service) calls each participant and handles failures.

```
OrderSaga orchestrator:
  1. CALL PaymentService.charge() → success
  2. CALL InventoryService.reserve() → failure
  3. CALL PaymentService.refund()  ← compensating transaction
  4. Mark saga as failed
```

Pro: Easier to understand saga state, centralized failure handling, can add new steps without changing existing services.
Con: Orchestrator becomes a bottleneck, coupling through the orchestrator.

**Compensating transactions** must be designed for every forward step. They undo the business effect (not necessarily the DB transaction). A `refund` compensates a `charge`. Some operations are naturally idempotent (setting status to "cancelled") and don't need separate compensation.

---

## Dead Letter Queues (DLQ)

When a consumer fails to process a message after N retry attempts, the message is moved to a Dead Letter Queue instead of being dropped or blocking the entire queue.

DLQ enables:
- Inspect failed messages for debugging
- Fix the consumer bug, then replay from DLQ
- Alert on DLQ depth (> 0 DLQ messages = processing errors)
- Separate handling for "poison messages" (messages that will always fail)

In SQS: configure `maxReceiveCount` on the source queue and point `deadLetterTargetArn` to the DLQ. After `maxReceiveCount` failed delivery attempts, SQS moves the message.

---

## AWS SQS vs SNS vs EventBridge

**SQS (Simple Queue Service):**
- Point-to-point queue
- Pull-based (consumers poll for messages)
- Message stored until consumed (retention up to 14 days)
- Visibility timeout: message invisible while being processed; reappears if not deleted
- FIFO queue: exactly-once, ordering per message group ID
- **Use for:** Decoupling services, job queues, buffering writes

**SNS (Simple Notification Service):**
- Pub/sub, one message → N subscribers
- Push-based (SNS pushes to endpoints immediately)
- No persistence — message lost if subscriber is offline
- Subscribers: SQS, Lambda, HTTP endpoint, email, SMS
- **Use for:** Fan-out to multiple consumers, system notifications

**Fan-out pattern:** SNS → multiple SQS queues. One message published to SNS, each subscribed SQS queue receives a copy independently. Different teams can consume at their own pace.

**EventBridge:**
- Event bus with rule-based routing
- Rules filter events by pattern (`source = "orders"` + `detail-type = "OrderCreated"`) and route to targets
- Schema registry: auto-discover and document event schemas
- SaaS integrations: receive events directly from Shopify, Zendesk, Datadog
- **Use for:** Complex event routing, event-driven architectures with many producers/consumers, decoupled service-to-service communication

---

## Netflix at Scale

Netflix processes ~700 billion events per day through Kafka. Their key patterns: separate topics per event type, multiple consumer groups per topic (streaming analytics, cold storage, alerting all consuming independently), and Kafka as the durable source of truth for all user activity events.
