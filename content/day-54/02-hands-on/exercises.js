/**
 * Day 54 — Full-Stack Integration Patterns: Hands-On Exercises
 * Topics: tRPC patterns, Zod schemas, feature flags, WebSocket rooms, structured logging
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: tRPC-style Router with Type Inference
// ─────────────────────────────────────────────────────────────
/**
 * Simulate the tRPC pattern: router definition with input validation,
 * query/mutation procedures, and client-side type inference.
 * (Without the actual tRPC library — shows the pattern concept)
 */

class Procedure {
  constructor(type) {
    this.type = type; // 'query' | 'mutation'
    this._input = null;
    this._handler = null;
  }

  input(schema) {
    this._input = schema;
    return this;
  }

  query(handler) {
    this._handler = handler;
    this.type = 'query';
    return this;
  }

  mutation(handler) {
    this._handler = handler;
    this.type = 'mutation';
    return this;
  }

  async execute(input, ctx) {
    if (this._input) {
      const result = this._input.safeParse(input);
      if (!result.success) throw new Error(`Validation: ${JSON.stringify(result.errors)}`);
      input = result.data;
    }
    return this._handler({ input, ctx });
  }
}

// Simplified Zod-like schema
const z = {
  object: (shape) => ({
    safeParse: (data) => {
      const errors = [];
      const result = {};
      for (const [key, validator] of Object.entries(shape)) {
        const val = data?.[key];
        const check = validator._check(val);
        if (!check.ok) errors.push(`${key}: ${check.error}`);
        else result[key] = check.value;
      }
      return errors.length ? { success: false, errors } : { success: true, data: result };
    },
  }),
  string: () => ({
    _check: (v) => typeof v === 'string' ? { ok: true, value: v } : { ok: false, error: 'must be string' },
    min: function(n) { return { ...this, _check: (v) => typeof v === 'string' && v.length >= n ? { ok: true, value: v } : { ok: false, error: `min ${n} chars` } }; },
    email: function() { return { ...this, _check: (v) => typeof v === 'string' && v.includes('@') ? { ok: true, value: v } : { ok: false, error: 'must be email' } }; },
  }),
  number: () => ({
    _check: (v) => typeof v === 'number' ? { ok: true, value: v } : { ok: false, error: 'must be number' },
    int: function() { return { ...this, _check: (v) => Number.isInteger(v) ? { ok: true, value: v } : { ok: false, error: 'must be integer' } }; },
  }),
};

// Mock DB
const users = new Map([
  ['1', { id: '1', name: 'Alice', email: 'alice@example.com' }],
  ['2', { id: '2', name: 'Bob',   email: 'bob@example.com' }],
]);

// Define the router (server-side)
const appRouter = {
  user: {
    getById: new Procedure('query')
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const user = users.get(input.id);
        if (!user) throw new Error('User not found');
        return user;
      }),

    create: new Procedure('mutation')
      .input(z.object({ name: z.string().min(2), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const id = String(users.size + 1);
        const user = { id, ...input };
        users.set(id, user);
        return user;
      }),

    list: new Procedure('query')
      .query(async () => Array.from(users.values())),
  },
};

// Client proxy (simplified tRPC client pattern)
function createClient(router) {
  return new Proxy({}, {
    get: (_, namespace) => new Proxy({}, {
      get: (_, procedure) => ({
        query: (input) => router[namespace][procedure].execute(input, {}),
        mutate: (input) => router[namespace][procedure].execute(input, {}),
      }),
    }),
  });
}

