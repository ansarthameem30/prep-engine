/**
 * Day 30 — Backend Mock Interview Day
 * Full Backend Coding Challenge
 */

// ─────────────────────────────────────────────
// Exercise 1: REST API Skeleton — Blog CRUD + Auth
// ─────────────────────────────────────────────

function exercise1_blogApiSkeleton() {
  console.log('=== Exercise 1: Blog API Skeleton ===\n');

  // Production Express app structure:
  const expressApp = `
  // app.js
  const express = require('express');
  const { createPool } = require('mysql2/promise');
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');

  const app = express();
  app.use(express.json());

  const db = createPool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    connectionLimit: 10
  });

  // ─── asyncHandler ─────────────────────────
  const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // ─── Auth Middleware ──────────────────────
  const requireAuth = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  // ─── Auth Routes ──────────────────────────
  app.post('/api/v1/auth/register', asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(422).json({ error: 'email, password, and name are required' });
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [email, name, hash]
    );
    res.status(201).json({ id: result.insertId, email, name });
  }));

  app.post('/api/v1/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const [[user]] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ sub: user.id, email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token });
  }));

  // ─── Post Routes ──────────────────────────
  app.get('/api/v1/posts', asyncHandler(async (req, res) => {
    const { cursor, limit = 20, status = 'published' } = req.query;
    const lim = Math.min(parseInt(limit), 100);
    const params = [status];
    let sql = 'SELECT * FROM posts WHERE status = ?';
    if (cursor) { sql += ' AND id > ?'; params.push(cursor); }
    sql += ' ORDER BY id ASC LIMIT ?';
    params.push(lim + 1);

    const [posts] = await db.execute(sql, params);
    const hasMore = posts.length > lim;
    const data = posts.slice(0, lim);

    res.json({
      data,
      pagination: { hasMore, nextCursor: hasMore ? data[data.length - 1].id : null }
    });
  }));

  app.post('/api/v1/posts', requireAuth, asyncHandler(async (req, res) => {
    const { title, content, status = 'draft' } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(422).json({ error: 'title and content are required' });
    }
    const [result] = await db.execute(
      'INSERT INTO posts (title, content, status, author_id) VALUES (?, ?, ?, ?)',
      [title, content, status, req.user.sub]
    );
    const [[post]] = await db.execute('SELECT * FROM posts WHERE id = ?', [result.insertId]);
    res.status(201).set('Location', '/api/v1/posts/' + result.insertId).json(post);
  }));

  app.patch('/api/v1/posts/:id', requireAuth, asyncHandler(async (req, res) => {
    const [[post]] = await db.execute('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const { title, content, status } = req.body;
    await db.execute(
      'UPDATE posts SET title = COALESCE(?, title), content = COALESCE(?, content), status = COALESCE(?, status) WHERE id = ?',
      [title || null, content || null, status || null, req.params.id]
    );
    const [[updated]] = await db.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json(updated);
  }));

  app.delete('/api/v1/posts/:id', requireAuth, asyncHandler(async (req, res) => {
    const [[post]] = await db.execute('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
    await db.execute('UPDATE posts SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.status(204).end();
  }));

  // ─── Error Handler ────────────────────────
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message, code: err.code });
  });
  `;

  console.log('Blog API skeleton (key patterns):');
  console.log('  ✓ asyncHandler wraps all async routes');
  console.log('  ✓ requireAuth middleware validates JWT');
  console.log('  ✓ Cursor-based pagination on GET /posts');
  console.log('  ✓ Parameterized queries (no SQL injection)');
  console.log('  ✓ Soft delete on DELETE /posts/:id');
  console.log('  ✓ 403 for authorization, 401 for authentication');
  console.log('  ✓ 201 + Location header on POST /posts');
  console.log('  Lines of skeleton code:', expressApp.trim().split('\n').length);
}

exercise1_blogApiSkeleton();


// ─────────────────────────────────────────────
// Exercise 2: SQL — Top 5 Users by Total Order Value This Month
// ─────────────────────────────────────────────

