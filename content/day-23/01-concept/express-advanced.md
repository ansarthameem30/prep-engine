# Express.js Advanced Patterns

## Middleware Execution Order

Express middleware runs in the order it is defined. The execution chain is:

```
Global middleware (app.use)
  → Router-level middleware
    → Route-specific middleware
      → Route handler
        → Error middleware (4-param)
```

Each middleware either terminates the request (`res.send()`, `res.json()`) or passes control forward via `next()`. Calling `next(err)` skips remaining middleware and jumps directly to the error handler. If you call `next()` after sending a response, Express throws "Cannot set headers after they are sent" — always guard with an early return.

```javascript
// Execution order demonstration
app.use(logger);            // 1. runs for ALL routes
app.use('/api', authCheck); // 2. runs for /api/* routes only

app.get('/api/users',
  validateQuery,            // 3. route-specific middleware
  cacheMiddleware,          // 4. route-specific middleware
  async (req, res) => {     // 5. route handler
    res.json(users);
  }
);

app.use(errorHandler);      // 6. error middleware — MUST be last
```

---

## Error Handling Middleware

Express identifies error handling middleware by the **arity of the function** — it must have exactly 4 parameters: `(err, req, res, next)`. If it has 3 parameters, Express treats it as regular middleware and never calls it with errors.

```javascript
// Error middleware — MUST have 4 params, even if next is unused
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the full error for debugging
  if (status >= 500) {
    console.error('[Error]', err.stack);
  }

  res.status(status).json({
    error: {
      message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

app.use(errorHandler); // Register AFTER all routes
```

---

## Async Error Handling: The asyncHandler Pattern

Express 4 does not catch errors thrown from async route handlers automatically. If an async function throws, the error is an unhandled promise rejection — the error middleware never sees it.

```javascript
// BAD: async error disappears into the void
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id); // throws if DB is down
  res.json(user); // never reached, but error handler isn't called either
});

// GOOD: wrap with asyncHandler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next); // forward errors to Express
};

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
}));
```

The `express-async-errors` package monkey-patches Express's `Layer.prototype.handle_request` to do this automatically for all async route handlers — zero boilerplate, but less explicit about what's happening.

In Express 5 (currently RC), async error handling is built-in — no wrapper needed.

---

## Rate Limiting with Redis for Distributed Systems

A single in-memory rate limiter breaks in a multi-process deployment (PM2 clusters, Kubernetes pods). Each instance has its own counter. Redis provides a shared counter:

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('ioredis');

const client = new redis(process.env.REDIS_URL);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,     // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => client.call(...args),
    prefix: 'rl:api:',
  }),
  keyGenerator: (req) => req.user?.id || req.ip, // per-user if authed, per-IP if not
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

app.use('/api/', apiLimiter);
```

For more sophisticated rate limiting (sliding window, token bucket), implement with Redis Lua scripts or use `upstash-ratelimit`.

---

## Compression and Conditional Requests

```javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    // Don't compress responses for streaming (SSE, chunked uploads)
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res); // default filter
  },
  threshold: 1024, // Don't compress responses smaller than 1KB
  level: 6          // zlib compression level (1=fast/low, 9=slow/high, 6=default)
}));
```

**ETag and Conditional Requests**: Express sets `ETag` headers automatically for `res.json()` and `res.send()`. If the client sends `If-None-Match: <etag>`, Express compares it and returns 304 (Not Modified) if unchanged — the body is omitted, saving bandwidth. To disable: `app.set('etag', false)`.

---

## Helmet Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet()); // enables all defaults

// What each header does:
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "cdn.example.com"],
    // Prevents XSS by whitelisting JS sources
  }
}));

// X-Frame-Options: DENY — prevents clickjacking (loading in iframes)
// X-Content-Type-Options: nosniff — prevents MIME sniffing
// Strict-Transport-Security — forces HTTPS for configured duration
// X-XSS-Protection: 0 — helmet actually DISABLES this because
//   the old browser XSS filter can introduce vulnerabilities; CSP is the replacement
// Referrer-Policy: no-referrer — prevents leaking URL to third parties
// Cross-Origin-Opener-Policy — isolates browsing context for spectre/meltdown
```

---

## Request Validation: Zod Middleware Pattern

```javascript
const { z } = require('zod');

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    age: z.number().int().min(18).optional(),
  }),
  query: z.object({
    sendWelcome: z.enum(['true', 'false']).optional(),
  }),
});

// Generic validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      });
    }

    // Replace req.body/query/params with validated+coerced data
    Object.assign(req, result.data);
    next();
  };
}

app.post('/users', validate(createUserSchema), asyncHandler(createUser));
```

---

## Custom Middleware Patterns

**Request Logger:**
```javascript
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    console[level](`${method} ${url} ${statusCode} ${duration}ms`);
  });

  next();
}
```

**Correlation ID Middleware** (critical for distributed tracing):
```javascript
const { v4: uuidv4 } = require('uuid');

function correlationId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  req.correlationId = id;
  res.set('X-Request-Id', id);
  // Attach to async context so all downstream logs include this ID
  // AsyncLocalStorage is the right tool here for production
  next();
}
```

---

## Express.Router() for Modular Routes

```javascript
// routes/users.js
const router = require('express').Router();

router.use(authMiddleware);           // applies to all routes in this router
router.get('/', listUsers);
router.post('/', validate(schema), createUser);
router.route('/:id')
  .get(getUser)
  .patch(validate(updateSchema), updateUser)
  .delete(deleteUser);

module.exports = router;

// app.js
app.use('/api/v1/users', require('./routes/users'));
```

---

## Response Caching

```javascript
// Cache-Control directives:
res.set('Cache-Control', 'public, max-age=3600');        // CDN + browser, 1 hour
res.set('Cache-Control', 'private, max-age=300');        // browser only, 5 min
res.set('Cache-Control', 'no-cache');                    // must revalidate with server
res.set('Cache-Control', 'no-store');                    // never cache (auth endpoints)
res.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30'); // CDN-specific

// Vary header: tells CDN to cache separate copies per Accept-Encoding
res.set('Vary', 'Accept-Encoding, Accept-Language');
```

For API responses, `no-store` on all authenticated endpoints prevents browsers from caching sensitive data. Public data (product catalogs, blog posts) should use aggressive caching with cache busting via versioned URLs.