async function demoTRPC() {
  console.log('=== tRPC Pattern Demo ===');
  const client = createClient(appRouter);

  const user = await client.user.getById.query({ id: '1' });
  console.log('Get user:', user);

  const newUser = await client.user.create.mutate({ name: 'Charlie', email: 'charlie@example.com' });
  console.log('Created user:', newUser);

  const allUsers = await client.user.list.query();
  console.log('All users:', allUsers);

  try {
    await client.user.create.mutate({ name: 'X', email: 'not-an-email' });
  } catch (err) {
    console.log('Validation error caught:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Exercise 2: Feature Flag Middleware (Express + React context pattern)
// ─────────────────────────────────────────────────────────────

class FeatureFlagService {
  constructor() {
    // In production: connect to LaunchDarkly, Unleash, or your own flag store
    this.flags = new Map([
      ['new-checkout', { enabled: true,  rollout: 100, allowedUsers: null }],
      ['ai-search',    { enabled: true,  rollout: 25,  allowedUsers: ['user_1', 'user_2'] }],
      ['dark-mode',    { enabled: false, rollout: 0,   allowedUsers: null }],
    ]);
  }

  isEnabled(flagKey, userId = null) {
    const flag = this.flags.get(flagKey);
    if (!flag || !flag.enabled) return false;

    // Explicit user allowlist (for internal testing)
    if (flag.allowedUsers && userId) {
      if (flag.allowedUsers.includes(userId)) return true;
    }

    // Percentage rollout: deterministic based on userId (same user always gets same result)
    if (flag.rollout < 100 && userId) {
      const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return (hash % 100) < flag.rollout;
    }

    return flag.rollout === 100;
  }

  getAll(userId) {
    const result = {};
    for (const [key] of this.flags) {
      result[key] = this.isEnabled(key, userId);
    }
    return result;
  }
}

const featureFlags = new FeatureFlagService();

// Express middleware: check a specific flag, reject if disabled
function requireFeature(flagKey) {
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!featureFlags.isEnabled(flagKey, userId)) {
      console.log(`[FeatureFlag] "${flagKey}" is disabled for user ${userId}`);
      return res?.status(404).json({ error: 'Feature not available' })
        || console.log(`[FeatureFlag] Blocked request to ${flagKey} feature`);
    }
    next?.();
  };
}

// Bootstrap flags endpoint: returns all flags for the current user
// Frontend fetches this once on app load and stores in React context
function getFlagsForUser(userId) {
  return featureFlags.getAll(userId);
}

function demoFeatureFlags() {
  console.log('\n=== Feature Flag Demo ===');

  const users = ['user_1', 'user_2', 'user_3', 'user_4'];
  for (const userId of users) {
    const flags = getFlagsForUser(userId);
    console.log(`${userId}:`, flags);
  }

  // Simulate middleware check
  const mockReq = { user: { id: 'user_3' } };
  let blocked = true;
  requireFeature('new-checkout')(mockReq, null, () => { blocked = false; });
  console.log('new-checkout for user_3 (should pass):', !blocked);

  let aiBlocked = true;
  requireFeature('ai-search')(mockReq, null, () => { aiBlocked = false; });
  console.log('ai-search for user_3 (may be blocked by rollout):', !aiBlocked);
}

// ─────────────────────────────────────────────────────────────
// Exercise 3: WebSocket Room Implementation
// ─────────────────────────────────────────────────────────────
/**
 * Simulates Socket.io room pattern without the actual library.
 * Demonstrates: join room, broadcast to room (not self), leave room.
 */
class MockWebSocketServer {
  constructor() {
    this.sockets = new Map(); // socketId → { socket, rooms }
    this.rooms = new Map();   // roomName → Set<socketId>
  }

  connect(socketId) {
    this.sockets.set(socketId, { id: socketId, rooms: new Set(), messages: [] });
    console.log(`[WS] Socket ${socketId} connected`);
    return {
      on: (event, handler) => {},
      emit: (event, data) => console.log(`[WS] → ${socketId}:`, event, data),
    };
  }

  join(socketId, room) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(socketId);
    this.sockets.get(socketId).rooms.add(room);
    console.log(`[WS] ${socketId} joined room "${room}"`);
  }

  leave(socketId, room) {
    this.rooms.get(room)?.delete(socketId);
    this.sockets.get(socketId)?.rooms.delete(room);
    console.log(`[WS] ${socketId} left room "${room}"`);
  }

  // Broadcast to room excluding the sender
  to(room) {
    return {
      emit: (event, data, excludeSocketId = null) => {
        const members = this.rooms.get(room) || new Set();
        let sent = 0;
        for (const id of members) {
          if (id === excludeSocketId) continue; // don't send to self
          console.log(`[WS] Broadcast to ${id} in room "${room}":`, event, JSON.stringify(data));
          sent++;
        }
        console.log(`[WS] Broadcast sent to ${sent} members in "${room}"`);
      },
    };
  }

  disconnect(socketId) {
    const socket = this.sockets.get(socketId);
    if (socket) {
      for (const room of socket.rooms) {
        this.rooms.get(room)?.delete(socketId);
      }
      this.sockets.delete(socketId);
    }
    console.log(`[WS] ${socketId} disconnected`);
  }
}

