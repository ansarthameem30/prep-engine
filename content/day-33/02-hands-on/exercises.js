/**
 * Day 33 — Database Scaling: Hands-on Exercises
 */

const crypto = require("crypto");
const EventEmitter = require("events");

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Consistent Hashing with Virtual Nodes
// (Full implementation with even distribution analysis)
// ─────────────────────────────────────────────────────────────────────────────

class ConsistentHashRing {
  constructor(vnodeCount = 150) {
    this.vnodeCount = vnodeCount;
    this.ring = new Map();      // sortedHash -> nodeId
    this.sortedHashes = [];
    this.nodes = new Set();
  }

  _hash(str) {
    return parseInt(
      crypto.createHash("sha256").update(str).digest("hex").slice(0, 8),
      16
    );
  }

  addNode(nodeId) {
    this.nodes.add(nodeId);
    for (let i = 0; i < this.vnodeCount; i++) {
      const h = this._hash(`${nodeId}#VNODE${i}`);
      this.ring.set(h, nodeId);
    }
    this._rebuildSortedKeys();
    console.log(`[Ring] Added ${nodeId} (${this.vnodeCount} vnodes)`);
  }

  removeNode(nodeId) {
    this.nodes.delete(nodeId);
    for (let i = 0; i < this.vnodeCount; i++) {
      const h = this._hash(`${nodeId}#VNODE${i}`);
      this.ring.delete(h);
    }
    this._rebuildSortedKeys();
    console.log(`[Ring] Removed ${nodeId}`);
  }

  _rebuildSortedKeys() {
    this.sortedHashes = [...this.ring.keys()].sort((a, b) => a - b);
  }

