/**
 * Day 57 — Node.js + Database Mock Coding Challenges
 */

// ─────────────────────────────────────────────────────────────
// 1. Connection Pool from Scratch
// ─────────────────────────────────────────────────────────────
class ConnectionPool {
  constructor(createConnection, options = {}) {
    this.createConnection = createConnection;
    this.minSize     = options.min || 2;
    this.maxSize     = options.max || 10;
    this.acquireTimeout = options.acquireTimeout || 5000;
    this.idleTimeout    = options.idleTimeout || 30000;

    this.available = [];  // idle connections
    this.inUse     = new Set(); // acquired connections
    this.waiting   = [];  // { resolve, reject, timer }

    // Pre-warm pool with min connections
    for (let i = 0; i < this.minSize; i++) {
      this._createAndStore().catch(console.error);
    }
  }

  async _createAndStore() {
    const conn = await this.createConnection();
    conn._createdAt = Date.now();
    this.available.push(conn);
    return conn;
  }

  async acquire() {
    // Return idle connection if available
    if (this.available.length > 0) {
      const conn = this.available.pop();
      this.inUse.add(conn);
      console.log(`[Pool] Acquired connection (${this.inUse.size} in use, ${this.available.length} idle)`);
      return conn;
    }

    // Create new connection if below max
    if (this.inUse.size < this.maxSize) {
      const conn = await this.createConnection();
      conn._createdAt = Date.now();
      this.inUse.add(conn);
      console.log(`[Pool] Created new connection (${this.inUse.size} in use)`);
      return conn;
    }

    // Pool exhausted — queue the request with timeout
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove from waiting queue on timeout
        const idx = this.waiting.findIndex(w => w.resolve === resolve);
        if (idx !== -1) this.waiting.splice(idx, 1);
        reject(new Error(`[Pool] Acquire timeout after ${this.acquireTimeout}ms — pool exhausted`));
      }, this.acquireTimeout);

      this.waiting.push({ resolve, reject, timer });
      console.log(`[Pool] Queued — ${this.waiting.length} request(s) waiting`);
    });
  }

  release(conn) {
    this.inUse.delete(conn);

    // Serve a waiting request first
    if (this.waiting.length > 0) {
      const { resolve, reject, timer } = this.waiting.shift();
      clearTimeout(timer);
      this.inUse.add(conn);
      resolve(conn);
      console.log(`[Pool] Connection handed to waiting request (${this.inUse.size} in use)`);
      return;
    }

    this.available.push(conn);
    console.log(`[Pool] Released (${this.inUse.size} in use, ${this.available.length} idle)`);
  }

  async withConnection(fn) {
    const conn = await this.acquire();
    try {
      return await fn(conn);
    } finally {
      this.release(conn);
    }
  }

  destroy() {
    for (const conn of [...this.available, ...this.inUse]) {
      conn.destroy?.();
    }
    this.available = [];
    this.inUse.clear();
  }
}

async function demoConnectionPool() {
  console.log('=== Connection Pool ===');
  let connId = 0;

  const pool = new ConnectionPool(
    async () => ({ id: ++connId, query: async (sql) => ({ rows: [{ result: sql }] }) }),
    { min: 2, max: 3, acquireTimeout: 500 }
  );

  await new Promise(r => setTimeout(r, 10)); // let min connections initialize

  // Use the pool
  const result = await pool.withConnection(conn => conn.query('SELECT 1'));
  console.log('Query result:', result);

  // Exhaust the pool and test waiting queue
  const conns = await Promise.all([pool.acquire(), pool.acquire(), pool.acquire()]);
  console.log('Pool exhausted. Trying to acquire one more...');
  try {
    await pool.acquire(); // should timeout
  } catch (err) {
    console.log('Expected timeout:', err.message);
  }

  pool.release(conns[0]); // Release one — pool should serve next waiter
  pool.release(conns[1]);
  pool.release(conns[2]);
}

// ─────────────────────────────────────────────────────────────
// 2. Distributed Lock with Redis (SET NX EX pattern)
// ─────────────────────────────────────────────────────────────
/**
 * Distributed lock ensures only ONE instance of a job runs at a time
 * across multiple Node.js processes/servers.
 *
 * Pattern: SET key value NX EX ttl
 *   NX = only set if not exists
 *   EX = expire after N seconds
 *   value = unique lock owner ID (for safe release — don't release someone else's lock)
 */
