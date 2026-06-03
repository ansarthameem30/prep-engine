/**
 * Day 52 — Performance Optimization: Hands-On Exercises
 * Topics: DataLoader, event loop lag, request coalescing, stale-while-revalidate
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: DataLoader — Batch + Cache per Request
// ─────────────────────────────────────────────────────────────
/**
 * DataLoader collects all .load() calls made within a single tick,
 * then fires one batched fetch for all collected keys.
 * Also caches within the same request lifecycle.
 */
class DataLoader {
  constructor(batchFn, options = {}) {
    this.batchFn = batchFn;           // async (keys[]) => values[]
    this.cache = new Map();
    this.queue = [];                  // pending { key, resolve, reject }
    this.scheduled = false;
    this.maxBatchSize = options.maxBatchSize || Infinity;
  }

  load(key) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const promise = new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.queue.length >= this.maxBatchSize) {
        this._dispatch();
        return;
      }

      if (!this.scheduled) {
        this.scheduled = true;
        // Defer dispatch to end of current microtask queue
        Promise.resolve().then(() => this._dispatch());
      }
    });

    this.cache.set(key, promise);
    return promise;
  }

  loadMany(keys) {
    return Promise.all(keys.map(k => this.load(k)));
  }

  _dispatch() {
    this.scheduled = false;
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    const keys = batch.map(item => item.key);

    console.log(`[DataLoader] Batch dispatched: ${keys.length} keys — [${keys.join(', ')}]`);

    this.batchFn(keys)
      .then(values => {
        if (values.length !== keys.length) {
          throw new Error(`DataLoader: batch function must return exactly ${keys.length} values, got ${values.length}`);
        }
        batch.forEach(({ resolve }, i) => resolve(values[i]));
      })
      .catch(err => {
        batch.forEach(({ reject }) => reject(err));
      });
  }

  clearCache() {
    this.cache.clear();
  }

  prime(key, value) {
    // Pre-populate cache (useful for mutations that return the updated object)
    this.cache.set(key, Promise.resolve(value));
  }
}

// Demo: simulate database batch fetch
const userLoader = new DataLoader(async (userIds) => {
  // Simulated DB: SELECT * FROM users WHERE id IN (...)
  await new Promise(r => setTimeout(r, 10)); // simulate query latency
  return userIds.map(id => ({ id, name: `User ${id}`, email: `user${id}@example.com` }));
});

async function demoDataLoader() {
  // These 5 calls happen in the same tick — DataLoader collects them all
  const [u1, u2, u3, u4, u5] = await Promise.all([
    userLoader.load(1),
    userLoader.load(2),
    userLoader.load(3),
    userLoader.load(2), // duplicate — served from cache, no extra query
    userLoader.load(1), // duplicate
  ]);

  console.log('\n=== DataLoader Results ===');
  console.log('User 1:', u1);
  console.log('User 2 (second load):', u4); // same object from cache
  console.log('Are u1 and u5 the same object?', u1 === u5); // true — cached
}

// ─────────────────────────────────────────────────────────────
// Exercise 2: Measure Event Loop Lag
// ─────────────────────────────────────────────────────────────
/**
 * Set an interval every 10ms. Measure the actual vs expected time.
 * The difference is event loop lag — caused by blocking operations.
 */
function measureEventLoopLag(durationMs = 2000) {
  return new Promise(resolve => {
    const INTERVAL = 10; // expected interval
    let lastTick = Date.now();
    const lags = [];

    const timer = setInterval(() => {
      const now = Date.now();
      const lag = now - lastTick - INTERVAL;
      lags.push(lag);
      lastTick = now;
    }, INTERVAL);

    setTimeout(() => {
      clearInterval(timer);
      const avg = lags.reduce((a, b) => a + b, 0) / lags.length;
      const max = Math.max(...lags);
      const p99 = lags.sort((a, b) => a - b)[Math.floor(lags.length * 0.99)];
      console.log('\n=== Event Loop Lag Measurement ===');
      console.log(`Samples: ${lags.length}`);
      console.log(`Avg lag: ${avg.toFixed(2)}ms`);
      console.log(`Max lag: ${max}ms`);
      console.log(`P99 lag: ${p99}ms`);
      resolve({ avg, max, p99 });
    }, durationMs);

    // Simulate a blocking operation after 500ms — watch the lag spike
    setTimeout(() => {
      console.log('Simulating 100ms blocking operation...');
      const end = Date.now() + 100;
      while (Date.now() < end) { /* CPU spin */ }
    }, 500);
  });
}

// ─────────────────────────────────────────────────────────────
// Exercise 3: Bundle Analyzer Configuration
// ─────────────────────────────────────────────────────────────
/**
 * Webpack config to generate stats.json for bundle analysis.
 * Run: webpack --profile --json > stats.json
 * Then: npx webpack-bundle-analyzer stats.json
 *
 * This is a config snippet — not executable standalone.
 */
const webpackAnalyzerConfig = {
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Separate vendor bundle (changes less often → better cache hit rate)
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Separate large libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
        },
      },
    },
  },
  plugins: [
    // In a real project:
    // new BundleAnalyzerPlugin({ analyzerMode: 'static', reportFilename: 'bundle-report.html' })
  ],
};

