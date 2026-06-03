# Closures & Scope Chain

## Lexical Scope and the Scope Chain

JavaScript uses **lexical scoping** (also called static scoping): the scope of a variable is determined by where it is **written** in source code, not where a function is **called**. This is fixed at parse time.

Every execution context has a reference to its outer (parent) lexical environment. This chain of references is the **scope chain**. When the engine looks up an identifier, it starts at the innermost scope and walks up the chain until it finds the binding or reaches the global scope (where it throws `ReferenceError` if not found).

```js
const global = "G";

function outer() {
  const outerVar = "O";

  function inner() {
    const innerVar = "I";
    console.log(innerVar);  // "I"   — own scope
    console.log(outerVar);  // "O"   — outer scope (scope chain)
    console.log(global);    // "G"   — global scope
  }

  inner();
}

outer();
// inner's scope chain: inner → outer → global
// This chain is set when inner() is DEFINED, not when it's CALLED.
```

---

## Closure: Definition and How It Works Internally

**A closure is a function bundled with a reference to its surrounding lexical environment (scope chain) at the time the function was created.**

When a function is created, V8 attaches a hidden `[[Environment]]` slot to the function object pointing to the current lexical environment. Even after the outer function returns and its execution context is popped from the call stack, the inner function retains a live reference to that environment. The garbage collector cannot collect those variables because they are still reachable through the closure.

```js
function makeCounter() {
  let count = 0; // lives in makeCounter's lexical environment

  return function increment() {
    count++; // increment has a closure over makeCounter's environment
    return count;
  };
}

const counter = makeCounter();
// makeCounter()'s execution context is GONE from the call stack.
// But count is NOT garbage collected — counter holds [[Environment]] → {count: 0}

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

The inner function doesn't copy `count` — it holds a **live reference** to the binding. This is the core of how closures work and the source of the classic `var` loop bug.

---

## Closure Use Cases

### 1. Data Privacy / Encapsulation

```js
function createBankAccount(initialBalance) {
  let balance = initialBalance; // private — not accessible outside

  return {
    deposit(amount) {
      if (amount > 0) balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount > balance) throw new Error("Insufficient funds");
      balance -= amount;
      return balance;
    },
    getBalance() { return balance; }
  };
}

const account = createBankAccount(100);
console.log(account.getBalance()); // 100
account.deposit(50);
console.log(account.getBalance()); // 150
console.log(account.balance);      // undefined — no direct access
```

### 2. Factory Functions

```js
function multiplierFactory(factor) {
  return (number) => number * factor; // closes over factor
}

const double = multiplierFactory(2);
const triple = multiplierFactory(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15
// Each factory call creates an independent closure over its own 'factor'
```

### 3. Memoization

```js
function memoize(fn) {
  const cache = new Map(); // private to this closure

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log("cache hit");
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const expensiveSquare = memoize((n) => {
  console.log(`computing ${n}²`);
  return n * n;
});

expensiveSquare(5); // "computing 25"
expensiveSquare(5); // "cache hit"
expensiveSquare(6); // "computing 36"
```

### 4. Partial Application

```js
function partial(fn, ...presetArgs) {
  return function(...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

function add(a, b, c) { return a + b + c; }

const add10 = partial(add, 10);
console.log(add10(5, 3));  // 18 → add(10, 5, 3)

const add10And5 = partial(add, 10, 5);
console.log(add10And5(3)); // 18 → add(10, 5, 3)
```

### 5. Currying

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

const curriedAdd = curry((a, b, c) => a + b + c);
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
```

---

## Memory Implications of Closures

Closures prevent garbage collection of the variables they reference. This is by design, but can cause memory leaks if closures are inadvertently long-lived.

```js
// LEAK: large data stays in memory because closure retains reference
function processData() {
  const largeArray = new Array(1_000_000).fill('data');

  return function() {
    // Even if largeArray is never used here,
    // V8 may keep the entire outer environment alive.
    console.log("done");
  };
}

const fn = processData();
// largeArray is not GC'd as long as fn is reachable
// FIX: explicitly null out if you know fn will live long
```

Modern V8 does perform escape analysis and can sometimes GC variables that closures don't actually reference, but you should not rely on this for large allocations.

Common leak patterns:
- Event listeners attached to DOM elements holding closures over large objects
- Timers (`setInterval`) that are never cleared, holding closures alive
- Module-level singletons that accumulate state through closures

---

## Classic Closure Interview Trick: Loop + var

This question appears in virtually every senior JS interview.

```js
// Problem
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3
// WHY: var is function-scoped. One binding shared by all callbacks.
// Loop finishes (i becomes 3), THEN callbacks run, all reading i=3.

// Fix 1: let (new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2

// Fix 2: IIFE (creates new scope per iteration)
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100);
  })(i);
}
// Output: 0, 1, 2

// Fix 3: setTimeout's third argument (less commonly known)
for (var i = 0; i < 3; i++) {
  setTimeout(console.log, 100, i); // passes i as argument to callback
}
// Output: 0, 1, 2
```

---

## Module Pattern Using Closures

The module pattern uses an IIFE to create private scope, returning only the public API. This was the primary way to create modules before ES6 `import/export`.

```js
const UserModule = (function() {
  // Private state
  let users = [];
  let nextId = 1;

  // Private function
  function validateUser(user) {
    return user && user.name && user.email;
  }

  // Public API
  return {
    addUser(user) {
      if (!validateUser(user)) throw new Error("Invalid user");
      users.push({ ...user, id: nextId++ });
    },
    getUsers() {
      return [...users]; // return a copy — don't expose internal array
    },
    getUserCount() {
      return users.length;
    }
  };
})(); // immediately invoked

UserModule.addUser({ name: "Alice", email: "a@b.com" });
console.log(UserModule.getUsers());
console.log(UserModule.users); // undefined — private
```

ES6 modules (`import/export`) achieve the same privacy through module scope — top-level variables in a module are not global.