  getNode(key) {
    if (this.sortedHashes.length === 0) return null;
    const h = this._hash(key);
    // Binary search: find first hash >= h (clockwise on ring)
    let lo = 0, hi = this.sortedHashes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedHashes[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    // Wrap around
    const pos = lo % this.sortedHashes.length;
    return this.ring.get(this.sortedHashes[pos]);
  }

  analyzeDistribution(numKeys = 100000) {
    const counts = {};
    for (const node of this.nodes) counts[node] = 0;
    for (let i = 0; i < numKeys; i++) {
      const node = this.getNode(`test-key-${i}`);
      counts[node]++;
    }
    console.log(`\n[Distribution Analysis] ${numKeys} keys across ${this.nodes.size} nodes:`);
    const ideal = numKeys / this.nodes.size;
    for (const [node, count] of Object.entries(counts)) {
      const deviation = (((count - ideal) / ideal) * 100).toFixed(1);
      console.log(`  ${node}: ${count} keys (${deviation}% from ideal ${ideal.toFixed(0)})`);
    }
    return counts;
  }
}

console.log("=== Consistent Hashing ===");
const ring = new ConsistentHashRing(150);
ring.addNode("shard-1");
ring.addNode("shard-2");
ring.addNode("shard-3");
ring.analyzeDistribution(30000);

// Simulate adding a node — only ~25% of keys should remap
const before = {};
for (let i = 0; i < 1000; i++) before[`key-${i}`] = ring.getNode(`key-${i}`);
ring.addNode("shard-4");
let remapped = 0;
for (let i = 0; i < 1000; i++) {
  if (ring.getNode(`key-${i}`) !== before[`key-${i}`]) remapped++;
}
console.log(`\nKeys remapped after adding shard-4: ${remapped}/1000 (${remapped / 10}%)`);
console.log(`Expected ~25% remapping (1/4 of keys)`);


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Shard Key Selection Analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema A: E-commerce Orders Table
 * Columns: order_id (BIGINT auto-increment), customer_id, product_id, created_at, status, amount
 *
 * Bad shard key: created_at
 *   - All new orders hit the same (current month) shard
 *   - Historical shards sit idle → severe hotspot
 *
 * Bad shard key: status
 *   - Low cardinality (pending/processing/completed) → only 3 possible shard values
 *   - All 'pending' orders on one shard during peak order creation
 *
 * GOOD shard key: customer_id
 *   - High cardinality (millions of customers)
 *   - Related data co-located: all orders for a customer on the same shard
 *   - "My orders" query = single shard
 *   - Even distribution (assuming no single customer is responsible for >1% of orders)
 *   - Tradeoff: "All orders today" requires scatter-gather across all shards
 */

/**
 * Schema B: Social Media Posts Table
 * Columns: post_id (Snowflake), user_id, content, media_url, created_at, like_count
 *
 * Bad shard key: post_id (Snowflake auto-increment by timestamp component)
 *   - All recent posts on the newest shard → temporal hotspot
 *
 * GOOD shard key: user_id
 *   - User's feed construction (get posts from followed users) is a scatter-gather anyway
 *   - "Get my own posts" = single shard
 *   - Celebrity problem: famous users generate millions of posts → fan-out handled separately
 */

/**
 * Schema C: IoT Sensor Readings Table
 * Columns: reading_id, device_id, sensor_type, value, recorded_at
 *
 * Bad shard key: device_id alone
 *   - High-frequency devices fill one shard; inactive devices leave others empty
 *
 * GOOD compound shard key: (device_id, year_month)
 *   - Distributes by device AND by time period
 *   - "Get device readings for March 2024" = 2 shard lookups max
 *   - Avoids unbounded growth of single device's shard
 *   - Allows archiving: move old year_month shards to cold storage
 */

const shardKeyAnalysis = [
  {
    schema: "E-commerce Orders",
    goodKey: "customer_id",
    reasons: [
      "High cardinality (millions of customers)",
      "Co-locates all orders for a customer",
      "Avoids temporal hotspots from created_at",
    ],
  },
  {
    schema: "Social Media Posts",
    goodKey: "user_id",
    reasons: [
      "Co-locates user's posts for single-shard reads",
      "Avoids Snowflake ID temporal hotspot",
    ],
  },
  {
    schema: "IoT Sensor Readings",
    goodKey: "(device_id, year_month)",
    reasons: [
      "Distributes by device AND time period",
      "Enables time-based archiving",
      "Prevents single device growing unboundedly",
    ],
  },
];

console.log("\n=== Shard Key Selection Analysis ===");
shardKeyAnalysis.forEach(({ schema, goodKey, reasons }) => {
  console.log(`\n${schema}:`);
  console.log(`  Recommended shard key: ${goodKey}`);
  reasons.forEach((r) => console.log(`    - ${r}`));
});


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: CQRS Pattern — Write Service + Event → Read Model Update
// ─────────────────────────────────────────────────────────────────────────────

// Write model (normalized, mutation-focused)
const ordersWriteDB = new Map(); // orderId -> order

// Read model (denormalized, query-optimized — pre-joined with user info)
const ordersReadDB = new Map(); // orderId -> enriched order view
const userOrderIndex = new Map(); // userId -> [orderId]

// Event bus (simulated with EventEmitter)
const eventBus = new EventEmitter();

// Write service
class OrderCommandService {
  createOrder(orderId, userId, items, totalAmount) {
    const order = { orderId, userId, items, totalAmount, status: "pending", createdAt: new Date().toISOString() };
    ordersWriteDB.set(orderId, order);
    // Publish domain event
    eventBus.emit("OrderCreated", { ...order });
    console.log(`[WRITE] OrderCreated: ${orderId}`);
    return order;
  }

  updateOrderStatus(orderId, newStatus) {
    const order = ordersWriteDB.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    ordersWriteDB.set(orderId, order);
    eventBus.emit("OrderStatusUpdated", { orderId, newStatus, userId: order.userId });
    console.log(`[WRITE] OrderStatusUpdated: ${orderId} → ${newStatus}`);
  }
}

// Read model projector (subscribes to events, updates read store)
class OrderReadModelProjector {
  constructor() {
    eventBus.on("OrderCreated", this.onOrderCreated.bind(this));
    eventBus.on("OrderStatusUpdated", this.onOrderStatusUpdated.bind(this));
  }

