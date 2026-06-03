/**
 * Day 23 — Express.js Advanced Patterns
 * Hands-on Exercises
 */

// ─────────────────────────────────────────────
// Exercise 1: asyncHandler wrapper
// ─────────────────────────────────────────────

/**
 * Problem: Express 4 silently swallows errors thrown from async route handlers.
 * Solution: wrap handlers to catch rejections and forward to error middleware.
 */

// The wrapper — 4 lines of pure utility
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Simulate an Express-like chain to demonstrate the pattern without needing a running server
function simulateExpressChain() {
  console.log('=== Exercise 1: asyncHandler ===');

  // Mock Express objects
  const mockReq = { params: { id: '42' } };
  const mockRes = {
    json: (data) => console.log('Response:', JSON.stringify(data)),
    status(code) { console.log('Status:', code); return this; }
  };
  const mockNext = (err) => {
    if (err) console.log('Error forwarded to error middleware:', err.message);
  };

  // Without asyncHandler — error is unhandled
  const unprotectedHandler = async (req, res, next) => {
    throw new Error('DB connection failed'); // silent failure in Express 4
  };

  // With asyncHandler — error is caught and forwarded
  const protectedHandler = asyncHandler(async (req, res, next) => {
    throw new Error('DB connection failed');
  });

  // Demonstrates that protectedHandler calls next(err)
  protectedHandler(mockReq, mockRes, mockNext);
  // Expected: "Error forwarded to error middleware: DB connection failed"

  // Happy path
  const successHandler = asyncHandler(async (req, res) => {
    const user = await Promise.resolve({ id: req.params.id, name: 'Alice' });
    res.json(user);
  });
  successHandler(mockReq, mockRes, mockNext);
  // Expected: Response: {"id":"42","name":"Alice"}
}

simulateExpressChain();


// ─────────────────────────────────────────────
// Exercise 2: Request Logger middleware
// ─────────────────────────────────────────────

function exercise2_requestLogger() {
  console.log('\n=== Exercise 2: Request Logger Middleware ===');

  // Production-grade request logger middleware
  function requestLogger(req, res, next) {
    const start = process.hrtime.bigint(); // nanosecond precision
    const requestId = req.headers['x-request-id'] || generateId();

    req.requestId = requestId;

    // Log when response FINISHES (so we have status + duration)
    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1e6;

      const logEntry = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: durationMs.toFixed(2),
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      };

      const level = res.statusCode >= 500 ? 'ERROR'
                  : res.statusCode >= 400 ? 'WARN'
                  : 'INFO';

      console.log(`[${level}]`, JSON.stringify(logEntry));
    });

    next();
  }

  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Simulate middleware invocation
  const req = { method: 'GET', originalUrl: '/api/users?page=1', headers: {} };
  const res = {
    statusCode: 200,
    _listeners: {},
    on(event, fn) { this._listeners[event] = fn; },
    finish() { this._listeners.finish?.(); }
  };

  requestLogger(req, res, () => {
    // Simulate some processing time
    setTimeout(() => {
      res.statusCode = 200;
      res.finish();
    }, 15);
  });
}

exercise2_requestLogger();


// ─────────────────────────────────────────────
// Exercise 3: Sliding Window Rate Limiter (no library)
// ─────────────────────────────────────────────

/**
 * Sliding window rate limiter using an in-memory Map.
 * Each key maps to an array of request timestamps.
 * A request is allowed if fewer than `max` timestamps exist within the window.
 *
 * Note: For production, use Redis with a sorted set (ZADD + ZREMRANGEBYSCORE + ZCARD).
 * This in-memory version only works for single-process deployments.
 */
function exercise3_slidingWindowRateLimiter() {
  console.log('\n=== Exercise 3: Sliding Window Rate Limiter ===');

  function createRateLimiter({ windowMs = 60000, max = 10 } = {}) {
    const requests = new Map(); // key → [timestamp, timestamp, ...]

    // Cleanup old entries every minute to prevent memory leak
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of requests.entries()) {
        const valid = timestamps.filter(t => now - t < windowMs);
        if (valid.length === 0) requests.delete(key);
        else requests.set(key, valid);
      }
    }, windowMs).unref(); // .unref() so this timer doesn't keep process alive

    return function rateLimiter(req, res, next) {
      const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();

      const timestamps = requests.get(key) || [];
      // Remove timestamps outside the window
      const windowStart = now - windowMs;
      const validTimestamps = timestamps.filter(t => t > windowStart);

      if (validTimestamps.length >= max) {
        const oldestInWindow = Math.min(...validTimestamps);
        const resetMs = windowMs - (now - oldestInWindow);

        res.status = 429;
        res.headers = {
          'Retry-After': Math.ceil(resetMs / 1000),
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': new Date(now + resetMs).toISOString()
        };
        return next(new Error('Too Many Requests'));
      }

      validTimestamps.push(now);
      requests.set(key, validTimestamps);

      res.headers = {
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': max - validTimestamps.length,
      };

      next();
    };
  }

  // Test the rate limiter
  const limiter = createRateLimiter({ windowMs: 1000, max: 3 }); // 3 req/second
  const mockReq = { ip: '127.0.0.1', headers: {} };
  const mockRes = { headers: {}, status: 200 };

  for (let i = 1; i <= 5; i++) {
    const errors = [];
    const next = (err) => { if (err) errors.push(err.message); };
    limiter(mockReq, mockRes, next);
    console.log(`Request ${i}: ${errors.length ? `BLOCKED (${errors[0]})` : `ALLOWED (remaining: ${mockRes.headers['X-RateLimit-Remaining']})`}`);
  }
  // Expected: 1 ALLOWED (2), 2 ALLOWED (1), 3 ALLOWED (0), 4 BLOCKED, 5 BLOCKED
}

