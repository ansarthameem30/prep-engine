# Day 34 – Message Queues & Event-Driven Architecture: Kafka, Outbox & Saga Patterns | DSA: Bit Manipulation

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Kafka internals, Kafka vs RabbitMQ, event sourcing, outbox pattern, saga pattern |
| Hands-On | 00:40–01:10 | Design an order processing system using the outbox pattern + saga choreography |
| DSA | 01:10–01:25 | Single Number (#136) + Missing Number (#268) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain Kafka's architecture: brokers, topics, partitions, consumer groups, offsets
- [ ] Compare Kafka vs RabbitMQ for a given use case and justify the choice
- [ ] Design an outbox pattern implementation to ensure at-least-once delivery
- [ ] Solve: Single Number (#136) using XOR bit manipulation
- [ ] Review 5 messaging and event-driven architecture questions

---

## Concept: Message Queues & Event-Driven Architecture

### What to Study
- **Kafka architecture:** Broker (Kafka server, stores logs); Topic (named log, partitioned); Partition (ordered, immutable append-only log — unit of parallelism and ordering guarantee); Consumer Group (each partition assigned to exactly one consumer in a group — enables parallel consumption); Offset (consumer's position in a partition — Kafka retains messages regardless of consumption, consumers control their offset); Replication factor (copies of each partition on different brokers for fault tolerance)
- **Kafka vs RabbitMQ:** Kafka = durable event log, high throughput (millions/sec), replay-able, consumer controls offset, best for event sourcing/streaming/audit; RabbitMQ = message queue, lower throughput but lower latency, message deleted after consumption, supports complex routing (exchanges/bindings/queues), best for task queues, RPC, work distribution
- **Delivery semantics:** At-most-once (fire and forget — possible message loss, fastest); At-least-once (retry on failure — possible duplicates, must design idempotent consumers); Exactly-once (Kafka transactions + idempotent producer — highest overhead, usually overkill — achieve exactly-once semantics with idempotent consumers + at-least-once delivery)
- **Outbox pattern:** Atomically write both the DB change AND an "outbox" event record in the same local transaction; a separate publisher process reads the outbox and publishes to Kafka/queue; guarantees no message is lost if the service crashes after the DB write but before publishing; CDC (Debezium) can read the outbox table from binlog automatically
- **Saga pattern:** Manage distributed transactions without 2PC; Choreography (each service publishes events that trigger the next service — decoupled but hard to trace); Orchestration (central orchestrator calls each service and handles failures — explicit flow, easier to debug, single point of failure risk); compensating transactions handle rollback (e.g., cancel payment if shipping fails)

### Key Mental Models
- Kafka is a distributed commit log, not a traditional message queue — think of it as a persistent, replayable stream of events that any number of consumers can read independently
- The outbox pattern solves the "dual write problem" — you need to write to the DB and publish to Kafka, but you can't do both atomically in a distributed system; the outbox makes the message part of the DB transaction
- Sagas solve distributed transactions without distributed locks — they accept eventual consistency and handle rollback explicitly through compensating transactions

### Why This Matters in Interviews
Event-driven architecture is a hot topic in senior interviews. Kafka knowledge is expected for any backend role at scale. Outbox pattern and saga pattern demonstrate you understand distributed transaction challenges — questions like "how do you ensure consistency across microservices?" are common and expect these answers.

---

## DSA Focus: Bit Manipulation – Single Number & Missing Number

- **Problem:** Single Number (LeetCode #136) + Missing Number (LeetCode #268)
- **Difficulty:** Easy
- **Pattern:** XOR Bit Manipulation
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** XOR of a number with itself = 0; XOR of a number with 0 = the number itself; XOR all elements: duplicates cancel out, leaving the unique element; Missing Number: XOR all indices 0..n with all array elements — the missing index survives

---

## Today's 5 Interview Questions (Flash Review)
1. How does Kafka guarantee message ordering, and what is the trade-off of using more partitions?
2. What is the outbox pattern and what problem does it solve that a direct Kafka publish after a DB write does not?
3. When would you choose Kafka over RabbitMQ — what are the key deciding factors?
4. What is the difference between saga choreography and saga orchestration — what are the failure handling trade-offs?
5. What does "at-least-once delivery" mean for a consumer, and how do you design an idempotent consumer?

---

## Files in This Folder
- `01-concept/` → Read: Kafka architecture docs, outbox pattern guide, Saga pattern (microservices.io), Kafka vs RabbitMQ comparison
- `02-hands-on/` → Code: order-system-design.md (outbox pattern implementation, saga choreography flow diagram for order → payment → shipping)
- `03-dsa/` → DSA: single-number.js (XOR all elements), missing-number.js (XOR with indices, or math: sum formula - array sum)
- `04-interview-prep/` → Full Q&A: 5 messaging questions with architecture diagrams and failure scenario analysis

---

## Success Criteria
- [ ] Can explain Kafka's partitioning model and why it enables parallel consumption from memory
- [ ] Solved both XOR bit manipulation problems in < 20 minutes
- [ ] Confident answering all 5 messaging interview questions
- [ ] Bonus: Design a complete outbox + CDC pipeline using Kafka + Debezium for an order service