  onOrderCreated(event) {
    const readView = {
      orderId: event.orderId,
      userId: event.userId,
      itemCount: event.items.length,
      totalAmount: event.totalAmount,
      status: event.status,
      createdAt: event.createdAt,
      // In real CQRS, this would be enriched with user data from user service
      userDisplayName: `User ${event.userId}`,
    };
    ordersReadDB.set(event.orderId, readView);
    if (!userOrderIndex.has(event.userId)) userOrderIndex.set(event.userId, []);
    userOrderIndex.get(event.userId).push(event.orderId);
    console.log(`[READ PROJECTION] Order ${event.orderId} added to read model`);
  }

  onOrderStatusUpdated(event) {
    const view = ordersReadDB.get(event.orderId);
    if (view) {
      view.status = event.newStatus;
      view.updatedAt = new Date().toISOString();
      console.log(`[READ PROJECTION] Order ${event.orderId} status updated in read model`);
    }
  }
}

// Query service (reads only from read model)
class OrderQueryService {
  getOrder(orderId) {
    return ordersReadDB.get(orderId) ?? null;
  }

  getOrdersByUser(userId) {
    const orderIds = userOrderIndex.get(userId) ?? [];
    return orderIds.map((id) => ordersReadDB.get(id)).filter(Boolean);
  }
}

console.log("\n=== CQRS Pattern ===");
const projector = new OrderReadModelProjector();
const commandService = new OrderCommandService();
const queryService = new OrderQueryService();

commandService.createOrder("order-001", "user-1", [{ sku: "LAPTOP", qty: 1 }], 1299.99);
commandService.createOrder("order-002", "user-1", [{ sku: "MOUSE", qty: 2 }], 49.99);
commandService.updateOrderStatus("order-001", "shipped");

console.log("\nRead model - order-001:", queryService.getOrder("order-001"));
console.log("Read model - user-1 orders:", queryService.getOrdersByUser("user-1").map((o) => o.orderId));


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Connection Pool Exhaustion Demo
// ─────────────────────────────────────────────────────────────────────────────

class DatabaseConnectionPool {
  constructor(maxConnections = 5) {
    this.maxConnections = maxConnections;
    this.activeConnections = 0;
    this.queue = [];
    this.stats = { acquired: 0, queued: 0, released: 0, rejected: 0 };
  }

  async acquire(requestId, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
      if (this.activeConnections < this.maxConnections) {
        this.activeConnections++;
        this.stats.acquired++;
        resolve({ id: requestId, connectionSlot: this.activeConnections });
        return;
      }

      // Pool exhausted — queue the request
      this.stats.queued++;
      console.log(`[POOL] Request ${requestId} queued (pool full: ${this.activeConnections}/${this.maxConnections})`);

      const timer = setTimeout(() => {
        const idx = this.queue.findIndex((q) => q.requestId === requestId);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.stats.rejected++;
          reject(new Error(`Request ${requestId} timed out waiting for DB connection`));
        }
      }, timeoutMs);

      this.queue.push({ requestId, resolve, reject, timer });
    });
  }

  release(requestId) {
    this.activeConnections--;
    this.stats.released++;

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      clearTimeout(next.timer);
      this.activeConnections++;
      this.stats.acquired++;
      next.resolve({ id: next.requestId, connectionSlot: this.activeConnections });
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeConnections: this.activeConnections,
      queueDepth: this.queue.length,
    };
  }
}

async function simulateDbQuery(pool, requestId, queryTimeMs) {
  let conn;
  try {
    conn = await pool.acquire(requestId);
    await new Promise((r) => setTimeout(r, queryTimeMs));
    return `Query ${requestId} completed`;
  } catch (err) {
    return `Query ${requestId} FAILED: ${err.message}`;
  } finally {
    if (conn) pool.release(requestId);
  }
}