exercise3_slidingWindowRateLimiter();


// ─────────────────────────────────────────────
// Exercise 4: Correlation ID Middleware with AsyncLocalStorage
// ─────────────────────────────────────────────

function exercise4_correlationId() {
  console.log('\n=== Exercise 4: Correlation ID Middleware ===');

  const { AsyncLocalStorage } = require('async_hooks');
  const { randomUUID } = require('crypto');

  // AsyncLocalStorage provides request-scoped context without passing it around
  // — the Node.js equivalent of thread-local storage
  const requestContext = new AsyncLocalStorage();

  // Middleware: establish the context for this request's async chain
  function correlationIdMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    const store = { requestId, startTime: Date.now() };

    res.setHeader = (key, value) => {
      if (key === 'X-Request-Id') console.log(`  [header set] ${key}: ${value}`);
    };
    res.setHeader('X-Request-Id', requestId);

    // Run the rest of the middleware chain within this storage context
    requestContext.run(store, () => {
      next();
    });
  }

  // Logger that automatically picks up the request ID — no prop drilling
  function logger(message) {
    const store = requestContext.getStore();
    const prefix = store ? `[${store.requestId.slice(0, 8)}]` : '[no-context]';
    console.log(`  ${prefix} ${message}`);
  }

  // Simulate async request processing
  function simulateRequest(requestId) {
    const req = { headers: { 'x-request-id': requestId } };
    const res = {};

    correlationIdMiddleware(req, res, async () => {
      logger('Handler started');

      // Even inside async operations, context is preserved
      await new Promise(resolve => setTimeout(resolve, 10));
      logger('After async DB call');

      await new Promise(resolve => setTimeout(resolve, 5));
      logger('After async cache call');
    });
  }

  // Two concurrent requests — their logs don't get mixed up
  simulateRequest('req-aaa-111');
  simulateRequest('req-bbb-222');
}

exercise4_correlationId();


// ─────────────────────────────────────────────
// Exercise 5: Zod Validation Middleware
// ─────────────────────────────────────────────

function exercise5_zodValidation() {
  console.log('\n=== Exercise 5: Zod Validation Middleware ===');

  // Mock Zod (since we can't npm install here, we replicate the schema pattern)
  // In real code: const { z } = require('zod');
  const mockZod = {
    object: (shape) => ({
      safeParse: (data) => {
        const errors = [];
        for (const [key, validator] of Object.entries(shape)) {
          const val = data[key];
          if (validator.required && (val === undefined || val === null || val === '')) {
            errors.push({ path: [key], message: `${key} is required` });
          }
          if (val !== undefined && validator.type === 'email' && !val.includes('@')) {
            errors.push({ path: [key], message: `${key} must be a valid email` });
          }
          if (val !== undefined && validator.min && val.length < validator.min) {
            errors.push({ path: [key], message: `${key} must be at least ${validator.min} chars` });
          }
        }
        if (errors.length > 0) return { success: false, error: { issues: errors } };
        return { success: true, data };
      }
    })
  };

  const createUserSchema = mockZod.object({
    email: { required: true, type: 'email' },
    name: { required: true, min: 2 }
  });

  function validate(schema) {
    return (req, res, next) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return next({
          status: 422,
          message: 'Validation failed',
          details: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message
          }))
        });
      }
      req.validatedBody = result.data;
      next();
    };
  }

  function testValidation(body) {
    const req = { body };
    const res = {};
    let error = null;
    validate(createUserSchema)(req, res, (err) => { error = err || null; });

    if (error) {
      console.log(`INVALID: ${JSON.stringify(body)} → ${JSON.stringify(error.details)}`);
    } else {
      console.log(`VALID: ${JSON.stringify(body)}`);
    }
  }

  testValidation({ email: 'alice@example.com', name: 'Alice' }); // VALID
  testValidation({ email: 'not-an-email', name: 'Alice' });       // INVALID: email
  testValidation({ email: 'bob@example.com', name: 'B' });        // INVALID: name too short
  testValidation({});                                             // INVALID: both required
}

exercise5_zodValidation();