function analyzeBundleSize(stats) {
  // Parse webpack stats and find largest chunks
  if (!stats || !stats.chunks) {
    console.log('\n=== Bundle Analysis (simulated) ===');
    const simulatedChunks = [
      { name: 'vendors', size: 450000 },
      { name: 'react',   size: 150000 },
      { name: 'main',    size: 85000 },
      { name: 'dashboard', size: 42000 },
    ];
    simulatedChunks
      .sort((a, b) => b.size - a.size)
      .forEach(({ name, size }) =>
        console.log(`  ${name}: ${(size / 1024).toFixed(1)} KB`)
      );
    return;
  }
  stats.chunks.sort((a, b) => b.size - a.size).slice(0, 10).forEach(chunk => {
    console.log(`  ${chunk.names[0]}: ${(chunk.size / 1024).toFixed(1)} KB`);
  });
}

// ─────────────────────────────────────────────────────────────
// Exercise 4: Request Coalescing
// ─────────────────────────────────────────────────────────────
/**
 * If multiple requests for the same key arrive within a time window,
 * deduplicate them into a single DB/API call.
 * Different from caching: coalescing is for in-flight deduplication,
 * caching is for storing the result after completion.
 */
class RequestCoalescer {
  constructor(fetchFn, windowMs = 10) {
    this.fetchFn = fetchFn;
    this.windowMs = windowMs;
    this.pending = new Map(); // key → { promise, timer }
  }

  async get(key) {
    if (this.pending.has(key)) {
      console.log(`[Coalescer] Coalesced request for key: ${key}`);
      return this.pending.get(key).promise;
    }

    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    const timer = setTimeout(async () => {
      this.pending.delete(key);
      try {
        const result = await this.fetchFn(key);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }, this.windowMs);

    this.pending.set(key, { promise, timer, resolve, reject });
    return promise;
  }
}

async function demoCoalescer() {
  let dbCallCount = 0;
  const coalescer = new RequestCoalescer(async (userId) => {
    dbCallCount++;
    await new Promise(r => setTimeout(r, 5));
    return { id: userId, name: `User ${userId}` };
  }, 10);

  // 5 simultaneous requests for user 42 — should result in 1 DB call
  const results = await Promise.all([
    coalescer.get(42),
    coalescer.get(42),
    coalescer.get(42),
    coalescer.get(99),
    coalescer.get(42),
  ]);

  console.log('\n=== Request Coalescing ===');
  console.log(`DB calls made: ${dbCallCount} (expected 2 — one for 42, one for 99)`);
  console.log('Results:', results);
}

// ─────────────────────────────────────────────────────────────
// Exercise 5: Stale-While-Revalidate Cache
// ─────────────────────────────────────────────────────────────
/**
 * Return stale (cached) data immediately for fast response.
 * Kick off background refresh — next caller gets fresh data.
 * This is the cache strategy behind CDN "stale-while-revalidate" HTTP header
 * and also used in SWR (React data fetching library).
 */
class StaleWhileRevalidateCache {
  constructor(fetchFn, options = {}) {
    this.fetchFn = fetchFn;
    this.ttl = options.ttl || 60000;      // how long data is "fresh"
    this.staleTime = options.staleTime || 300000; // how long stale data is still served
    this.store = new Map();
    this.revalidating = new Set();
  }

  async get(key) {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      // Cache miss — fetch and wait
      console.log(`[SWR] Cache miss for ${key} — fetching`);
      return this._fetchAndStore(key);
    }

    const age = now - entry.fetchedAt;
    const isFresh = age < this.ttl;
    const isStale = age >= this.ttl && age < this.staleTime;
    const isExpired = age >= this.staleTime;

    if (isFresh) {
      console.log(`[SWR] Cache hit (fresh) for ${key}`);
      return entry.value;
    }

    if (isExpired) {
      console.log(`[SWR] Cache expired for ${key} — fetching synchronously`);
      this.store.delete(key);
      return this._fetchAndStore(key);
    }

    if (isStale) {
      // Return stale immediately, revalidate in background
      console.log(`[SWR] Returning stale data for ${key}, revalidating in background`);
      if (!this.revalidating.has(key)) {
        this.revalidating.add(key);
        this._fetchAndStore(key).finally(() => this.revalidating.delete(key));
      }
      return entry.value;
    }
  }

  async _fetchAndStore(key) {
    const value = await this.fetchFn(key);
    this.store.set(key, { value, fetchedAt: Date.now() });
    return value;
  }

  invalidate(key) {
    this.store.delete(key);
  }
}

async function demoSWR() {
  let fetchCount = 0;
  const cache = new StaleWhileRevalidateCache(
    async (key) => {
      fetchCount++;
      await new Promise(r => setTimeout(r, 20));
      return { key, data: `data-v${fetchCount}`, timestamp: Date.now() };
    },
    { ttl: 100, staleTime: 500 } // 100ms fresh, 500ms stale
  );

  console.log('\n=== Stale-While-Revalidate Cache ===');
  const first = await cache.get('config');
  console.log('First fetch:', first);

  await new Promise(r => setTimeout(r, 150)); // past TTL, now stale
  const stale = await cache.get('config');    // returns stale immediately
  console.log('Stale result (immediate):', stale);

  await new Promise(r => setTimeout(r, 50)); // let background refresh complete
  const fresh = await cache.get('config');
  console.log('After revalidation:', fresh);
  console.log(`Total fetch calls: ${fetchCount}`);
}

// ─────────────────────────────────────────────────────────────
// Run All
// ─────────────────────────────────────────────────────────────
async function main() {
  await demoDataLoader();
  await measureEventLoopLag(1500);
  analyzeBundleSize(null);
  await demoCoalescer();
  await demoSWR();
}

main().catch(console.error);
