# Day 34 — Interview Prep: Message Queues + Event-Driven Architecture

## Q1: Why would you use Kafka over a traditional database for inter-service communication?

**Answer:**
A database is not designed for real-time event streaming between services. Using a shared database for communication creates tight coupling (both services must agree on schema), polling overhead (services must continuously query), and single-point-of-failure characteristics.

Kafka provides:
- **Decoupling:** Producer services publish events without knowing who consumes them. Add new consumers without modifying producers.
- **Durability + Replay:** Events are stored on disk for configurable retention (days, weeks). New services can replay historical events to catch up — impossible with traditional queues where consumed = gone.
- **High throughput:** Sequential disk writes + zero-copy networking enables millions of events/second per broker. A database polling approach saturates I/O with unnecessary reads.
- **Temporal ordering:** Events within a partition are strictly ordered. You can reconstruct what happened and when.
- **Multiple independent consumers:** 10 different teams can consume the same OrderCreated topic independently, at their own pace, without interfering with each other.
- **Backpressure handling:** If the email service is slow, it simply falls behind in its consumer offset. The topic retains messages. No lost events, no cascading failure to the order service.

**When to use a database instead:** Simple CRUD inter-service calls where you need request-response semantics, strong consistency, or complex queries. Kafka is not a replacement for all database interactions — it's the right tool for event streaming and async integration.

---

## Q2: Explain Kafka's delivery guarantees. What does "exactly-once" actually mean and how is it achieved?

**Answer:**
**At-most-once:** `acks=0` or commit offset before processing. Message may be lost on producer failure or consumer crash. Used for non-critical metrics, high-throughput logging where occasional loss is acceptable.

**At-least-once:** `acks=1` or `acks=all` + commit offset after processing. If processing fails after receiving but before committing offset, message is redelivered. Consumer may process the same message multiple times. Requires idempotent consumers (processing the same message twice has the same effect as processing it once).

**Exactly-once:** Guarantees each message is processed exactly once end-to-end. Hardest to achieve in distributed systems.

Kafka's exactly-once requires three components working together:
1. **Idempotent producer** (`enable.idempotence=true`): Each producer has a unique Producer ID + sequence numbers. If the broker receives a duplicate (network retry), it deduplicates it. Exactly-once from producer to broker within a session.
2. **Transactional API** (`transactional.id`): Producer can atomically write to multiple partitions or topics in one transaction. `beginTransaction()` → produce messages → `commitTransaction()`. Either all go through or none.
3. **Read committed isolation** (`isolation.level=read_committed`): Consumer only reads messages that have been committed (not uncommitted transaction messages). Uncommitted messages are invisible.

**Practical note:** Exactly-once in Kafka is only guaranteed within the Kafka cluster (broker-to-broker, or producer-to-Kafka-to-Kafka). If your consumer writes to an external system (PostgreSQL, HTTP API), you need additional idempotency at that layer (idempotency keys, conditional writes, deduplication tables).

---

## Q3: What is the Outbox Pattern and why is it better than just publishing an event after writing to the database?

**Answer:**
**The problem:** When you write to a database AND publish an event, you have two distinct operations. They cannot be in the same transaction (one is a local DB transaction, one is a network call to Kafka). Several failure scenarios can create inconsistency:

- Write to DB succeeds, then Kafka publish fails → DB has the record but no event published
- Kafka publish succeeds, then DB write fails → event exists for a non-existent record
- Application crashes between the two operations → partial state

**The Outbox Pattern solution:**
Instead of two separate operations, use one database transaction to write BOTH the business record AND an outbox entry:

```sql
BEGIN TRANSACTION;
  INSERT INTO orders (id, status, amount) VALUES (...);
  INSERT INTO outbox (event_type, payload, status) VALUES ('OrderCreated', '...', 'pending');
COMMIT;
```

A separate **message relay service** reads unpublished outbox entries and publishes them to Kafka. If the publish fails, it retries. Only after successful publish does it mark the outbox entry as published.

**Guarantees:** If the order is in the database, the event will eventually be published (at-least-once). If the database transaction fails, neither the order nor the outbox entry exists.

**Implementation options:**
1. **Polling relay:** A service polls the outbox table every 500ms for pending entries
2. **Debezium / CDC:** Captures database changes from the binlog/WAL and publishes them to Kafka. Near-zero latency, no polling overhead, captures all changes automatically.