function demoWebSocket() {
  console.log('\n=== WebSocket Room Demo ===');
  const io = new MockWebSocketServer();

  // 4 users connect
  ['alice', 'bob', 'charlie', 'diana'].forEach(id => io.connect(id));

  // alice and bob join order room, charlie joins a different room
  io.join('alice', 'order:123');
  io.join('bob', 'order:123');
  io.join('charlie', 'order:456');
  io.join('diana', 'order:123');

  // alice sends a message — should reach bob and diana, NOT alice, NOT charlie
  console.log('\nalice sends message to order:123 room (excludes self):');
  io.to('order:123').emit('order-update', { status: 'shipped', orderId: '123' }, 'alice');

  io.disconnect('bob');
}

// ─────────────────────────────────────────────────────────────
// Exercise 4: Structured Logging with Correlation IDs
// ─────────────────────────────────────────────────────────────

class StructuredLogger {
  constructor(context = {}) {
    this.context = context; // persistent fields added to every log line
  }

  _log(level, msg, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...this.context,
      msg,
      ...data,
    };
    // In production: write to stdout as JSON line (log aggregators parse this)
    console.log(JSON.stringify(entry));
  }

  info(msg, data)  { this._log('info', msg, data); }
  warn(msg, data)  { this._log('warn', msg, data); }
  error(msg, data) { this._log('error', msg, data); }
  debug(msg, data) { this._log('debug', msg, data); }

  // Create a child logger with additional context
  child(additionalContext) {
    return new StructuredLogger({ ...this.context, ...additionalContext });
  }
}

// Express middleware for correlation ID + request logging
function requestLoggingMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Create a request-scoped logger
  req.logger = new StructuredLogger({
    correlationId,
    service: 'api-service',
    method: req.method,
    path: req.path,
  });

  req.logger.info('Request received');

  // Intercept response to log completion
  const originalEnd = res.end?.bind(res);
  if (res.end) {
    res.end = function(...args) {
      req.logger.info('Request completed', {
        statusCode: res.statusCode,
        duration: `${Date.now() - startTime}ms`,
      });
      originalEnd(...args);
    };
  }

  next?.();
}

function demoStructuredLogging() {
  console.log('\n=== Structured Logging with Correlation IDs ===');

  // Simulate request processing
  const req = {
    method: 'POST',
    path: '/api/orders',
    headers: { 'x-correlation-id': 'trace-abc-123' },
    user: { id: 'user_42' },
  };
  const res = { statusCode: 201 };

  requestLoggingMiddleware(req, res, () => {});

  // Use child logger in business logic (inherits correlationId)
  const orderLogger = req.logger.child({ userId: req.user.id, action: 'create-order' });
  orderLogger.info('Validating order input', { itemCount: 3 });
  orderLogger.info('Payment processed', { amount: 99.99, currency: 'USD' });
  orderLogger.info('Order created', { orderId: 'ord_xyz' });
}

// ─────────────────────────────────────────────────────────────
// Run All
// ─────────────────────────────────────────────────────────────
async function main() {
  await demoTRPC();
  demoFeatureFlags();
  demoWebSocket();
  demoStructuredLogging();
}

main().catch(console.error);