function exercise2_topUsersByOrderValue() {
  console.log('\n=== Exercise 2: SQL Top Users This Month ===\n');

  const query = `
  -- Top 5 users by total order value in the current month
  SELECT
      u.id,
      u.name,
      u.email,
      COUNT(o.id)              AS order_count,
      SUM(o.total)             AS total_spent,
      AVG(o.total)             AS avg_order_value,
      MAX(o.total)             AS largest_order,
      RANK() OVER (ORDER BY SUM(o.total) DESC) AS rank_by_spend
  FROM users u
  INNER JOIN orders o ON o.user_id = u.id
  WHERE
      o.status = 'completed'
      AND o.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')  -- first day of current month
      AND o.created_at <  DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')  -- first day of next month
      AND u.deleted_at IS NULL
  GROUP BY u.id, u.name, u.email
  ORDER BY total_spent DESC
  LIMIT 5;

  -- Notes:
  -- 1. RANK() adds the overall ranking among all users (not just top 5)
  -- 2. DATE_FORMAT range is SARGable (can use index on created_at)
  --    DON'T use: MONTH(o.created_at) = MONTH(NOW()) — not SARGable (full scan)
  -- 3. INNER JOIN ensures we only get users who actually ordered
  -- 4. Recommended index: (user_id, status, created_at) or (status, created_at, user_id)
  `;

  console.log('SQL query for top 5 users this month:');
  console.log(query.trim());
  console.log('\nKey performance tip: Use range comparison on created_at (SARGable),');
  console.log('NOT MONTH() function (which prevents index usage).');
}

exercise2_topUsersByOrderValue();


// ─────────────────────────────────────────────
// Exercise 3: MongoDB Aggregation — Product Analytics
// ─────────────────────────────────────────────

function exercise3_productAnalytics() {
  console.log('\n=== Exercise 3: MongoDB Product Analytics ===\n');

  const pipeline = `
  // Product analytics: total sold, avg rating, grouped by category
  db.orders.aggregate([
    // Stage 1: Only completed orders
    { $match: { status: 'completed' } },

    // Stage 2: Flatten order items (one doc per item)
    { $unwind: '$items' },

    // Stage 3: Join with products to get category and current metadata
    { $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product'
    }},
    { $unwind: '$product' },

    // Stage 4: Group by category to get category-level stats
    { $group: {
        _id: '$product.category',
        totalRevenue:    { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        totalUnitsSold:  { $sum: '$items.qty' },
        uniqueProducts:  { $addToSet: '$items.productId' },
        avgItemPrice:    { $avg: '$items.price' }
    }},

    // Stage 5: Join with reviews for avg rating per category
    { $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'category',
        as: 'categoryReviews'
    }},

    // Stage 6: Add computed fields
    { $addFields: {
        productCount:  { $size: '$uniqueProducts' },
        avgRating:     { $avg: '$categoryReviews.rating' },
        reviewCount:   { $size: '$categoryReviews' }
    }},

    // Stage 7: Clean up intermediate arrays
    { $project: {
        category: '$_id',
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalUnitsSold: 1,
        productCount: 1,
        avgItemPrice: { $round: ['$avgItemPrice', 2] },
        avgRating: { $round: ['$avgRating', 1] },
        reviewCount: 1,
        _id: 0
    }},

    // Stage 8: Sort by revenue descending
    { $sort: { totalRevenue: -1 } }
  ])
  `;

  console.log('MongoDB product analytics pipeline:');
  console.log(pipeline.trim());
}

exercise3_productAnalytics();


// ─────────────────────────────────────────────
// Exercise 4: Debug Node.js Memory Leak — Event Listener Accumulation
// ─────────────────────────────────────────────

function exercise4_memoryLeakDebug() {
  console.log('\n=== Exercise 4: Memory Leak — Event Listener Accumulation ===\n');

  const { EventEmitter } = require('events');

  console.log('--- SCENARIO: Memory leak from accumulated event listeners ---\n');

  // Leaky code pattern (common in Express middleware or WebSocket handlers)
  function leakyPattern() {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(100); // suppress warning for demo

    // This is called for every incoming request
    function handleRequest() {
      // BAD: adding listener inside a function called repeatedly
      // Each call adds a new listener but never removes it
      process.on('SIGTERM', () => {
        console.log('Handling SIGTERM for request...');
      });
      // After 1000 requests: 1000 SIGTERM listeners attached!
    }

    // Simulate 5 requests
    for (let i = 0; i < 5; i++) handleRequest();
    console.log('SIGTERM listener count:', process.listenerCount('SIGTERM'));
    // Grows unboundedly → memory leak + "MaxListenersExceededWarning"
  }

  console.log('Leaky pattern:');
  leakyPattern();

  // Fixed patterns:
  console.log('\nFix 1: Add listener ONCE at startup, not per request');
  console.log(`
  // At app startup (once):
  process.on('SIGTERM', gracefulShutdown);

  // In request handler:
  function handleRequest() {
    // Don't add process-level listeners here
  }
  `);

  console.log('Fix 2: Use .once() for one-time listeners');
  console.log(`
  emitter.once('event', handler); // auto-removed after first fire
  `);

  console.log('Fix 3: Always remove listeners when done');
  console.log(`
  function handleRequest() {
    const handler = () => console.log('cleanup');
    req.on('close', handler);
    // Remove when done:
    req.on('end', () => req.removeListener('close', handler));
  }
  `);

  console.log('Fix 4: Use AbortController for cancellation (modern pattern)');
  console.log(`
  const controller = new AbortController();
  const { signal } = controller;

  someStream.on('data', handler, { signal }); // auto-removed when signal aborted
  // On cleanup:
  controller.abort(); // removes all listeners registered with this signal
  `);

  // How to detect memory leaks:
  console.log('\nDetection tools:');
  console.log('  1. --inspect flag + Chrome DevTools Memory Profiler (take heap snapshots)');
  console.log('  2. process.memoryUsage().heapUsed — track over time');
  console.log('  3. clinic.js heapprofiler — generate flame graphs');
  console.log('  4. emitter.listenerCount(event) — check for accumulation');
  console.log('  5. node --trace-warnings to see MaxListenersExceededWarning');
}

