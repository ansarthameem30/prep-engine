/**
 * Day 51 — Microservices Architecture: Hands-On Exercises
 * Topics: Circuit breaker, correlation IDs, API gateway routing,
 *         health checks, retry with exponential backoff
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Circuit Breaker (from scratch — 3 states)
// ─────────────────────────────────────────────────────────────
class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 10000; // ms before trying half-open

    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.stats = { calls: 0, failures: 0, fallbacks: 0 };
  }

  async call(...args) {
    this.stats.calls++;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('[CircuitBreaker] State → HALF_OPEN — sending test request');
      } else {
        this.stats.fallbacks++;
        throw new Error('CircuitBreaker: OPEN — failing fast, not calling downstream');
      }
    }

    try {
      const result = await this.fn(...args);
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('[CircuitBreaker] State → CLOSED — service recovered');
      }
    }
  }

  _onFailure() {
    this.stats.failures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log('[CircuitBreaker] State → OPEN — half-open test failed');
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`[CircuitBreaker] State → OPEN after ${this.failureCount} failures`);
    }
  }

  getState() {
    return { state: this.state, ...this.stats };
  }
}

// Demo — simulate an unstable downstream service
async function demoCircuitBreaker() {
  let callCount = 0;

  const unstableService = async () => {
    callCount++;
    if (callCount <= 6) throw new Error('Service unavailable');
    return { data: 'success' };
  };

  const breaker = new CircuitBreaker(unstableService, {
    failureThreshold: 3,
    timeout: 100,
    successThreshold: 1,
  });

  for (let i = 0; i < 10; i++) {
    try {
      const result = await breaker.call();
      console.log(`Call ${i + 1}: Success —`, result);
    } catch (err) {
      console.log(`Call ${i + 1}: Fail — ${err.message}`);
    }
    if (i === 7) await new Promise(r => setTimeout(r, 150)); // wait for timeout
  }

  console.log('Final stats:', breaker.getState());
}

// ─────────────────────────────────────────────────────────────
// Exercise 2: Service-to-Service Call with Correlation ID
// ─────────────────────────────────────────────────────────────
const { v4: uuidv4 } = { v4: () => Math.random().toString(36).slice(2, 18) }; // simplified

/**
 * Middleware: generates a trace/correlation ID and attaches it to the request.
 * All downstream calls propagate this ID via headers.
 */