**Tradeoff:** Eventual consistency — events may be delayed by the polling interval. Usually milliseconds in practice.

---

## Q4: Compare Saga choreography vs orchestration. Which would you use for an order fulfillment workflow with 6 steps?

**Answer:**
**Choreography:** Each service publishes events and reacts to others' events. No central coordinator. Services are fully autonomous.

```
OrderCreated → PaymentService.charge() → PaymentProcessed →
InventoryService.reserve() → StockReserved →
ShippingService.createShipment() → ShipmentCreated
```

On failure: each service must listen for failure events and emit compensating events.

Pros: Loose coupling, no single coordinator service to fail, each service independently deployable.
Cons: Hard to trace the overall saga state across services, complex failure handling (must handle many event combinations), difficult to understand the full workflow without reading multiple service codebases.

**Orchestration:** A central Saga Orchestrator service drives the workflow. It calls each service directly and handles failures explicitly.

```
OrderSaga:
  1. call PaymentService.charge() → success
  2. call InventoryService.reserve() → success
  3. call ShippingService.createShipment() → failure
     → call InventoryService.release() (compensate)
     → call PaymentService.refund() (compensate)
  4. emit OrderFailed
```

Pros: Single place to see the full workflow, easier debugging, explicit failure handling.
Cons: Orchestrator is a bottleneck, creates coupling through the orchestrator, orchestrator can become a god-service.

**My recommendation for a 6-step order fulfillment workflow:** Orchestration. With 6 steps and complex compensation logic (partial refunds, partial inventory releases), choreography becomes impossible to reason about. The explicitness of orchestration outweighs the coupling cost. Tools like AWS Step Functions or Temporal make orchestration straightforward to implement and observe.

For simpler 2-3 step workflows, choreography is fine.

---

## Q5: How does Kafka handle the case where a consumer crashes mid-processing? What is at-least-once vs exactly-once in this context?

**Answer:**
**Consumer crash scenario:** Consumer reads message from partition, starts processing (writes to DB), then crashes before committing the offset back to Kafka.

On restart: the consumer re-reads from the last committed offset — which is before the crashed message. It processes the message again. If the first processing wrote to the DB, the second processing will try to write again → potential duplicate.

**At-least-once (default for most production systems):**
- Commit offsets AFTER processing completes
- Risk: crash between processing and commit → message processed again on restart
- Solution: Design idempotent consumers
  - Use `ON CONFLICT DO NOTHING` in SQL
  - Include a `message_id` / `idempotency_key` column; check for existence before processing
  - Versioned updates: only update if `version < new_version`

**At-most-once:**
- Commit offsets BEFORE processing
- Risk: message is committed but processing fails → message is lost
- Acceptable for: analytics events, metrics (dropping one metric event is acceptable)

**Exactly-once:**
- Consumer processes message + commits Kafka offset in the same atomic transaction
- Only achievable if your sink supports transactions that can include the Kafka offset commit
- Kafka Streams achieves this by atomically: read from input topic → process → write to output topic + commit input offset (all in one Kafka transaction)
- For database sinks: use transactional outbox in reverse — store consumed offset in your DB and commit in the same transaction as your business write

**Practical default:** Design for at-least-once + idempotent consumers. This handles 99% of use cases without the complexity of exactly-once infrastructure.

---

## Q6: What is a Dead Letter Queue and when should you use it?

**Answer:**
A Dead Letter Queue (DLQ) is a secondary queue where messages are moved after failing to be processed successfully after N retry attempts. It prevents failed messages from blocking the main queue indefinitely and provides a mechanism for out-of-band debugging and reprocessing.

