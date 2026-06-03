/**
 * Day 02 – Hands-On Exercises
 * Topic: Closures, Scope Chain, Module Pattern
 *
 * Instructions: Implement each exercise from scratch, then test it.
 * Run with: node exercises.js
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Counter Using Closure
// ─────────────────────────────────────────────────────────────
// Build a counter factory that returns an object with increment,
// decrement, reset, and getValue methods. The count must be private.

function createCounter(initialValue = 0) {
  let count = initialValue;

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    reset()     { count = initialValue; return count; },
    getValue()  { return count; }
  };
}

const c1 = createCounter(10);
const c2 = createCounter();   // independent counter

console.log("=== Exercise 1: Counter ===");
console.log(c1.increment()); // 11
console.log(c1.increment()); // 12
console.log(c1.decrement()); // 11
console.log(c2.increment()); // 1  — c2 is independent of c1
console.log(c1.reset());     // 10
console.log(c1.getValue());  // 10


// ─────────────────────────────────────────────────────────────
// Exercise 2: Fix setTimeout in Loop — 3 Approaches
// ─────────────────────────────────────────────────────────────
// The broken version logs 3,3,3. Fix it three ways.

console.log("\n=== Exercise 2: setTimeout Loop Fix ===");

// Approach 1: Use let
console.log("-- Approach 1: let --");
for (let i = 0; i < 3; i++) {
  setTimeout(() => process.stdout.write(`${i} `), i * 10);
}
setTimeout(() => console.log(), 50); // newline after outputs settle

// Approach 2: IIFE captures current i in a new scope
console.log("-- Approach 2: IIFE --");
for (var i = 0; i < 3; i++) {
  (function(captured) {
    setTimeout(() => process.stdout.write(`${captured} `), captured * 10 + 100);
  })(i);
}
setTimeout(() => console.log(), 200);

// Approach 3: bind / partial application
console.log("-- Approach 3: bind --");
function logNum(n) { process.stdout.write(`${n} `); }
for (var j = 0; j < 3; j++) {
  setTimeout(logNum.bind(null, j), j * 10 + 300);
}
setTimeout(() => console.log(), 400);


// ─────────────────────────────────────────────────────────────
// Exercise 3: Build a Memoize Function
// ─────────────────────────────────────────────────────────────
// Requirements:
// - Cache results based on arguments
// - Handle multiple arguments
// - Cache should be accessible via .cache property (for testing)
// - Should work with any pure function

function memoize(fn) {
  const cache = new Map();

  function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }

  memoized.cache = cache;      // expose for inspection / clearing
  memoized.clear = () => cache.clear();
  return memoized;
}

console.log("\n=== Exercise 3: Memoize ===");

let callCount = 0;
const expensiveAdd = memoize((a, b) => {
  callCount++;
  return a + b;
});

console.log(expensiveAdd(1, 2));  // 3   (computed)
console.log(expensiveAdd(1, 2));  // 3   (cached)
console.log(expensiveAdd(3, 4));  // 7   (computed)
console.log(`Function called ${callCount} times`); // 2 (not 3)
console.log("Cache size:", expensiveAdd.cache.size); // 2


// ─────────────────────────────────────────────────────────────
// Exercise 4: Private Counter Module (Module Pattern)
// ─────────────────────────────────────────────────────────────
// Using the module pattern (IIFE), create a module that manages
// a list of users. Expose: addUser, removeUser, getUsers, count.
// Keep the internal array private.

const UserStore = (function() {
  let users = [];

  return {
    addUser(name) {
      if (!name || typeof name !== "string") throw new Error("Invalid name");
      if (users.includes(name)) throw new Error(`${name} already exists`);
      users.push(name);
      return this; // enable chaining
    },
    removeUser(name) {
      const idx = users.indexOf(name);
      if (idx === -1) throw new Error(`${name} not found`);
      users.splice(idx, 1);
      return this;
    },
    getUsers() { return [...users]; }, // defensive copy
    get count() { return users.length; }
  };
})();

console.log("\n=== Exercise 4: UserStore Module ===");
UserStore.addUser("Alice").addUser("Bob").addUser("Charlie");
console.log(UserStore.getUsers()); // ["Alice", "Bob", "Charlie"]
console.log(UserStore.count);      // 3
UserStore.removeUser("Bob");
console.log(UserStore.getUsers()); // ["Alice", "Charlie"]
console.log(UserStore.users);      // undefined — private


// ─────────────────────────────────────────────────────────────
// Exercise 5: Implement once() Using Closure
// ─────────────────────────────────────────────────────────────
// once(fn) returns a wrapper that calls fn at most once.
// Subsequent calls return the result of the first call without re-invoking fn.

function once(fn) {
  let called = false;
  let result;

  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

console.log("\n=== Exercise 5: once() ===");

const initialize = once(() => {
  console.log("Initializing...");
  return { initialized: true, timestamp: Date.now() };
});

const r1 = initialize(); // logs "Initializing..."
const r2 = initialize(); // silent
const r3 = initialize(); // silent

console.log(r1 === r2); // true — same object returned each time
console.log(r2 === r3); // true

// Bonus: once with context
const obj = {
  value: 42,
  getValue: once(function() {
    return this.value;
  })
};
console.log(obj.getValue()); // 42
console.log(obj.getValue()); // 42 (cached, no second invocation)