class DistributedLock {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async acquire(key, ttlSeconds = 30) {
    const lockValue = `lock:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    // Atomic: SET key lockValue NX EX ttl
    const result = await this.redis.set(key, lockValue, { NX: true, EX: ttlSeconds });

    if (result !== 'OK') return null; // lock already held

    console.log(`[Lock] Acquired "${key}" (owner: ${lockValue.slice(0, 20)})`);
    return lockValue;
  }

  async release(key, lockValue) {
    // Lua script for atomic check-and-delete (don't release someone else's lock!)
    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    // Simulate Lua execution
    const currentValue = this.redis._store.get(key);
    if (currentValue === lockValue) {
      this.redis._store.delete(key);
      console.log(`[Lock] Released "${key}"`);
      return true;
    }
    console.log(`[Lock] Release failed — lock "${key}" owned by someone else`);
    return false;
  }

  async withLock(key, ttlSeconds, fn) {
    const lockValue = await this.acquire(key, ttlSeconds);
    if (!lockValue) throw new Error(`Could not acquire lock "${key}"`);

    try {
      return await fn();
    } finally {
      await this.release(key, lockValue);
    }
  }
}

// Simulated Redis client
const mockRedis = {
  _store: new Map(),
  async set(key, value, opts = {}) {
    if (opts.NX && this._store.has(key)) return null;
    this._store.set(key, value);
    if (opts.EX) setTimeout(() => this._store.delete(key), opts.EX * 1000);
    return 'OK';
  },
};

async function demoDistributedLock() {
  console.log('\n=== Distributed Lock ===');
  const lock = new DistributedLock(mockRedis);

  // Two processes try to acquire same lock
  const [l1, l2] = await Promise.all([
    lock.acquire('job:process-payments'),
    lock.acquire('job:process-payments'),
  ]);

  console.log('Lock 1:', l1 ? 'acquired' : 'blocked');
  console.log('Lock 2:', l2 ? 'acquired' : 'blocked');

  // Release lock 1 — now lock 2 could acquire
  if (l1) await lock.release('job:process-payments', l1);

  // withLock pattern
  try {
    const result = await lock.withLock('job:send-email', 30, async () => {
      console.log('Running exclusive job...');
      await new Promise(r => setTimeout(r, 10));
      return 'job completed';
    });
    console.log('Job result:', result);
  } catch (err) {
    console.error('Lock error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Priority Job Queue
// ─────────────────────────────────────────────────────────────
class PriorityJobQueue {
  constructor(workerCount = 2) {
    this.queue = [];   // min-heap sorted by priority (lower number = higher priority)
    this.running = 0;
    this.workerCount = workerCount;
    this.processed = 0;
  }

  enqueue(job, priority = 5) {
    this.queue.push({ job, priority, enqueuedAt: Date.now() });
    // Keep sorted by priority (min-heap insertion sort — for small queues)
    this.queue.sort((a, b) => a.priority - b.priority);
    console.log(`[Queue] Enqueued job "${job.name}" at priority ${priority} (queue size: ${this.queue.length})`);
    this._process();
  }

  async _process() {
    if (this.running >= this.workerCount || this.queue.length === 0) return;

    const { job, priority } = this.queue.shift();
    this.running++;

    console.log(`[Queue] Processing "${job.name}" (priority ${priority}, workers: ${this.running}/${this.workerCount})`);

    try {
      const result = await job.execute();
      this.processed++;
      console.log(`[Queue] Completed "${job.name}": ${result}`);
    } catch (err) {
      console.error(`[Queue] Failed "${job.name}": ${err.message}`);
    } finally {
      this.running--;
      this._process(); // pick up next job
    }
  }
}

async function demoPriorityQueue() {
  console.log('\n=== Priority Job Queue ===');
  const queue = new PriorityJobQueue(2); // 2 concurrent workers

  queue.enqueue({ name: 'low-priority-cleanup', execute: async () => { await new Promise(r => setTimeout(r, 30)); return 'done'; } }, 8);
  queue.enqueue({ name: 'critical-payment', execute: async () => { await new Promise(r => setTimeout(r, 20)); return 'paid'; } }, 1);
  queue.enqueue({ name: 'email-notification', execute: async () => { await new Promise(r => setTimeout(r, 15)); return 'sent'; } }, 5);
  queue.enqueue({ name: 'urgent-alert', execute: async () => { await new Promise(r => setTimeout(r, 10)); return 'alerted'; } }, 1);

  await new Promise(r => setTimeout(r, 200)); // wait for all jobs
  console.log(`Total processed: ${queue.processed}`);
}

// ─────────────────────────────────────────────────────────────
// 4. Rate Limiter — Sliding Window with Pluggable Storage
// ─────────────────────────────────────────────────────────────
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.max      = options.max || 100;
    this.store    = options.store || new InMemoryStore();
  }

  async check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove entries outside the window and count remaining
    const count = await this.store.countAndClean(identifier, windowStart, now);

    if (count >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + this.windowMs).toISOString(),
        retryAfter: Math.ceil(this.windowMs / 1000),
      };
    }

    await this.store.add(identifier, now);
    return {
      allowed: true,
      remaining: this.max - count - 1,
      resetAt: new Date(now + this.windowMs).toISOString(),
    };
  }

  middleware() {
    return async (req, res, next) => {
      const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const result = await this.check(identifier);

      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter);
        return res?.status(429).json({ error: 'Too Many Requests' })
          || console.log(`[RateLimit] BLOCKED: ${identifier}`);
      }

      next?.();
    };
  }
}

class InMemoryStore {
  constructor() { this.windows = new Map(); }

  async countAndClean(id, windowStart, now) {
    if (!this.windows.has(id)) this.windows.set(id, []);
    const timestamps = this.windows.get(id).filter(t => t > windowStart);
    this.windows.set(id, timestamps);
    return timestamps.length;
  }

  async add(id, timestamp) {
    if (!this.windows.has(id)) this.windows.set(id, []);
    this.windows.get(id).push(timestamp);
  }
}

// Redis store (interface only — shows pluggability)
class RedisStore {
  constructor(client) { this.client = client; }
  async countAndClean(id, windowStart, now) {
    const key = `ratelimit:${id}`;
    await this.client?.zremrangebyscore(key, 0, windowStart);
    return (await this.client?.zcard(key)) || 0;
  }
  async add(id, timestamp) {
    const key = `ratelimit:${id}`;
    await this.client?.zadd(key, timestamp, String(timestamp));
    await this.client?.expire(key, 60);
  }
}

async function demoRateLimiter() {
  console.log('\n=== Rate Limiter (Sliding Window) ===');
  const limiter = new RateLimiter({ windowMs: 1000, max: 3 });

  for (let i = 0; i < 5; i++) {
    const result = await limiter.check('user:42');
    console.log(`Request ${i + 1}:`, result.allowed ? `allowed (${result.remaining} remaining)` : 'BLOCKED');
  }

  await new Promise(r => setTimeout(r, 1100)); // wait for window to reset
  const afterReset = await limiter.check('user:42');
  console.log('After reset:', afterReset.allowed ? 'allowed' : 'blocked');
}

// ─────────────────────────────────────────────────────────────
// 5. API Versioning Middleware
// ─────────────────────────────────────────────────────────────
class ApiVersionRouter {
  constructor() {
    this.versions = new Map(); // version → handlers
  }

  register(version, handlers) {
    this.versions.set(version, handlers);
    return this;
  }

  middleware() {
    return (req, res, next) => {
      // Extract version from: Accept header, URL, or X-API-Version header
      const version = this._extractVersion(req);
      req.apiVersion = version;

      const handler = this._resolveHandler(req, version);
      if (handler) {
        handler(req, res, next);
      } else {
        res?.status(400).json({ error: `API version '${version}' not supported` })
          || console.log(`[APIVersion] No handler for ${version} ${req.method} ${req.path}`);
      }
    };
  }

  _extractVersion(req) {
    // Priority: URL path (/v1/...) > Accept header > custom header > default
    const urlMatch = req.path?.match(/^\/v(\d+)\//);
    if (urlMatch) return `v${urlMatch[1]}`;

    const acceptHeader = req.headers?.['accept'];
    const acceptMatch = acceptHeader?.match(/application\/vnd\.myapi\.v(\d+)\+json/);
    if (acceptMatch) return `v${acceptMatch[1]}`;

    return req.headers?.['x-api-version'] || 'v1';
  }

  _resolveHandler(req, version) {
    const versionHandlers = this.versions.get(version);
    if (!versionHandlers) return null;

    const route = `${req.method} ${req.path?.replace(/^\/v\d+/, '') || '/'}`;
    return versionHandlers[route] || null;
  }
}

function demoApiVersioning() {
  console.log('\n=== API Versioning ===');
  const router = new ApiVersionRouter();

  router.register('v1', {
    'GET /users': (req) => console.log('[v1] Get users: returns { id, name }'),
    'POST /users': (req) => console.log('[v1] Create user'),
  });

  router.register('v2', {
    'GET /users': (req) => console.log('[v2] Get users: returns { id, name, email, createdAt }'),
    'POST /users': (req) => console.log('[v2] Create user with validation'),
    'DELETE /users/:id': (req) => console.log('[v2] Soft delete user'),
  });

  const middleware = router.middleware();

  // Simulate requests
  const requests = [
    { method: 'GET', path: '/v1/users', headers: {} },
    { method: 'GET', path: '/v2/users', headers: {} },
    { method: 'GET', path: '/users', headers: { 'x-api-version': 'v2' } },
    { method: 'DELETE', path: '/v1/users/123', headers: {} },
  ];

  for (const req of requests) {
    console.log(`\nRequest: ${req.method} ${req.path}`);
    middleware(req, null, () => {});
  }
}

// ─────────────────────────────────────────────────────────────
// Run All
// ─────────────────────────────────────────────────────────────
async function main() {
  await demoConnectionPool();
  await demoDistributedLock();
  await demoPriorityQueue();
  await demoRateLimiter();
  demoApiVersioning();
}

main().catch(console.error);
