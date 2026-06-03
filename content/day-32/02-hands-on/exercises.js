/**
 * Day 32 — Caching Deep Dive: Hands-on Exercises
 *
 * Note: These exercises demonstrate patterns using simulated Redis-like
 * behavior. In production, replace the InMemoryRedis class with:
 *   const Redis = require("ioredis");
 *   const redis = new Redis({ host: "localhost", port: 6379 });
 */

// ─────────────────────────────────────────────────────────────────────────────
// Simulated Redis client (for running without a real Redis instance)
// ─────────────────────────────────────────────────────────────────────────────

class InMemoryRedis {
  constructor() {
    this.store = new Map();
    this.expiries = new Map();
    this.sortedSets = new Map(); // key -> Map(member -> score)
    this.hashes = new Map();     // key -> Map(field -> value)
  }

  _isExpired(key) {
    const exp = this.expiries.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expiries.delete(key);
      return true;
    }
    return false;
  }

  async get(key) {
    if (this._isExpired(key)) return null;
    return this.store.get(key) ?? null;
  }

  async set(key, value, ...args) {
    this.store.set(key, String(value));
    // Parse EX, PX, NX
    for (let i = 0; i < args.length; i++) {
      if (String(args[i]).toUpperCase() === "EX") {
        this.expiries.set(key, Date.now() + args[i + 1] * 1000);
        i++;
      }
      if (String(args[i]).toUpperCase() === "PX") {
        this.expiries.set(key, Date.now() + args[i + 1]);
        i++;
      }
      if (String(args[i]).toUpperCase() === "NX") {
        if (this.store.has(key) && !this._isExpired(key)) return null;
      }
    }
    return "OK";
  }

  async del(key) {
    this.store.delete(key);
    this.expiries.delete(key);
    return 1;
  }

  async incr(key) {
    const val = parseInt((await this.get(key)) ?? "0") + 1;
    this.store.set(key, String(val));
    return val;
  }

  async expire(key, seconds) {
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key) {
    const exp = this.expiries.get(key);
    if (!exp) return -1;
    return Math.ceil((exp - Date.now()) / 1000);
  }

  // Hash operations
  async hset(key, field, value) {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    this.hashes.get(key).set(field, String(value));
    return 1;
  }

  async hget(key, field) {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hgetall(key) {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    return Object.fromEntries(hash);
  }

  async hmset(key, obj) {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    const hash = this.hashes.get(key);
    for (const [f, v] of Object.entries(obj)) hash.set(f, String(v));
    return "OK";
  }

  // Sorted Set operations
  async zadd(key, score, member) {
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, new Map());
    this.sortedSets.get(key).set(member, score);
    return 1;
  }

  async zrangebyscore(key, min, max) {
    const ss = this.sortedSets.get(key);
    if (!ss) return [];
    return [...ss.entries()]
      .filter(([, s]) => s >= min && s <= max)
      .sort((a, b) => a[1] - b[1])
      .map(([m]) => m);
  }

  async zremrangebyscore(key, min, max) {
    const ss = this.sortedSets.get(key);
    if (!ss) return 0;
    let count = 0;
    for (const [m, s] of ss) {
      if (s >= min && s <= max) { ss.delete(m); count++; }
    }
    return count;
  }

  async zcard(key) {
    return this.sortedSets.get(key)?.size ?? 0;
  }

  async zrevrange(key, start, stop) {
    const ss = this.sortedSets.get(key);
    if (!ss) return [];
    const sorted = [...ss.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(start, stop + 1).map(([m, s]) => ({ member: m, score: s }));
  }
}

const redis = new InMemoryRedis();


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Cache-Aside Pattern — Get User by ID with Redis Caching
// ─────────────────────────────────────────────────────────────────────────────

// Simulated database
const userDB = new Map([
  [1, { id: 1, name: "Alice Smith", email: "alice@example.com", role: "admin" }],
  [2, { id: 2, name: "Bob Jones", email: "bob@example.com", role: "user" }],
]);

