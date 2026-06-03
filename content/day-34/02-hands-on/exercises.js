/**
 * Day 34 — Message Queues + Event-Driven Architecture: Hands-on Exercises
 */

const EventEmitter = require("events");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Message Queue with EventEmitter (Producer/Consumer Pattern)
// ─────────────────────────────────────────────────────────────────────────────

class MessageQueue {
  constructor(name, options = {}) {
    this.name = name;
    this.messages = [];
    this.dlq = [];
    this.emitter = new EventEmitter();
    this.processingCount = 0;
    this.stats = { published: 0, consumed: 0, dlqd: 0 };
  }

  publish(payload, options = {}) {
    const message = {
      id: crypto.randomUUID(),
      payload,
      publishedAt: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
    };
    this.messages.push(message);
    this.stats.published++;
    console.log(`[${this.name}] Published: ${message.id.slice(0, 8)}... — ${JSON.stringify(payload).slice(0, 60)}`);
    this.emitter.emit("message", message);
  }

  consume(handler) {
    this.emitter.on("message", async (message) => {
      await this._process(message, handler);
    });
    console.log(`[${this.name}] Consumer registered`);
  }

  async _process(message, handler) {
    try {
      await handler(message.payload);
      const idx = this.messages.findIndex((m) => m.id === message.id);
      if (idx !== -1) this.messages.splice(idx, 1);
      this.stats.consumed++;
      console.log(`[${this.name}] Consumed: ${message.id.slice(0, 8)}...`);
    } catch (err) {
      message.retryCount++;
      console.log(`[${this.name}] Failed (attempt ${message.retryCount}/${message.maxRetries}): ${err.message}`);

      if (message.retryCount >= message.maxRetries) {
        this.dlq.push({ ...message, failedAt: Date.now(), error: err.message });
        const idx = this.messages.findIndex((m) => m.id === message.id);
        if (idx !== -1) this.messages.splice(idx, 1);
        this.stats.dlqd++;
        console.log(`[${this.name}] Moved to DLQ: ${message.id.slice(0, 8)}...`);
      } else {
        // Retry with exponential backoff
        const delay = Math.pow(2, message.retryCount) * 100;
        setTimeout(() => this._process(message, handler), delay);
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      pending: this.messages.length,
      dlqDepth: this.dlq.length,
    };
  }
}

async function runQueueDemo() {
  console.log("=== Message Queue with DLQ ===");
  const emailQueue = new MessageQueue("email-queue");

  let callCount = 0;
  emailQueue.consume(async (payload) => {
    callCount++;
    if (payload.email === "bad@test.com" && callCount <= 3) {
      throw new Error("SMTP connection failed");
    }
    console.log(`  Sent email to: ${payload.email}`);
  });

  emailQueue.publish({ email: "alice@example.com", subject: "Welcome!" });
  emailQueue.publish({ email: "bad@test.com", subject: "This will fail" });
  emailQueue.publish({ email: "bob@example.com", subject: "Order shipped" });

  await new Promise((r) => setTimeout(r, 2000));
  console.log("\nQueue stats:", emailQueue.getStats());
  console.log("DLQ contents:", emailQueue.dlq.map((m) => ({ id: m.id.slice(0, 8), error: m.error })));
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Outbox Pattern — Atomic DB Write + Event Publishing
// ─────────────────────────────────────────────────────────────────────────────

// Simulated databases
const ordersDB = new Map();
const outboxDB = new Map(); // messageId -> { eventType, payload, status, createdAt }
const publishedEvents = []; // simulated Kafka topic

class OutboxOrderService {
  async createOrder(orderId, customerId, items, totalAmount) {
    // ATOMIC: write order + outbox entry in one "transaction"
    // In a real DB: BEGIN TRANSACTION; INSERT orders; INSERT outbox; COMMIT;
    const order = { orderId, customerId, items, totalAmount, status: "pending", createdAt: Date.now() };
    const outboxEntry = {
      messageId: crypto.randomUUID(),
      eventType: "OrderCreated",
      payload: JSON.stringify({ orderId, customerId, totalAmount }),
      status: "pending",
      createdAt: Date.now(),
      retryCount: 0,
    };

    // Simulate DB transaction (atomic)
    ordersDB.set(orderId, order);
    outboxDB.set(outboxEntry.messageId, outboxEntry);

    console.log(`[Order Service] Order ${orderId} created + outbox entry added (atomic)`);
    return order;
  }
}

class OutboxRelayWorker {
  constructor(intervalMs = 500) {
    this.intervalMs = intervalMs;
    this.running = false;
  }

  start() {
    this.running = true;
    this._poll();
    console.log("[Outbox Relay] Worker started");
  }

  stop() {
    this.running = false;
    console.log("[Outbox Relay] Worker stopped");
  }

  async _poll() {
    if (!this.running) return;

    const pendingEntries = [...outboxDB.values()].filter((e) => e.status === "pending");

    for (const entry of pendingEntries) {
      try {
        await this._publishToKafka(entry);
        entry.status = "published";
        entry.publishedAt = Date.now();
        console.log(`[Outbox Relay] Published ${entry.eventType}: ${entry.messageId.slice(0, 8)}...`);
      } catch (err) {
        entry.retryCount++;
        console.log(`[Outbox Relay] Publish failed for ${entry.messageId.slice(0, 8)}... (retry ${entry.retryCount})`);
        if (entry.retryCount >= 5) {
          entry.status = "dead-lettered";
          console.log(`[Outbox Relay] Dead-lettered ${entry.messageId.slice(0, 8)}...`);
        }
      }
    }

    if (this.running) {
      setTimeout(() => this._poll(), this.intervalMs);
    }
  }

  async _publishToKafka(entry) {
    // Simulate Kafka publish (50ms latency)
    await new Promise((r) => setTimeout(r, 50));
    // Simulate occasional failures
    if (Math.random() < 0.1) throw new Error("Kafka broker temporarily unavailable");
    publishedEvents.push({ ...entry, publishedAt: Date.now() });
  }
}

async function runOutboxDemo() {
  console.log("\n=== Outbox Pattern ===");
  const orderService = new OutboxOrderService();
  const relay = new OutboxRelayWorker(200);
  relay.start();

  await orderService.createOrder("ORD-001", "CUST-1", [{ sku: "LAPTOP" }], 1299.99);
  await orderService.createOrder("ORD-002", "CUST-2", [{ sku: "MOUSE" }], 49.99);
  await orderService.createOrder("ORD-003", "CUST-3", [{ sku: "KEYBOARD" }], 79.99);

  await new Promise((r) => setTimeout(r, 1000));
  relay.stop();

  console.log(`\nPublished events: ${publishedEvents.length}`);
  console.log(`Outbox pending: ${[...outboxDB.values()].filter((e) => e.status === "pending").length}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Saga Choreography — Order → Payment → Inventory with Compensation
// ─────────────────────────────────────────────────────────────────────────────

const sagaBus = new EventEmitter();

// Shared state
const sagaOrders = new Map();
const sagaPayments = new Map();
const sagaInventory = new Map([
  ["LAPTOP", 5],
  ["MOUSE", 50],
  ["OUT_OF_STOCK", 0],
]);

// Order Service
sagaBus.on("saga:StartOrder", (event) => {
  const order = { orderId: event.orderId, status: "pending", ...event };
  sagaOrders.set(event.orderId, order);
  console.log(`[Order] Created: ${event.orderId}`);
  sagaBus.emit("saga:OrderCreated", event);
});

// Payment Service
sagaBus.on("saga:OrderCreated", async (event) => {
  console.log(`[Payment] Processing payment for: ${event.orderId}`);
  await new Promise((r) => setTimeout(r, 50));

  if (event.forcePaymentFailure) {
    console.log(`[Payment] FAILED for: ${event.orderId}`);
    sagaBus.emit("saga:PaymentFailed", { ...event, reason: "Card declined" });
    return;
  }

  const payment = { paymentId: crypto.randomUUID(), orderId: event.orderId, amount: event.amount };
  sagaPayments.set(payment.paymentId, payment);
  console.log(`[Payment] Success for: ${event.orderId}`);
  sagaBus.emit("saga:PaymentProcessed", { ...event, paymentId: payment.paymentId });
});

// Inventory Service
sagaBus.on("saga:PaymentProcessed", async (event) => {
  console.log(`[Inventory] Reserving stock for: ${event.orderId}`);
  const current = sagaInventory.get(event.sku) ?? 0;

  if (current < event.quantity) {
    console.log(`[Inventory] FAILED — insufficient stock: ${event.sku} (have ${current}, need ${event.quantity})`);
    sagaBus.emit("saga:StockReservationFailed", { ...event, reason: "Insufficient stock" });
    return;
  }

  sagaInventory.set(event.sku, current - event.quantity);
  console.log(`[Inventory] Reserved ${event.quantity}x ${event.sku} for: ${event.orderId}`);
  sagaBus.emit("saga:OrderFulfilled", { ...event });
});

// Compensation: Inventory failure → refund payment
sagaBus.on("saga:StockReservationFailed", (event) => {
  console.log(`[Payment] COMPENSATING — refunding payment for: ${event.orderId}`);
  sagaOrders.get(event.orderId).status = "compensation-refunding";
  // Remove payment record (compensating transaction)
  for (const [id, p] of sagaPayments) {
    if (p.orderId === event.orderId) {
      sagaPayments.delete(id);
      break;
    }
  }
  sagaBus.emit("saga:OrderFailed", { ...event, finalReason: "Stock unavailable, payment refunded" });
});

// Final states
sagaBus.on("saga:OrderFulfilled", (event) => {
  const order = sagaOrders.get(event.orderId);
  if (order) order.status = "fulfilled";
  console.log(`[Order] FULFILLED: ${event.orderId}`);
});

sagaBus.on("saga:OrderFailed", (event) => {
  const order = sagaOrders.get(event.orderId);
  if (order) order.status = "failed";
  console.log(`[Order] FAILED: ${event.orderId} — ${event.finalReason ?? event.reason}`);
});

sagaBus.on("saga:PaymentFailed", (event) => {
  const order = sagaOrders.get(event.orderId);
  if (order) order.status = "failed";
  console.log(`[Order] FAILED (no stock check needed): ${event.orderId} — ${event.reason}`);
});

async function runSagaDemo() {
  console.log("\n=== Saga Choreography ===");

  // Happy path
  sagaBus.emit("saga:StartOrder", { orderId: "SAGA-001", amount: 1299.99, sku: "LAPTOP", quantity: 1 });

  await new Promise((r) => setTimeout(r, 200));

  // Inventory failure path
  sagaBus.emit("saga:StartOrder", { orderId: "SAGA-002", amount: 99.99, sku: "OUT_OF_STOCK", quantity: 1 });

  await new Promise((r) => setTimeout(r, 200));

  // Payment failure path
  sagaBus.emit("saga:StartOrder", { orderId: "SAGA-003", amount: 49.99, sku: "MOUSE", quantity: 1, forcePaymentFailure: true });

  await new Promise((r) => setTimeout(r, 300));

  console.log("\nFinal order states:");
  for (const [id, order] of sagaOrders) {
    console.log(`  ${id}: ${order.status}`);
  }
  console.log("Remaining inventory:", Object.fromEntries(sagaInventory));
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Dead Letter Queue Simulation — Retry 3× then DLQ
// ─────────────────────────────────────────────────────────────────────────────

async function processWithRetryAndDLQ(message, handler, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      await handler(message);
      console.log(`[DLQ Demo] Message ${message.id} processed on attempt ${attempt}`);
      return "processed";
    } catch (err) {
      const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
      console.log(`[DLQ Demo] Message ${message.id} failed attempt ${attempt}/${maxRetries}: ${err.message}. Retrying in ${delay}ms`);
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, delay));
    }
  }

  // All retries exhausted → send to DLQ
  console.log(`[DLQ Demo] Message ${message.id} exhausted retries → moved to DLQ`);
  return "dead-lettered";
}

async function runDLQDemo() {
  console.log("\n=== Dead Letter Queue Demo ===");
  let callCount = 0;
  const flakyHandler = async (msg) => {
    callCount++;
    if (msg.forceFailure || callCount <= 2) throw new Error("Temporary service error");
    console.log(`  Processed: ${JSON.stringify(msg.data)}`);
  };

  // Message that succeeds on 3rd retry
  callCount = 0;
  const result1 = await processWithRetryAndDLQ({ id: "MSG-001", data: { type: "email" } }, flakyHandler);
  console.log(`Result: ${result1}`);

  // Message that always fails → DLQ
  callCount = 0;
  const result2 = await processWithRetryAndDLQ({ id: "MSG-002", forceFailure: true, data: { type: "invalid" } }, flakyHandler);
  console.log(`Result: ${result2}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Kafka Consumer Group Simulation — Message Distribution
// ─────────────────────────────────────────────────────────────────────────────

class KafkaPartition {
  constructor(id) {
    this.id = id;
    this.messages = [];
    this.assignedConsumer = null;
    this.offset = 0;
  }

  append(message) {
    this.messages.push({ offset: this.messages.length, ...message });
  }

  consume() {
    if (this.offset >= this.messages.length) return null;
    return this.messages[this.offset++];
  }
}

class KafkaTopicSimulator {
  constructor(numPartitions = 4) {
    this.partitions = Array.from({ length: numPartitions }, (_, i) => new KafkaPartition(i));
    this.consumers = new Map(); // consumerId -> [partitionIds]
  }

  publish(key, value) {
    // Route by key hash (consistent: same key always goes to same partition)
    let partitionIdx;
    if (key) {
      const hash = [...key].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
      partitionIdx = Math.abs(hash) % this.partitions.length;
    } else {
      partitionIdx = Math.floor(Math.random() * this.partitions.length);
    }
    this.partitions[partitionIdx].append({ key, value });
  }

  joinConsumerGroup(consumerId) {
    this.consumers.set(consumerId, []);
    this._rebalance();
  }

  leaveConsumerGroup(consumerId) {
    this.consumers.delete(consumerId);
    this._rebalance();
  }

  _rebalance() {
    // Round-robin partition assignment
    const consumerList = [...this.consumers.keys()];
    const totalPartitions = this.partitions.length;

    for (const consumer of consumerList) this.consumers.set(consumer, []);

    for (let p = 0; p < totalPartitions; p++) {
      const consumer = consumerList[p % consumerList.length];
      this.consumers.get(consumer).push(p);
      this.partitions[p].assignedConsumer = consumer;
    }

    console.log("\n[Kafka] Rebalanced partition assignments:");
    for (const [consumer, partitions] of this.consumers) {
      console.log(`  ${consumer}: partitions ${partitions.join(", ")}`);
    }
  }

  poll(consumerId) {
    const assignedPartitions = this.consumers.get(consumerId) ?? [];
    const messages = [];
    for (const pid of assignedPartitions) {
      const msg = this.partitions[pid].consume();
      if (msg) messages.push({ ...msg, partition: pid });
    }
    return messages;
  }
}

async function runKafkaGroupDemo() {
  console.log("\n=== Kafka Consumer Group Simulation ===");
  const topic = new KafkaTopicSimulator(4); // 4 partitions

  // Produce messages with keys
  for (let i = 0; i < 20; i++) {
    const userId = `user-${(i % 5) + 1}`;
    topic.publish(userId, { event: "PageView", userId, page: `/page-${i}` });
  }

  // 2 consumers in group
  topic.joinConsumerGroup("consumer-A");
  topic.joinConsumerGroup("consumer-B");

  console.log("\nPolling round 1:");
  const msgA = topic.poll("consumer-A");
  const msgB = topic.poll("consumer-B");
  console.log(`  consumer-A: ${msgA.length} messages (partitions ${[...new Set(msgA.map((m) => m.partition))].join(", ")})`);
  console.log(`  consumer-B: ${msgB.length} messages (partitions ${[...new Set(msgB.map((m) => m.partition))].join(", ")})`);

  // Consumer-B leaves — Kafka rebalances
  console.log("\nConsumer-B leaves the group:");
  topic.leaveConsumerGroup("consumer-B");

  console.log("\nPolling round 2 (single consumer gets all partitions):");
  const msgA2 = topic.poll("consumer-A");
  console.log(`  consumer-A: ${msgA2.length} messages (all remaining)`);

  // Third consumer joins
  topic.joinConsumerGroup("consumer-C");
  console.log("\nAfter consumer-C joins:");
  topic.poll("consumer-A");
  topic.poll("consumer-C");
}

// Run all demos
(async () => {
  await runQueueDemo();
  await runOutboxDemo();
  await runSagaDemo();
  await runDLQDemo();
  await runKafkaGroupDemo();
})();
