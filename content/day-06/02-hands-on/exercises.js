/**
 * Day 06 – ES6+ Advanced Features Exercises
 * Run with: node exercises.js
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Destructuring Mastery
// ─────────────────────────────────────────────────────────────

console.log("=== Exercise 1: Destructuring ===");

// Extract all the values using a single destructuring pattern
const data = {
  user: {
    name: "Alice",
    age: 28,
    address: { city: "New York", zip: "10001" },
    roles: ["admin", "editor"]
  },
  meta: { created: "2024-01-01", active: true }
};

// YOUR TASK: extract name, city, primaryRole (first role), created, active
const {
  user: {
    name,
    address: { city },
    roles: [primaryRole]
  },
  meta: { created, active }
} = data;

console.log(name, city, primaryRole, created, active);
// Alice  New York  admin  2024-01-01  true

// Function with parameter destructuring + defaults
function createUser({
  name,
  age,
  role = "viewer",
  permissions: { read = true, write = false } = {}
} = {}) {
  return { name, age, role, permissions: { read, write } };
}

console.log(createUser({ name: "Bob", age: 30, permissions: { write: true } }));
// { name: "Bob", age: 30, role: "viewer", permissions: { read: true, write: true } }
console.log(createUser()); // handles missing argument via = {}


// ─────────────────────────────────────────────────────────────
// Exercise 2: Custom Iterable with Generator
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 2: Custom Iterable ===");

// Implement a Range class that is iterable and supports for...of, spread, destructuring
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  [Symbol.iterator]() {
    let current = this.start;
    const { end, step } = this;
    return {
      next() {
        if (current <= end) {
          const value = current;
          current += step;
          return { value, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

const r = new Range(1, 10, 2);
console.log([...r]);               // [1, 3, 5, 7, 9]
const [first, second] = new Range(0, 100, 10);
console.log(first, second);       // 0  10

// Generator version
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) yield i;
}

console.log([...range(0, 10, 3)]); // [0, 3, 6, 9]


// ─────────────────────────────────────────────────────────────
// Exercise 3: WeakMap for Private State
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 3: WeakMap Private State ===");

const _balance = new WeakMap();
const _transactions = new WeakMap();

class BankAccount {
  constructor(owner, initialBalance) {
    this.owner = owner; // public
    _balance.set(this, initialBalance);
    _transactions.set(this, []);
  }

  deposit(amount) {
    if (amount <= 0) throw new Error("Amount must be positive");
    _balance.set(this, _balance.get(this) + amount);
    _transactions.get(this).push({ type: "deposit", amount, date: Date.now() });
    return this;
  }

  withdraw(amount) {
    const bal = _balance.get(this);
    if (amount > bal) throw new Error("Insufficient funds");
    _balance.set(this, bal - amount);
    _transactions.get(this).push({ type: "withdraw", amount, date: Date.now() });
    return this;
  }

  get balance() { return _balance.get(this); }
  get history() { return [..._transactions.get(this)]; }
}

const acc = new BankAccount("Alice", 1000);
acc.deposit(500).withdraw(200);
console.log(acc.balance);        // 1300
console.log(acc.history.length); // 2
console.log(acc._balance);       // undefined — truly private


// ─────────────────────────────────────────────────────────────
// Exercise 4: Proxy-Based Observable State
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 4: Proxy Observable ===");

function createStore(initialState, subscribers = new Map()) {
  return new Proxy({ ...initialState }, {
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value && subscribers.has(key)) {
        subscribers.get(key).forEach(cb => cb(value, oldValue));
      }
      return result;
    },
    get(target, key, receiver) {
      if (key === "subscribe") {
        return (prop, callback) => {
          if (!subscribers.has(prop)) subscribers.set(prop, []);
          subscribers.get(prop).push(callback);
          return () => { // unsubscribe
            const subs = subscribers.get(prop);
            subscribers.set(prop, subs.filter(cb => cb !== callback));
          };
        };
      }
      return Reflect.get(target, key, receiver);
    }
  });
}

const store = createStore({ count: 0, name: "test" });
const unsubscribe = store.subscribe("count", (newVal, oldVal) => {
  console.log(`count: ${oldVal} → ${newVal}`);
});

store.count = 1; // logs: count: 0 → 1
store.count = 2; // logs: count: 1 → 2
unsubscribe();
store.count = 3; // no log


// ─────────────────────────────────────────────────────────────
// Exercise 5: Tagged Template Literal
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 5: Tagged Template Literal ===");

// Implement a `css` tagged template that auto-prefixes vendor-specific properties
function css(strings, ...values) {
  const result = strings.reduce((acc, str, i) => {
    return acc + (values[i - 1] ?? "") + str;
  });

  // Simple autoprefixer simulation
  return result
    .replace(/\btransform\b/g, "-webkit-transform: $&; transform")
    .replace(/\buser-select\b/g, "-webkit-user-select: $&; user-select");
}

const color = "red";
const size = 14;
const styles = css`
  color: ${color};
  font-size: ${size}px;
  transform: rotate(45deg);
  user-select: none;
`;
console.log(styles);
