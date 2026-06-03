# Functional JavaScript

## Pure Functions and Side Effects

A **pure function** satisfies two conditions:
1. **Deterministic** — same inputs always produce same outputs
2. **No side effects** — does not modify external state, does not perform I/O

```js
// Pure
const add = (a, b) => a + b;
const double = (arr) => arr.map(x => x * 2); // returns new array, doesn't mutate

// Impure — reads external mutable state
let multiplier = 2;
const impureMultiply = (x) => x * multiplier; // result changes if multiplier changes

// Impure — modifies external state
const addToCart = (cart, item) => {
  cart.push(item); // MUTATION — side effect
  return cart;
};

// Pure version
const addToCartPure = (cart, item) => [...cart, item]; // returns new array
```

Benefits of pure functions: testable without mocks, safe to cache (memoize), safe to parallelize, easier to reason about.

---

## Immutability

**Never mutate state directly.** Instead, create new values.

```js
// Object.freeze — shallow immutability
const config = Object.freeze({ host: "localhost", port: 3000 });
config.port = 8080; // silently ignored (throws in strict mode)
config.nested = {}; // silently ignored
// But: config.nested.key = "x" would work if nested is an object (shallow freeze)

// Deep freeze
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(name => {
    const value = obj[name];
    if (typeof value === "object" && value !== null) deepFreeze(value);
  });
  return Object.freeze(obj);
}

// Immutable update patterns (critical for React/Redux)
// Object
const state = { user: { name: "Alice", age: 30 }, count: 0 };
const newState = { ...state, count: state.count + 1 }; // shallow
const updatedUser = { ...state, user: { ...state.user, age: 31 } }; // nested update

// Array
const arr = [1, 2, 3, 4];
const appended = [...arr, 5];                    // add to end
const prepended = [0, ...arr];                   // add to start
const withoutIndex2 = arr.filter((_, i) => i !== 2); // remove index
const updated = arr.map((x, i) => i === 1 ? 99 : x); // update at index

// Why React requires immutability:
// React uses referential equality to detect state changes.
// If you mutate the same object, the reference doesn't change,
// React sees the old reference === new reference, and skips the re-render.
```

---

## Higher-Order Functions (Map, Filter, Reduce)

```js
// Implementing from scratch
Array.prototype.myMap = function(fn) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    result.push(fn(this[i], i, this));
  }
  return result;
};

Array.prototype.myFilter = function(predicate) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (predicate(this[i], i, this)) result.push(this[i]);
  }
  return result;
};

Array.prototype.myReduce = function(fn, initialValue) {
  let acc = initialValue !== undefined ? initialValue : this[0];
  let startIdx = initialValue !== undefined ? 0 : 1;
  for (let i = startIdx; i < this.length; i++) {
    acc = fn(acc, this[i], i, this);
  }
  return acc;
};

// Implementing map and filter via reduce:
const myMap2 = (arr, fn) => arr.reduce((acc, item, i) => [...acc, fn(item, i)], []);
const myFilter2 = (arr, fn) => arr.reduce((acc, item, i) => fn(item, i) ? [...acc, item] : acc, []);

// Real power of reduce: multi-operation in one pass
const stats = [1, 2, 3, 4, 5, 6].reduce((acc, num) => ({
  sum: acc.sum + num,
  count: acc.count + 1,
  min: Math.min(acc.min, num),
  max: Math.max(acc.max, num)
}), { sum: 0, count: 0, min: Infinity, max: -Infinity });
```

---

## Currying and Partial Application

```js
// Manual currying
const curry = (fn) => {
  const arity = fn.length; // declared parameter count
  return function curried(...args) {
    if (args.length >= arity) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
};

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3);   // 6
add(1, 2)(3);   // 6
add(1)(2, 3);   // 6
add(1, 2, 3);   // 6

// Practical currying: building reusable, configurable functions
const validateMinLength = curry((min, str) => str.length >= min);
const validateEmail = (str) => /\S+@\S+\.\S+/.test(str);

const isLongEnough = validateMinLength(8);  // partially applied
isLongEnough("hello");    // false
isLongEnough("hello123"); // true

// Partial application without curry (using bind)
function multiply(x, y) { return x * y; }
const double = multiply.bind(null, 2);
const triple = multiply.bind(null, 3);
```

---

## Function Composition

```js
// compose: right to left (mathematical convention: g∘f means f first, then g)
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);

// pipe: left to right (more readable for data pipelines)
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const trim = (str) => str.trim();
const lower = (str) => str.toLowerCase();
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const removeSpaces = (str) => str.replace(/\s+/g, "-");

const slugify = pipe(trim, lower, removeSpaces);
const titleCase = pipe(trim, lower, capitalize);

console.log(slugify("  Hello World  ")); // "hello-world"
console.log(titleCase("  hello world")); // "Hello world"

// Point-free style (functions without explicit argument references)
const isPositive = (n) => n > 0;
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const positiveSum = pipe(
  (arr) => arr.filter(isPositive),
  sum
);
```

---

## Transducers (Senior-Level Concept)

Transducers solve the problem of multiple `map`/`filter`/`reduce` chains creating intermediate arrays:

```js
// Problem: 3 passes, 3 intermediate arrays
const result = [1..10000]
  .filter(x => x % 2 === 0)   // creates 5000-element array
  .map(x => x * 3)             // creates 5000-element array
  .filter(x => x > 10)         // creates ~4998-element array
  .reduce((a, b) => a + b, 0); // final pass

// Transducer approach: compose transformations, single pass
const filtering = (pred) => (reducer) => (acc, val) =>
  pred(val) ? reducer(acc, val) : acc;

const mapping = (transform) => (reducer) => (acc, val) =>
  reducer(acc, transform(val));

const transduce = (xf, reducer, init, coll) =>
  coll.reduce(xf(reducer), init);

const xf = compose(
  filtering(x => x % 2 === 0),
  mapping(x => x * 3),
  filtering(x => x > 10)
);

// Single pass, zero intermediate arrays
const result2 = transduce(xf, (acc, val) => acc + val, 0, [1,2,3,4,5,6,7,8,9,10]);
```

Transducers compose transformations at the reducer level, producing a single pass. This matters for large datasets. Libraries like RxJS and transducer-js use this pattern.

---

## Practical Use Cases in React and Node.js

```js
// React: functional update patterns
const [todos, setTodos] = useState([]);

// ADD (immutable)
setTodos(prev => [...prev, newTodo]);

// UPDATE (immutable)
setTodos(prev => prev.map(t => t.id === id ? { ...t, done: true } : t));

// REMOVE (immutable)
setTodos(prev => prev.filter(t => t.id !== id));

// Node.js: Express middleware as compose/pipe
const withAuth = (handler) => async (req, res) => {
  if (!req.headers.authorization) return res.status(401).end();
  req.user = await decodeToken(req.headers.authorization);
  return handler(req, res);
};

const withValidation = (schema) => (handler) => async (req, res) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  return handler(req, res);
};

const createUserHandler = async (req, res) => { /* ... */ };
const protectedCreateUser = withAuth(withValidation(schema)(createUserHandler));
```