async function getUserById(userId) {
  const cacheKey = `user:${userId}`;

  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT] user:${userId}`);
    return JSON.parse(cached);
  }

  // 2. Cache miss — read from database
  console.log(`[CACHE MISS] user:${userId} — fetching from DB`);
  const user = userDB.get(userId);
  if (!user) return null;

  // 3. Write to cache (TTL = 1 hour)
  await redis.set(cacheKey, JSON.stringify(user), "EX", 3600);

  return user;
}

async function updateUser(userId, updates) {
  // Update database
  const existing = userDB.get(userId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  userDB.set(userId, updated);

  // Invalidate cache — stale-on-write pattern
  await redis.del(`user:${userId}`);
  console.log(`[CACHE INVALIDATED] user:${userId}`);

  return updated;
}

async function runCacheAsideDemo() {
  console.log("=== Cache-Aside Pattern ===");
  await getUserById(1);  // CACHE MISS
  await getUserById(1);  // CACHE HIT
  await getUserById(2);  // CACHE MISS
  await updateUser(1, { name: "Alice Johnson" }); // Invalidates cache
  await getUserById(1);  // CACHE MISS again (fetches updated data)
  const user = await getUserById(1);
  console.log("Final user:", user);
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Rate Limiter — Sliding Window using Redis Sorted Set
// ─────────────────────────────────────────────────────────────────────────────

async function isRateLimited(userId, windowMs = 60000, maxRequests = 5) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // 1. Remove requests outside the window
  await redis.zremrangebyscore(key, 0, windowStart);

  // 2. Count requests in current window
  const count = await redis.zcard(key);

  if (count >= maxRequests) {
    console.log(`[RATE LIMITED] user:${userId} — ${count}/${maxRequests} requests in window`);
    return true;
  }

  // 3. Record this request (score = timestamp for ordering)
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  console.log(`[ALLOWED] user:${userId} — ${count + 1}/${maxRequests} requests in window`);
  return false;
}

async function runRateLimiterDemo() {
  console.log("\n=== Sliding Window Rate Limiter (5 req/min) ===");
  for (let i = 0; i < 7; i++) {
    await isRateLimited("user:1001", 60000, 5);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Session Store using Redis Hash
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");

async function createSession(userId, metadata = {}) {
  const sessionId = crypto.randomBytes(16).toString("hex");
  const sessionKey = `session:${sessionId}`;

  await redis.hmset(sessionKey, {
    userId: String(userId),
    createdAt: String(Date.now()),
    userAgent: metadata.userAgent ?? "unknown",
    ip: metadata.ip ?? "unknown",
  });
  await redis.expire(sessionKey, 86400); // 24 hour TTL

  console.log(`[SESSION CREATED] ${sessionId} for user ${userId}`);
  return sessionId;
}

async function getSession(sessionId) {
  const sessionKey = `session:${sessionId}`;
  const session = await redis.hgetall(sessionKey);
  if (!session || Object.keys(session).length === 0) {
    console.log(`[SESSION NOT FOUND] ${sessionId}`);
    return null;
  }
  console.log(`[SESSION VALID] ${sessionId}`, session);
  return session;
}

async function destroySession(sessionId) {
  await redis.del(`session:${sessionId}`);
  console.log(`[SESSION DESTROYED] ${sessionId}`);
}

async function runSessionDemo() {
  console.log("\n=== Session Store with Redis Hash ===");
  const sessionId = await createSession(42, { userAgent: "Chrome/120", ip: "10.0.0.1" });
  await getSession(sessionId);
  await destroySession(sessionId);
  await getSession(sessionId); // Should show not found
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Leaderboard with Redis Sorted Set
// ─────────────────────────────────────────────────────────────────────────────

async function updateScore(playerId, score) {
  await redis.zadd("leaderboard:global", score, playerId);
}

async function getTopPlayers(n = 10) {
  const top = await redis.zrevrange("leaderboard:global", 0, n - 1);
  console.log(`\nTop ${n} Players:`);
  top.forEach((entry, idx) => {
    console.log(`  ${idx + 1}. ${entry.member} — ${entry.score} pts`);
  });
  return top;
}

async function runLeaderboardDemo() {
  console.log("\n=== Leaderboard with Redis Sorted Set ===");
  await updateScore("player:alice", 9500);
  await updateScore("player:bob", 12000);
  await updateScore("player:carol", 8750);
  await updateScore("player:dave", 15000);
  await updateScore("player:eve", 11200);
  await getTopPlayers(5);
  // Real-time update: alice wins a match
  await updateScore("player:alice", 13000);
  console.log("After alice's big win:");
  await getTopPlayers(5);
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Cache Stampede Prevention — Mutex Lock with Redis SET NX EX
// ─────────────────────────────────────────────────────────────────────────────

async function getHomepageConfig() {
  const CACHE_KEY = "homepage:config";
  const LOCK_KEY = "lock:homepage:config";
  const LOCK_TTL_SEC = 5;
  const LOCK_ID = crypto.randomBytes(8).toString("hex");

  // Check cache first
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  // Try to acquire lock (SET NX = only set if Not eXists)
  const acquired = await redis.set(LOCK_KEY, LOCK_ID, "NX", "EX", LOCK_TTL_SEC);

  if (!acquired) {
    // Another thread holds the lock — wait and retry (in real code: retry with backoff)
    console.log("[STAMPEDE PREVENTION] Lock held by another request, waiting...");
    await new Promise((r) => setTimeout(r, 50)); // Wait 50ms
    // In production: retry loop with exponential backoff + max retries
    return getHomepageConfig();
  }

  try {
    // Simulate expensive DB/API call (e.g., 200ms)
    console.log("[LOCK ACQUIRED] Fetching homepage config from DB...");
    await new Promise((r) => setTimeout(r, 50));
    const config = {
      heroTitle: "Welcome to Our Platform",
      featuredProducts: [101, 202, 303],
      bannerColor: "#FF6B35",
      fetchedAt: new Date().toISOString(),
    };

    // Write to cache with TTL + jitter (prevents synchronized expiry)
    const jitter = Math.floor(Math.random() * 300); // 0-300s jitter
    await redis.set(CACHE_KEY, JSON.stringify(config), "EX", 3600 + jitter);
    console.log(`[CACHE POPULATED] TTL: ${3600 + jitter}s (with jitter)`);

    return config;
  } finally {
    // Release lock only if we still own it (check LOCK_ID to prevent deleting another's lock)
    const currentOwner = await redis.get(LOCK_KEY);
    if (currentOwner === LOCK_ID) {
      await redis.del(LOCK_KEY);
      console.log("[LOCK RELEASED]");
    }
  }
}

async function runStampedePreventionDemo() {
  console.log("\n=== Cache Stampede Prevention — Mutex Lock ===");
  // Simulate 5 concurrent requests all hitting expired cache simultaneously
  const results = await Promise.all([
    getHomepageConfig(),
    getHomepageConfig(),
    getHomepageConfig(),
    getHomepageConfig(),
    getHomepageConfig(),
  ]);
  console.log(`All ${results.length} requests completed. DB called once.`);
}

// Run all demos
(async () => {
  await runCacheAsideDemo();
  await runRateLimiterDemo();
  await runSessionDemo();
  await runLeaderboardDemo();
  await runStampedePreventionDemo();
})();
