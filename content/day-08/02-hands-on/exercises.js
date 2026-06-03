/**
 * Day 08 – Functional JavaScript Exercises
 * Run with: node exercises.js
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Implement compose and pipe from scratch
// ─────────────────────────────────────────────────────────────

const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

// Async versions
const pipeAsync = (...fns) => (x) =>
  fns.reduce((promise, fn) => promise.then(fn), Promise.resolve(x));

const composeAsync = (...fns) => pipeAsync(...fns.reverse());

console.log("=== Exercise 1: compose and pipe ===");

const double = (x) => x * 2;
const addOne = (x) => x + 1;
const square = (x) => x * x;
const toString = (x) => `Result: ${x}`;

const composed = compose(toString, square, addOne, double); // double, addOne, square, toString
const piped = pipe(double, addOne, square, toString);       // same execution order

console.log(composed(3)); // double(3)=6, addOne=7, square=49, toString="Result: 49"
console.log(piped(3));    // same result

// String pipeline
const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const slug = (s) => s.replace(/\s+/g, "-");
const slugify = pipe(trim, lower, slug);

console.log(slugify("  Hello World Today  ")); // "hello-world-today"

// Async pipeline
const fetchUser = async (id) => ({ id, name: "Alice", role: "admin" });
const enrichUser = async (user) => ({ ...user, displayName: `[${user.role}] ${user.name}` });
const formatUser = async (user) => `User: ${user.displayName}`;

pipeAsync(fetchUser, enrichUser, formatUser)(1).then(console.log);
// "User: [admin] Alice"


// ─────────────────────────────────────────────────────────────
// Exercise 2: Implement curry and partial application
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 2: curry ===");

function curry(fn) {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return function(...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

const add = curry((a, b, c) => a + b + c);
console.log(add(1)(2)(3));   // 6
console.log(add(1, 2)(3));   // 6
console.log(add(1)(2, 3));   // 6

// Point-free data transformations using curried functions
const curriedMap = curry((fn, arr) => arr.map(fn));
const curriedFilter = curry((pred, arr) => arr.filter(pred));
const curriedReduce = curry((fn, init, arr) => arr.reduce(fn, init));

const doubleAll = curriedMap(x => x * 2);
const onlyEvens = curriedFilter(x => x % 2 === 0);
const sumAll = curriedReduce((a, b) => a + b, 0);

const processNumbers = pipe(onlyEvens, doubleAll, sumAll);
console.log(processNumbers([1, 2, 3, 4, 5, 6])); // evens=[2,4,6], doubled=[4,8,12], sum=24


// ─────────────────────────────────────────────────────────────
// Exercise 3: Implement map, filter, reduce from scratch
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 3: myMap, myFilter, myReduce ===");

function myMap(arr, fn) {
  const result = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) result[i] = fn(arr[i], i, arr);
  return result;
}

function myFilter(arr, fn) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (fn(arr[i], i, arr)) result.push(arr[i]);
  }
  return result;
}

function myReduce(arr, fn, initial) {
  let acc = initial !== undefined ? initial : arr[0];
  let start = initial !== undefined ? 0 : 1;
  for (let i = start; i < arr.length; i++) {
    acc = fn(acc, arr[i], i, arr);
  }
  return acc;
}

// Implement groupBy using reduce
function groupBy(arr, keyFn) {
  return myReduce(arr, (groups, item) => {
    const key = keyFn(item);
    return { ...groups, [key]: [...(groups[key] || []), item] };
  }, {});
}

// Implement flatMap using reduce
function flatMap(arr, fn) {
  return myReduce(arr, (acc, item) => [...acc, ...fn(item)], []);
}

const people = [
  { name: "Alice", dept: "eng" },
  { name: "Bob", dept: "design" },
  { name: "Charlie", dept: "eng" },
];
console.log(groupBy(people, p => p.dept));
// { eng: [{Alice}, {Charlie}], design: [{Bob}] }

console.log(flatMap([[1, 2], [3, 4], [5]], x => x)); // [1,2,3,4,5]


// ─────────────────────────────────────────────────────────────
// Exercise 4: Memoization with Closures (Revisit + Deepen)
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 4: Memoize with TTL and LRU ===");

// Memoize with TTL (time-to-live)
function memoizeWithTTL(fn, ttl = 5000) {
  const cache = new Map(); // key → { value, expires }

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const entry = cache.get(key);
      if (Date.now() < entry.expires) {
        return entry.value;
      }
      cache.delete(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, { value: result, expires: Date.now() + ttl });
    return result;
  };
}

// Memoize with LRU eviction (Least Recently Used, max N entries)
function memoizeLRU(fn, maxSize = 100) {
  const cache = new Map(); // insertion order = LRU order in Map

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value); // move to end (most recently used)
      return value;
    }
    const result = fn.apply(this, args);
    if (cache.size >= maxSize) {
      cache.delete(cache.keys().next().value); // evict LRU (first entry)
    }
    cache.set(key, result);
    return result;
  };
}

let callCount = 0;
const expensiveCalc = memoizeLRU((n) => {
  callCount++;
  return n * n;
}, 3);

expensiveCalc(1); expensiveCalc(2); expensiveCalc(3);
expensiveCalc(4); // evicts 1 (LRU)
expensiveCalc(1); // cache miss — 1 was evicted
console.log(`LRU calls: ${callCount}`); // 5


// ─────────────────────────────────────────────────────────────
// Exercise 5: Practical Functional React Patterns
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 5: Immutable State Updates ===");

// Simulate Redux-style reducer with functional updates
const initialState = {
  users: [
    { id: 1, name: "Alice", active: true },
    { id: 2, name: "Bob", active: false },
  ],
  loading: false,
  error: null
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case "TOGGLE_USER":
      return {
        ...state,
        users: state.users.map(u =>
          u.id === action.id ? { ...u, active: !u.active } : u
        )
      };
    case "ADD_USER":
      return {
        ...state,
        users: [...state.users, { ...action.user, id: state.users.length + 1 }]
      };
    case "REMOVE_USER":
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.id)
      };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

let state = initialState;
state = reducer(state, { type: "TOGGLE_USER", id: 1 });
console.log("After toggle:", state.users[0]); // { id: 1, name: "Alice", active: false }
console.log("Original unchanged:", initialState.users[0].active); // true (immutable)

state = reducer(state, { type: "ADD_USER", user: { name: "Charlie" } });
console.log("Users count:", state.users.length); // 3
