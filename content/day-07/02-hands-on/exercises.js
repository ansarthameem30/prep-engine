/**
 * Day 07 – Design Patterns Exercises
 * Implement 4 design patterns from scratch with real-world context.
 * Run with: node exercises.js
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: EventEmitter (Observer Pattern)
// ─────────────────────────────────────────────────────────────
// Build a full EventEmitter supporting: on, off, emit, once, removeAllListeners

class EventEmitter {
  #listeners = new Map();

  on(event, listener) {
    if (typeof listener !== "function") throw new TypeError("Listener must be a function");
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(listener);
    return this; // chainable
  }

  off(event, listener) {
    this.#listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event, ...args) {
    const listeners = this.#listeners.get(event);
    if (!listeners) return false;
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (err) {
        console.error(`Error in listener for '${event}':`, err);
      }
    });
    return true;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    wrapper._original = listener; // for reference equality in off()
    return this.on(event, wrapper);
  }

  removeAllListeners(event) {
    if (event) this.#listeners.delete(event);
    else this.#listeners.clear();
    return this;
  }

  listenerCount(event) {
    return this.#listeners.get(event)?.size || 0;
  }
}

console.log("=== Exercise 1: EventEmitter ===");
const emitter = new EventEmitter();

emitter.on("data", (val) => console.log("listener 1:", val));
emitter.on("data", (val) => console.log("listener 2:", val));
emitter.once("connect", () => console.log("connected!"));

emitter.emit("data", 42);    // listener 1: 42 / listener 2: 42
emitter.emit("connect");     // connected!
emitter.emit("connect");     // (silence — once)
console.log("data listeners:", emitter.listenerCount("data")); // 2


// ─────────────────────────────────────────────────────────────
// Exercise 2: Strategy Pattern — Form Validator
// ─────────────────────────────────────────────────────────────
// Build a validator that accepts pluggable validation strategies.

const validationStrategies = {
  required: (value) => ({
    valid: value !== null && value !== undefined && value !== "",
    message: "This field is required"
  }),
  minLength: (min) => (value) => ({
    valid: String(value).length >= min,
    message: `Must be at least ${min} characters`
  }),
  maxLength: (max) => (value) => ({
    valid: String(value).length <= max,
    message: `Must be at most ${max} characters`
  }),
  email: (value) => ({
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "Must be a valid email address"
  }),
  pattern: (regex, msg) => (value) => ({
    valid: regex.test(value),
    message: msg || `Must match pattern ${regex}`
  })
};

class FormValidator {
  #rules = new Map();

  addRule(field, ...strategies) {
    if (!this.#rules.has(field)) this.#rules.set(field, []);
    this.#rules.get(field).push(...strategies);
    return this;
  }

  validate(formData) {
    const errors = {};
    for (const [field, strategies] of this.#rules) {
      const value = formData[field];
      for (const strategy of strategies) {
        const fn = typeof strategy === "function" ? strategy : validationStrategies[strategy];
        if (!fn) continue;
        const { valid, message } = fn(value);
        if (!valid) {
          if (!errors[field]) errors[field] = [];
          errors[field].push(message);
        }
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }
}

console.log("\n=== Exercise 2: Strategy Validator ===");
const validator = new FormValidator()
  .addRule("email", validationStrategies.required, validationStrategies.email)
  .addRule("password",
    validationStrategies.required,
    validationStrategies.minLength(8),
    validationStrategies.pattern(/[A-Z]/, "Must contain uppercase letter")
  );

console.log(validator.validate({ email: "invalid", password: "short" }));
console.log(validator.validate({ email: "alice@test.com", password: "SecurePass1" }));


// ─────────────────────────────────────────────────────────────
// Exercise 3: Decorator Pattern — Logger + Cache Decorators
// ─────────────────────────────────────────────────────────────
// Implement decorator functions that wrap service methods.

function withLogging(method, methodName = method.name) {
  return function(...args) {
    const start = Date.now();
    console.log(`[LOG] ${methodName} called with`, JSON.stringify(args));
    const result = method.apply(this, args);
    const duration = Date.now() - start;
    console.log(`[LOG] ${methodName} completed in ${duration}ms`);
    return result;
  };
}

function withCache(method, ttl = 5000) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const { value, expires } = cache.get(key);
      if (Date.now() < expires) return value;
      cache.delete(key);
    }
    const result = method.apply(this, args);
    cache.set(key, { value: result, expires: Date.now() + ttl });
    return result;
  };
}

class UserService {
  constructor() {
    this.getUser = withLogging(withCache(this.#fetchUser.bind(this)), "getUser");
  }

  #fetchUser(id) {
    // Simulate DB call
    return { id, name: `User-${id}`, ts: Date.now() };
  }
}

console.log("\n=== Exercise 3: Decorators ===");
const svc = new UserService();
svc.getUser(1); // logged, computed
svc.getUser(1); // logged, from cache (same ts)
svc.getUser(2); // logged, new computation


// ─────────────────────────────────────────────────────────────
// Exercise 4: Factory + Singleton — Connection Pool
// ─────────────────────────────────────────────────────────────

class ConnectionPool {
  static #instance = null;
  #connections = [];
  #maxSize;

  constructor(maxSize = 10) {
    if (ConnectionPool.#instance) return ConnectionPool.#instance;
    this.#maxSize = maxSize;
    ConnectionPool.#instance = this;
  }

  static getInstance(maxSize) {
    if (!ConnectionPool.#instance) new ConnectionPool(maxSize);
    return ConnectionPool.#instance;
  }

  acquire() {
    if (this.#connections.length >= this.#maxSize) {
      throw new Error("Connection pool exhausted");
    }
    const conn = { id: this.#connections.length + 1, active: true };
    this.#connections.push(conn);
    console.log(`[Pool] Connection ${conn.id} acquired. Active: ${this.#connections.length}`);
    return conn;
  }

  release(conn) {
    this.#connections = this.#connections.filter(c => c.id !== conn.id);
    console.log(`[Pool] Connection ${conn.id} released. Active: ${this.#connections.length}`);
  }

  get size() { return this.#connections.length; }
}

console.log("\n=== Exercise 4: Connection Pool (Singleton + Factory) ===");
const pool1 = ConnectionPool.getInstance(5);
const pool2 = ConnectionPool.getInstance();
console.log("Same instance:", pool1 === pool2); // true

const c1 = pool1.acquire();
const c2 = pool1.acquire();
pool1.release(c1);
console.log("Pool size:", pool1.size); // 1
