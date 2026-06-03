/**
 * Day 35 — URL Shortener: Hands-on Exercises
 */

const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Base62 Encode / Decode
// ─────────────────────────────────────────────────────────────────────────────

const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = 62;

function toBase62(num) {
  if (num === 0) return BASE62_CHARS[0];
  let result = "";
  while (num > 0) {
    result = BASE62_CHARS[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result;
}

function fromBase62(str) {
  let result = 0;
  for (const ch of str) {
    const idx = BASE62_CHARS.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid Base62 character: ${ch}`);
    result = result * BASE + idx;
  }
  return result;
}

console.log("=== Base62 Encode/Decode ===");
const testIds = [1, 100, 999, 1000000, 9999999, 3521614606207]; // 3.5T = 62^7
testIds.forEach((id) => {
  const encoded = toBase62(id);
  const decoded = fromBase62(encoded);
  console.log(`${id} → "${encoded}" (${encoded.length} chars) → ${decoded} ✓`);
});

// Demonstrate uniqueness property
console.log("\n62^7 =", Math.pow(62, 7).toLocaleString(), "unique 7-char codes");
console.log("At 100M/day, exhausts in:", Math.pow(62, 7) / 100_000_000 / 365, "years");


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Short Code Generation Service with Redis Counter
// ─────────────────────────────────────────────────────────────────────────────

// Simulated Redis
class FakeRedis {
  constructor() { this.store = new Map(); }
  async get(k) { return this.store.get(k) ?? null; }
  async set(k, v) { this.store.set(k, v); return "OK"; }
  async del(k) { this.store.delete(k); }
  async incrby(k, n) {
    const val = (parseInt(this.store.get(k) ?? "0")) + n;
    this.store.set(k, String(val));
    return val;
  }
}

const redis = new FakeRedis();
const urlDB = new Map(); // shortCode -> { originalUrl, userId, expiresAt, clickCount }

class ShortCodeGenerator {
  constructor(redis, batchSize = 1000) {
    this.redis = redis;
    this.batchSize = batchSize;
    this.localPool = [];
    this.currentBatchMax = 0;
  }

  async nextId() {
    if (this.localPool.length === 0) {
      // Fetch a new batch of IDs atomically from Redis
      const batchEnd = await this.redis.incrby("url_counter", this.batchSize);
      const batchStart = batchEnd - this.batchSize + 1;
      for (let i = batchStart; i <= batchEnd; i++) {
        this.localPool.push(i);
      }
      console.log(`[Generator] Fetched ID batch: ${batchStart}–${batchEnd}`);
    }
    return this.localPool.shift();
  }

  async generate() {
    const id = await this.nextId();
    return toBase62(id);
  }
}

class URLShortenerService {
  constructor(redis) {
    this.redis = redis;
    this.generator = new ShortCodeGenerator(redis);
  }

  async shorten(originalUrl, options = {}) {
    // Validate URL
    try { new URL(originalUrl); } catch { throw new Error("Invalid URL"); }

    const shortCode = options.customAlias ?? await this.generator.generate();

    // Check uniqueness for custom alias
    if (options.customAlias) {
      const existing = await this.getUrl(shortCode);
      if (existing) throw new Error(`Custom alias "${shortCode}" is already taken`);
    }

    const record = {
      originalUrl,
      shortCode,
      userId: options.userId ?? null,
      createdAt: Date.now(),
      expiresAt: options.expiresAt ?? null,
      clickCount: 0,
      isActive: true,
    };

    urlDB.set(shortCode, record);

    // Cache the redirect mapping
    const ttl = options.expiresAt
      ? Math.floor((options.expiresAt - Date.now()) / 1000)
      : 86400; // default 24h cache
    await this.redis.set(`url:${shortCode}`, originalUrl);

    console.log(`[Shortener] Created: short.ly/${shortCode} → ${originalUrl.slice(0, 50)}`);
    return `https://short.ly/${shortCode}`;
  }

  async getUrl(shortCode) {
    // Cache-aside
    const cached = await this.redis.get(`url:${shortCode}`);
    if (cached) {
      console.log(`[Shortener] Cache HIT: ${shortCode}`);
      return cached;
    }

    // DB lookup
    const record = urlDB.get(shortCode);
    if (!record || !record.isActive) return null;

    // Check expiration
    if (record.expiresAt && Date.now() > record.expiresAt) {
      record.isActive = false;
      return null;
    }

    // Populate cache
    await this.redis.set(`url:${shortCode}`, record.originalUrl);
    console.log(`[Shortener] Cache MISS: ${shortCode}`);
    return record.originalUrl;
  }

  async redirect(shortCode) {
    const url = await this.getUrl(shortCode);
    if (!url) return { status: 404, message: "Not found or expired" };
    // In production: async click tracking (Kafka or Redis INCR + batch flush)
    const record = urlDB.get(shortCode);
    if (record) record.clickCount++;
    return { status: 302, location: url };
  }
}

async function runShortenerDemo() {
  console.log("\n=== URL Shortener Service ===");
  const service = new URLShortenerService(redis);

  const url1 = await service.shorten("https://www.google.com/search?q=system+design+interview");
  const url2 = await service.shorten("https://github.com/very/long/repository/path/to/readme.md");
  const url3 = await service.shorten("https://example.com", { customAlias: "mylink" });

  console.log("\nRedirect test:");
  const codes = [url1, url2, url3].map((u) => u.split("/").pop());
  for (const code of codes) {
    const result = await service.redirect(code);
    console.log(`  /${code} → ${result.status} → ${result.location?.slice(0, 50) ?? "NOT FOUND"}`);
  }

  // Test cache hit
  console.log("\nSecond access (should be cache hits):");
  for (const code of codes) {
    await service.redirect(code);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Redirect Handler with Cache-Aside
// (Demonstrates the redirect flow with latency simulation)
// ─────────────────────────────────────────────────────────────────────────────

async function handleRedirect(shortCode, cache, db) {
  const start = Date.now();

  // L1: Cache lookup
  const cached = await cache.get(`url:${shortCode}`);
  if (cached) {
    const latency = Date.now() - start;
    console.log(`[Redirect] ${shortCode} → CACHE HIT (${latency}ms)`);
    return { url: cached, source: "cache", latency };
  }

  // Simulate DB latency (5-15ms)
  await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 10)));
  const record = db.get(shortCode);
  const latency = Date.now() - start;

  if (!record) {
    console.log(`[Redirect] ${shortCode} → 404 (${latency}ms)`);
    return { url: null, status: 404, latency };
  }

  // Write to cache
  await cache.set(`url:${shortCode}`, record.originalUrl);
  console.log(`[Redirect] ${shortCode} → DB HIT, cached (${latency}ms)`);
  return { url: record.originalUrl, source: "db", latency };
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Click Analytics with Debounced/Batched Writes
// ─────────────────────────────────────────────────────────────────────────────

class ClickAnalyticsService {
  constructor(redis, db, batchThreshold = 100, flushIntervalMs = 5000) {
    this.redis = redis;
    this.db = db;
    this.batchThreshold = batchThreshold;
    this.pendingFlush = new Map(); // shortCode -> count

    // Flush on interval (ensures writes even without hitting threshold)
    this.timer = setInterval(() => this.flushAll(), flushIntervalMs);
  }

  async trackClick(shortCode) {
    const key = `clicks:${shortCode}`;
    const newCount = await this.redis.incrby(key, 1);
    this.pendingFlush.set(shortCode, true);

    if (newCount >= this.batchThreshold) {
      await this.flush(shortCode);
    }

    return newCount;
  }

  async flush(shortCode) {
    const key = `clicks:${shortCode}`;
    const countStr = await this.redis.get(key);
    if (!countStr || countStr === "0") return;

    const count = parseInt(countStr);
    const record = this.db.get(shortCode);
    if (record) {
      record.clickCount += count;
      await this.redis.set(key, "0"); // Reset counter
      this.pendingFlush.delete(shortCode);
      console.log(`[Analytics] Flushed ${count} clicks for /${shortCode} to DB (total: ${record.clickCount})`);
    }
  }

  async flushAll() {
    for (const shortCode of this.pendingFlush.keys()) {
      await this.flush(shortCode);
    }
  }

  stop() {
    clearInterval(this.timer);
  }
}

async function runAnalyticsDemo() {
  console.log("\n=== Click Analytics with Batched Writes ===");
  const localDB = new Map([
    ["abc1234", { originalUrl: "https://example.com", clickCount: 0 }],
  ]);

  const analytics = new ClickAnalyticsService(redis, localDB, 10, 1000);

  // Simulate 25 clicks
  for (let i = 0; i < 25; i++) {
    await analytics.trackClick("abc1234");
  }

  await new Promise((r) => setTimeout(r, 1500)); // Wait for timer flush
  analytics.stop();

  console.log(`Final DB click count: ${localDB.get("abc1234").clickCount}`);
  // Should be 25 (10 + 10 from threshold + 5 from timer flush)
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: URL Expiration Middleware
// ─────────────────────────────────────────────────────────────────────────────

function createExpirationMiddleware(urlDB) {
  return async function checkExpiration(shortCode) {
    const record = urlDB.get(shortCode);

    if (!record) {
      return { valid: false, reason: "not_found" };
    }

    if (!record.isActive) {
      return { valid: false, reason: "deactivated" };
    }

    if (record.expiresAt && Date.now() > record.expiresAt) {
      // Lazy expiration: mark as inactive on first access after expiry
      record.isActive = false;
      // Invalidate cache
      await redis.del(`url:${shortCode}`);
      return { valid: false, reason: "expired", expiredAt: record.expiresAt };
    }

    const remainingMs = record.expiresAt ? record.expiresAt - Date.now() : null;
    return {
      valid: true,
      originalUrl: record.originalUrl,
      remainingMs,
      remainingDays: remainingMs ? Math.ceil(remainingMs / 86400000) : null,
    };
  };
}

async function runExpirationDemo() {
  console.log("\n=== URL Expiration Middleware ===");
  const testDB = new Map([
    ["active1", { originalUrl: "https://active.com", isActive: true, expiresAt: null }],
    ["exprd1", { originalUrl: "https://expired.com", isActive: true, expiresAt: Date.now() - 1000 }],
    ["futur1", { originalUrl: "https://future.com", isActive: true, expiresAt: Date.now() + 7 * 86400000 }],
  ]);

  const check = createExpirationMiddleware(testDB);

  console.log("active1:", await check("active1"));
  console.log("exprd1:", await check("exprd1"));
  console.log("futur1:", await check("futur1"));
  console.log("unknwn:", await check("unknwn"));
}

// Run all demos
(async () => {
  await runShortenerDemo();
  await runAnalyticsDemo();
  await runExpirationDemo();
})();