exercise4_memoryLeakDebug();


// ─────────────────────────────────────────────
// Exercise 5: Sliding Window Rate Limiter
// ─────────────────────────────────────────────

function exercise5_slidingWindowRateLimiter() {
  console.log('\n=== Exercise 5: Sliding Window Rate Limiter ===\n');

  /**
   * Sliding window rate limiter using Redis sorted sets (simulated here with a Map).
   *
   * Redis implementation:
   *   ZADD key <now_ms> <uuid>          — add current request
   *   ZREMRANGEBYSCORE key 0 <now-window> — remove old requests
   *   ZCARD key                          — count requests in window
   *   EXPIRE key <window_seconds>        — auto-cleanup
   *
   * All 4 commands run as a Lua script for atomicity.
   */

  // In-memory simulation (production: replace with Redis sorted sets)
  const requestLog = new Map(); // key → SortedSet of timestamps

  function slidingWindowCheck(key, { windowMs = 60000, limit = 10 } = {}) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create the sorted set for this key
    if (!requestLog.has(key)) requestLog.set(key, []);
    const requests = requestLog.get(key);

    // Remove old entries outside the window (ZREMRANGEBYSCORE equivalent)
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }

    const count = requests.length;

    if (count >= limit) {
      const oldestInWindow = requests[0];
      const resetAfterMs = (oldestInWindow + windowMs) - now;
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAfterMs,
        resetAt: new Date(now + resetAfterMs).toISOString()
      };
    }

    // Add current request
    requests.push(now);

    return {
      allowed: true,
      remaining: limit - requests.length,
      limit,
      resetAfterMs: windowMs,
      resetAt: new Date(now + windowMs).toISOString()
    };
  }

  // Test scenario: 5 requests/10 seconds limit
  console.log('Testing: 5 req/10s limit for "user:123"\n');

  for (let i = 1; i <= 7; i++) {
    const result = slidingWindowCheck('user:123', { windowMs: 10000, limit: 5 });
    console.log(`Request ${i}: ${result.allowed ? `ALLOWED (${result.remaining} remaining)` : `BLOCKED (retry in ${result.resetAfterMs}ms)`}`);
  }

  // Show that after window expiry, rate limit resets
  console.log('\n[Simulate time passing — 10 seconds...]');
  const future = Date.now() + 10001;
  // Manually age out the timestamps
  requestLog.get('user:123').forEach((_, i) => {
    requestLog.get('user:123')[i] = requestLog.get('user:123')[i] - 10001;
  });
  const afterWindow = slidingWindowCheck('user:123', { windowMs: 10000, limit: 5 });
  console.log(`After window: ${afterWindow.allowed ? `ALLOWED (${afterWindow.remaining} remaining)` : 'BLOCKED'}`);

  console.log('\nProduction Redis Lua script (atomic):');
  console.log(`
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local uuid = ARGV[4]

  -- Remove old entries
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  -- Count current
  local count = redis.call('ZCARD', key)

  if count >= limit then
    return 0  -- denied
  end

  -- Add current request
  redis.call('ZADD', key, now, uuid)
  redis.call('EXPIRE', key, math.ceil(window/1000) + 1)
  return 1  -- allowed
  `);
}

exercise5_slidingWindowRateLimiter();
