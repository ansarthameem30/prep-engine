# JavaScript Design Patterns

## Why Design Patterns Matter at the Senior Level

Patterns are shared vocabulary. When you say "use an Observer here" in a code review, experienced engineers immediately understand the structure, trade-offs, and pitfalls — without reading your code. Knowing patterns also helps you recognize them in existing codebases (React hooks = Observer + Strategy, Redux = Command, Express middleware = Chain of Responsibility).

---

## Module Pattern and IIFE

**Problem:** Encapsulate implementation details, prevent global namespace pollution.

```js
const Analytics = (function() {
  let events = [];
  let sessionId = Math.random().toString(36).slice(2);

  function sendBatch() {
    if (!events.length) return;
    fetch("/analytics", { method: "POST", body: JSON.stringify({ sessionId, events }) });
    events = [];
  }

  setInterval(sendBatch, 5000);

  return {
    track(name, props) {
      events.push({ name, props, ts: Date.now() });
    },
    flush: sendBatch
  };
})();

Analytics.track("page_view", { path: "/home" });
```

In modern code, ES modules handle this natively. But the pattern still appears in bundled SDKs and legacy code.

---

## Singleton Pattern

**Problem:** Ensure exactly one instance of a class exists; provide a global access point.

```js
class Database {
  static #instance = null;
  #connection = null;

  constructor(config) {
    if (Database.#instance) return Database.#instance;
    this.#connection = createConnection(config); // hypothetical
    Database.#instance = this;
  }

  static getInstance(config) {
    if (!Database.#instance) new Database(config);
    return Database.#instance;
  }

  query(sql) { return this.#connection.execute(sql); }
}

const db1 = Database.getInstance({ host: "localhost" });
const db2 = Database.getInstance();
console.log(db1 === db2); // true — same instance

// React analog: React Context provides a "singleton" value down the tree.
// Node.js analog: module cache — require() returns same object on repeated calls.
```

**Watch out:** Singletons make testing hard (shared state between tests). Consider dependency injection as an alternative.

---

## Observer / Event Emitter Pattern

**Problem:** Decouple event producers from event consumers. Allow multiple subscribers.

```js
class EventEmitter {
  #listeners = new Map();

  on(event, listener) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(listener);
    return () => this.off(event, listener); // return unsubscribe function
  }

  off(event, listener) {
    this.#listeners.get(event)?.delete(listener);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(listener => listener(...args));
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }
}

// Usage
const bus = new EventEmitter();
const unsub = bus.on("login", (user) => console.log(`Welcome, ${user.name}`));
bus.emit("login", { name: "Alice" }); // "Welcome, Alice"
unsub();
bus.emit("login", { name: "Bob" }); // no output
```

**React analog:** `useReducer` + Context, `useEffect` subscriptions, third-party stores (Zustand, Redux) all use the Observer pattern. `useState` triggers re-renders like an emit.

---

## Factory Pattern

**Problem:** Delegate object creation to a function/method, decoupling the caller from concrete classes.

```js
class EmailNotifier {
  send(to, message) { console.log(`Email to ${to}: ${message}`); }
}
class SMSNotifier {
  send(to, message) { console.log(`SMS to ${to}: ${message}`); }
}
class PushNotifier {
  send(to, message) { console.log(`Push to ${to}: ${message}`); }
}

function createNotifier(type) {
  const types = {
    email: EmailNotifier,
    sms: SMSNotifier,
    push: PushNotifier
  };
  const NotifierClass = types[type];
  if (!NotifierClass) throw new Error(`Unknown notifier: ${type}`);
  return new NotifierClass();
}

const notifier = createNotifier(user.preferredChannel);
notifier.send(user.address, "Your order shipped!");

// Node.js analog: express() is a factory, not a class instantiated with new.
// React analog: createElement is a factory for React elements.
```

---

## Decorator Pattern

**Problem:** Add behavior to objects without modifying their class. More flexible than inheritance.

```js
// Function decorator (HOF approach)
function withLogging(fn, name = fn.name) {
  return function(...args) {
    console.time(name);
    const result = fn.apply(this, args);
    console.timeEnd(name);
    return result;
  };
}

function withAuth(handler) {
  return function(req, res, ...args) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    return handler.call(this, req, res, ...args);
  };
}

// Class decorator (using composition)
class CachingRepository {
  #repo;
  #cache = new Map();

  constructor(repo) { this.#repo = repo; }

  async findById(id) {
    if (this.#cache.has(id)) return this.#cache.get(id);
    const result = await this.#repo.findById(id);
    this.#cache.set(id, result);
    return result;
  }

  // Forward all other methods to underlying repo
  async save(entity) { this.#cache.delete(entity.id); return this.#repo.save(entity); }
}

// React analog: HOCs (withAuth, withTheme), React.memo, hooks wrapping other hooks.
// Express: middleware IS the Decorator pattern applied to request handlers.
```

---

## Strategy Pattern

**Problem:** Encapsulate interchangeable algorithms. Swap behavior at runtime.

```js
class Sorter {
  constructor(strategy) {
    this.strategy = strategy;
  }

  sort(data) {
    return this.strategy(data);
  }
}

const strategies = {
  bubble: (arr) => { /* bubble sort */ return [...arr].sort((a,b) => a-b); },
  quick:  (arr) => { /* quicksort */ return [...arr].sort((a,b) => a-b); },
  merge:  (arr) => { /* mergesort */ return [...arr].sort((a,b) => a-b); }
};

// Real-world: payment processing
class Checkout {
  #paymentStrategy;

  setPaymentStrategy(strategy) { this.#paymentStrategy = strategy; }

  processPayment(amount) {
    if (!this.#paymentStrategy) throw new Error("No payment strategy set");
    return this.#paymentStrategy.pay(amount);
  }
}

const PayPal = { pay: (amount) => `PayPal: $${amount}` };
const Stripe = { pay: (amount) => `Stripe: $${amount}` };
const Crypto = { pay: (amount) => `Crypto: $${amount}` };

const checkout = new Checkout();
checkout.setPaymentStrategy(user.prefersPay === "paypal" ? PayPal : Stripe);
checkout.processPayment(99.99);

// React analog: renderProps pattern, component polymorphism with prop-based behavior.
// Strategy replaces complex conditionals with composable objects.
```

---

## Summary: When to Use Which

| Pattern | Use When |
|---|---|
| Module | You need encapsulation and a single instance by convention |
| Singleton | You need EXACTLY one instance with a global access point |
| Observer | Multiple parts of your system need to react to the same events |
| Factory | Object creation logic is complex or type depends on runtime conditions |
| Decorator | You need to add functionality to objects without modifying the class |
| Strategy | You have multiple interchangeable algorithms or behaviors for the same operation |