async function runPoolDemo() {
  console.log("\n=== Connection Pool Demo (max 5 connections) ===");
  const pool = new DatabaseConnectionPool(5);

  // Simulate 20 concurrent requests, each taking 200ms
  const requests = Array.from({ length: 20 }, (_, i) =>
    simulateDbQuery(pool, `req-${i + 1}`, 200)
  );

  const results = await Promise.allSettled(requests);
  const failed = results.filter((r) => r.value && r.value.includes("FAILED")).length;
  console.log(`Results: ${results.length - failed} success, ${failed} failed (pool exhaustion)`);
  console.log("Pool stats:", pool.getStats());
  // With pool size 5 and 20 concurrent 200ms queries: later requests will timeout
  // This shows WHY PgBouncer/ProxySQL are essential in production
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Event Sourcing — Account Balance via Events
// ─────────────────────────────────────────────────────────────────────────────

class AccountEventStore {
  constructor() {
    this.events = new Map(); // accountId -> [events]
  }

  append(accountId, eventType, payload) {
    if (!this.events.has(accountId)) this.events.set(accountId, []);
    const event = {
      eventId: crypto.randomUUID(),
      accountId,
      eventType,
      payload,
      timestamp: Date.now(),
      version: this.events.get(accountId).length + 1,
    };
    this.events.get(accountId).push(event);
    return event;
  }

  getEvents(accountId, fromVersion = 0) {
    return (this.events.get(accountId) ?? []).filter(
      (e) => e.version > fromVersion
    );
  }
}

class AccountProjection {
  static rebuild(events) {
    return events.reduce(
      (state, event) => {
        switch (event.eventType) {
          case "AccountOpened":
            return { ...state, accountId: event.payload.accountId, balance: event.payload.initialBalance, status: "active" };
          case "MoneyDeposited":
            return { ...state, balance: state.balance + event.payload.amount };
          case "MoneyWithdrawn":
            if (state.balance < event.payload.amount) throw new Error("Insufficient funds");
            return { ...state, balance: state.balance - event.payload.amount };
          case "AccountClosed":
            return { ...state, status: "closed" };
          default:
            return state;
        }
      },
      { balance: 0, status: "unknown" }
    );
  }

  // Rebuild state at a specific point in time (temporal query)
  static rebuildAt(events, targetTimestamp) {
    return AccountProjection.rebuild(
      events.filter((e) => e.timestamp <= targetTimestamp)
    );
  }
}

class BankAccountService {
  constructor(eventStore) {
    this.store = eventStore;
  }

  openAccount(accountId, initialBalance) {
    this.store.append(accountId, "AccountOpened", { accountId, initialBalance });
    console.log(`[EVENT] AccountOpened: ${accountId}, balance: ${initialBalance}`);
  }

  deposit(accountId, amount, description = "") {
    this.store.append(accountId, "MoneyDeposited", { amount, description });
    console.log(`[EVENT] MoneyDeposited: ${accountId}, +${amount}`);
  }

  withdraw(accountId, amount, description = "") {
    const state = this.getBalance(accountId);
    if (state.balance < amount) throw new Error(`Insufficient funds: balance ${state.balance}, requested ${amount}`);
    this.store.append(accountId, "MoneyWithdrawn", { amount, description });
    console.log(`[EVENT] MoneyWithdrawn: ${accountId}, -${amount}`);
  }

  getBalance(accountId) {
    const events = this.store.getEvents(accountId);
    return AccountProjection.rebuild(events);
  }

  getFullAuditTrail(accountId) {
    return this.store.getEvents(accountId).map((e) => ({
      v: e.version,
      type: e.eventType,
      payload: e.payload,
    }));
  }
}

console.log("\n=== Event Sourcing: Bank Account ===");
const eventStore = new AccountEventStore();
const bank = new BankAccountService(eventStore);

bank.openAccount("ACC-001", 0);
bank.deposit("ACC-001", 5000, "Initial deposit");
bank.deposit("ACC-001", 1500, "Salary");
bank.withdraw("ACC-001", 200, "ATM withdrawal");
bank.withdraw("ACC-001", 3000, "Rent payment");

console.log("\nCurrent balance:", bank.getBalance("ACC-001"));
console.log("\nFull audit trail:");
bank.getFullAuditTrail("ACC-001").forEach((e) => console.log(` v${e.v}: ${e.type}`, e.payload));

try {
  bank.withdraw("ACC-001", 99999, "Attempted fraud");
} catch (err) {
  console.log("\nBlocked withdrawal:", err.message);
}

// Run pool demo
runPoolDemo();