function correlationIdMiddleware(req, res, next) {
  // Respect incoming trace ID (from upstream service) or create new one
  req.correlationId = req.headers['x-correlation-id'] || `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('x-correlation-id', req.correlationId);

  // Attach a child logger that always includes the correlation ID
  req.log = {
    info: (msg, data = {}) => console.log(JSON.stringify({ level: 'info', correlationId: req.correlationId, msg, ...data })),
    error: (msg, data = {}) => console.error(JSON.stringify({ level: 'error', correlationId: req.correlationId, msg, ...data })),
  };

  next?.();
}

/**
 * Service-to-service HTTP call that propagates correlation ID.
 * In production use node-fetch or axios.
 */
async function callDownstreamService(url, correlationId, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    'x-service-name': 'order-service',
    ...options.headers,
  };

  // Simulated call — in real code: return fetch(url, { ...options, headers })
  console.log(`[HTTP] Calling ${url} with correlation ID: ${correlationId}`);
  return { status: 200, body: { userId: 123, name: 'Alice' } };
}

// ─────────────────────────────────────────────────────────────
// Exercise 3: API Gateway Route Handler
// ─────────────────────────────────────────────────────────────

/**
 * Simulates an API Gateway that routes requests to upstream services.
 * In production this would use http-proxy-middleware or a dedicated gateway.
 */
class ApiGateway {
  constructor() {
    this.routes = [];
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
  }

  route(prefix, serviceUrl, options = {}) {
    this.routes.push({ prefix, serviceUrl, options });
  }

  async handle(req) {
    // Run middleware chain
    for (const mw of this.middleware) {
      let nextCalled = false;
      mw(req, {}, () => { nextCalled = true; });
      if (!nextCalled) return { status: 401, body: 'Unauthorized' };
    }

    // Find matching route
    const match = this.routes.find(r => req.path.startsWith(r.prefix));
    if (!match) return { status: 404, body: 'No route found' };

    const upstreamPath = req.path.replace(match.prefix, '');
    const upstreamUrl = `${match.serviceUrl}${upstreamPath}`;

    console.log(`[Gateway] ${req.method} ${req.path} → ${upstreamUrl}`);
    return callDownstreamService(upstreamUrl, req.correlationId);
  }
}

// Setup
const gateway = new ApiGateway();

// Auth middleware at gateway level
gateway.use((req, res, next) => {
  if (!req.headers?.authorization && req.path !== '/health') {
    console.log('[Gateway] Rejected — no auth header');
    return; // don't call next
  }
  next();
});

gateway.route('/users', 'http://user-service:3001');
gateway.route('/orders', 'http://order-service:3002');
gateway.route('/payments', 'http://payment-service:3003');

// Demo
async function demoGateway() {
  const req = {
    method: 'GET',
    path: '/users/123',
    headers: { authorization: 'Bearer token123', 'x-correlation-id': 'trace-abc' },
    correlationId: 'trace-abc',
  };
  const result = await gateway.handle(req);
  console.log('[Gateway] Response:', result);
}

// ─────────────────────────────────────────────────────────────
// Exercise 4: Health Check Endpoint Pattern
// ─────────────────────────────────────────────────────────────

/**
 * Health check aggregator — checks all dependencies and returns overall status.
 * Pattern: return 200 if healthy, 503 if degraded/unhealthy.
 * Used by load balancers, Kubernetes liveness/readiness probes.
 */
class HealthChecker {
  constructor() {
    this.checks = new Map();
  }

  register(name, checkFn, options = {}) {
    this.checks.set(name, { checkFn, timeout: options.timeout || 5000, critical: options.critical ?? true });
  }

  async runAll() {
    const results = {};
    let overall = 'healthy';

    const promises = [...this.checks.entries()].map(async ([name, { checkFn, timeout, critical }]) => {
      const start = Date.now();
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeout)
        );
        await Promise.race([checkFn(), timeoutPromise]);
        results[name] = { status: 'healthy', latency: `${Date.now() - start}ms` };
      } catch (err) {
        results[name] = { status: 'unhealthy', error: err.message, latency: `${Date.now() - start}ms` };
        if (critical) overall = 'unhealthy';
        else if (overall === 'healthy') overall = 'degraded';
      }
    });

    await Promise.allSettled(promises);
    return { status: overall, timestamp: new Date().toISOString(), checks: results };
  }
}

// Setup health checker
const health = new HealthChecker();

health.register('database', async () => {
  // Simulate DB ping
  await new Promise(r => setTimeout(r, 5));
  // if db.ping() fails, throw
}, { critical: true });

health.register('redis', async () => {
  await new Promise(r => setTimeout(r, 2));
}, { critical: true });

health.register('downstream-user-service', async () => {
  // HTTP GET http://user-service/health
  await new Promise(r => setTimeout(r, 10));
}, { critical: false }); // non-critical: degraded, not unhealthy

// Express handler
async function healthEndpoint(req, res) {
  const result = await health.runAll();
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
  res?.json(result) || console.log('[Health]', JSON.stringify(result, null, 2));
  return { statusCode, result };
}

// ─────────────────────────────────────────────────────────────
// Exercise 5: Retry with Exponential Backoff
// ─────────────────────────────────────────────────────────────

/**
 * Retry a function with exponential backoff + jitter.
 * Jitter prevents the "thundering herd" problem where all retries fire simultaneously.
 *
 * Backoff formula: min(base * 2^attempt, maxDelay) + random jitter
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 100,   // ms
    maxDelay = 10000,  // ms
    jitter = true,
    retryableErrors = [503, 429, 'ECONNRESET', 'ETIMEDOUT'],
    onRetry = null,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = retryableErrors.some(e =>
        typeof e === 'number' ? err.status === e : err.code === e || err.message.includes(e)
      );

      if (isLastAttempt || !isRetryable) throw err;

      const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const delay = jitter ? exponential * (0.5 + Math.random() * 0.5) : exponential;

      onRetry?.({ attempt: attempt + 1, delay, error: err.message });
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed: "${err.message}". Retrying in ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Demo
async function demoRetry() {
  let callCount = 0;

  const flakyRequest = async () => {
    callCount++;
    if (callCount < 3) {
      const err = new Error('Service Unavailable');
      err.status = 503;
      throw err;
    }
    return { data: 'finally succeeded', attempts: callCount };
  };

  try {
    const result = await retryWithBackoff(flakyRequest, {
      maxRetries: 4,
      baseDelay: 50,
      jitter: false, // deterministic for demo
    });
    console.log('[Retry] Success:', result);
  } catch (err) {
    console.error('[Retry] All retries exhausted:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Run All Demos
// ─────────────────────────────────────────────────────────────
async function runAll() {
  console.log('\n=== Exercise 1: Circuit Breaker ===');
  await demoCircuitBreaker();

  console.log('\n=== Exercise 2: Correlation ID ===');
  const mockReq = { headers: {}, path: '/users/1', correlationId: null };
  correlationIdMiddleware(mockReq, {}, () => {});
  await callDownstreamService('http://user-service/users/1', mockReq.correlationId);
  mockReq.log.info('Request processed', { userId: 1 });

  console.log('\n=== Exercise 3: API Gateway ===');
  await demoGateway();

  console.log('\n=== Exercise 4: Health Check ===');
  await healthEndpoint(null, null);

  console.log('\n=== Exercise 5: Retry with Backoff ===');
  await demoRetry();
}

runAll().catch(console.error);