**When a message should go to DLQ:**
- After max retry attempts are exhausted (typically 3-5)
- When the error is not transient (schema validation failure, malformed JSON — retrying won't help)
- When the message has exceeded its visibility timeout N times (SQS)

**What to do with DLQ messages:**
1. **Alert:** DLQ depth > 0 should trigger a PagerDuty alert or Slack notification
2. **Inspect:** Debug the consumer bug using the actual failed messages
3. **Fix and replay:** Fix the consumer, then re-publish DLQ messages to the original queue
4. **Dead-letter monitoring:** Set up a Lambda to consume from DLQ and log structured data to CloudWatch/Datadog

**Critical distinction — transient vs permanent failures:**
- Transient: Database briefly unreachable, downstream service rate-limited → retry with exponential backoff, eventually succeeds
- Permanent: Message payload is invalid (missing required field), business logic failure (order total is negative), code bug → retrying N times wastes resources, send to DLQ immediately after a few retries

**SQS configuration:**
```json
{
  "maxReceiveCount": 3,
  "deadLetterTargetArn": "arn:aws:sqs:us-east-1:123:my-queue-dlq"
}
```

**Idempotency and DLQ interaction:** If messages are replayed from DLQ after a fix, your consumer must be idempotent — the fixed consumer may re-process messages that were partially processed before failing.

---

## Q7: Explain the difference between SQS, SNS, and EventBridge. When would you use each?

**Answer:**

**SQS (Simple Queue Service):**
- Durable pull-based queue (consumers poll for messages)
- Point-to-point: one message consumed by one consumer
- Messages persisted up to 14 days
- Visibility timeout: message becomes invisible while being processed, reappears if not deleted (enables retries)
- FIFO option for exactly-once, ordered delivery per message group
- **Use for:** Work queues (background jobs), buffering between services, decoupling synchronous operations

**SNS (Simple Notification Service):**
- Pub/sub, push-based
- One message delivered to N subscribers simultaneously (fan-out)
- No persistence — if subscriber is offline, message is lost (except for SQS/Lambda subscribers which have retry)
- Subscribers: SQS, Lambda, HTTP, email, SMS, mobile push
- **Use for:** Notifying multiple services of the same event, system alerts/notifications, fan-out to multiple queues

**SNS → SQS fan-out pattern:** SNS topic → multiple SQS queues. Each team has their own SQS queue subscribed to the same SNS topic. One OrderCreated SNS message → billing queue, inventory queue, notification queue — all independently consumed.

**EventBridge:**
- Event bus with rule-based routing
- Consumers define filter rules (`detail.status == "FAILED"`) to receive only relevant events
- Schema registry: auto-detect and document event schemas
- SaaS integrations: Shopify, Datadog, PagerDuty can publish directly to your EventBridge bus
- Archive and replay: record all events to S3, replay to debug
- **Use for:** Complex event routing with multiple consumers and rules, cross-account event sharing, SaaS event ingestion, microservices decoupling with content-based routing

**Decision matrix:**
- Simple job queue → SQS
- Notify multiple services of one event → SNS fan-out to SQS
- Complex routing rules, SaaS integrations, schema-based filtering → EventBridge

---

## Q8: What are the tradeoffs of consumer groups in Kafka? How does partition count affect scaling?

**Answer:**
**Consumer groups** enable parallel processing: multiple consumer instances share the work of processing a topic. Kafka assigns each partition to exactly one consumer in the group at any time. This provides load balancing and fault tolerance.

**Partition count is the maximum parallelism ceiling:**
- 10 partitions → maximum 10 consumers processing in parallel
- 11th consumer in the group = idle (no partition available)
- 5 consumers for a 10-partition topic: each consumer gets 2 partitions

**Increasing partitions:** You can increase partition count, but decreasing it is not supported (requires creating a new topic and migrating). Plan partition count at topic creation. Common starting points: 6, 12, or 24 (divisible by common consumer counts).

**Rebalancing:** When consumers join or leave the group, Kafka triggers a rebalance — redistributes partitions. During rebalance (Classic mode): all consumers pause processing (stop-the-world). Cooperative rebalancing (Kafka 2.4+) assigns only the changing partitions, minimizing disruption.

**Ordering guarantees:** Within a partition, messages are strictly ordered. Across partitions, there is no ordering guarantee. If you need strict ordering for a specific entity (all events for user:1001 in order), route all those messages to the same partition using `user_id` as the message key. The same key always maps to the same partition (as long as partition count doesn't change).

**Consumer lag:** The difference between the latest offset (latest produced message) and the current committed offset (last processed message) is consumer lag. High consumer lag = consumers are falling behind production rate. Monitor with `kafka-consumer-groups.sh --describe` or Prometheus kafka_consumer_group_lag metric. Add more consumers (up to partition count) or optimize consumer processing to reduce lag.
