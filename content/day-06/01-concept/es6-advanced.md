# ES6+ Advanced Features

## Destructuring — All Forms

```js
// Array destructuring
const [a, b, ...rest] = [1, 2, 3, 4, 5];
// a=1, b=2, rest=[3,4,5]

// Skip elements
const [, second, , fourth] = [1, 2, 3, 4];

// Default values
const [x = 10, y = 20] = [5]; // x=5, y=20

// Swap variables
let p = 1, q = 2;
[p, q] = [q, p]; // p=2, q=1

// Object destructuring
const { name, age, role = "user" } = { name: "Alice", age: 30 };

// Renaming
const { name: userName, age: userAge } = { name: "Bob", age: 25 };

// Nested object + array
const { address: { city, zip }, scores: [first] } =
  { address: { city: "NYC", zip: "10001" }, scores: [98, 95] };

// Function parameter destructuring
function render({ title, subtitle = "default", tags: [primaryTag] = [] }) {
  console.log(title, subtitle, primaryTag);
}

// Rest in object destructuring (object spread excluded)
const { a: omit, ...remaining } = { a: 1, b: 2, c: 3 };
// remaining = { b: 2, c: 3 }
```

---

## Spread / Rest Operators

```js
// Function rest parameters (must be last)
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10

// Array spread
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]
const copy = [...arr1]; // shallow copy

// Object spread (ES2018)
const base = { a: 1, b: 2 };
const extended = { ...base, c: 3, b: 99 }; // later keys win: b=99

// Practical: immutable update
const state = { user: "Alice", count: 0 };
const newState = { ...state, count: state.count + 1 };

// Spread into function arguments
Math.max(...[1, 5, 3, 9, 2]); // 9
```

---

## Optional Chaining (`?.`) and Nullish Coalescing (`??`)

```js
const user = null;

// Without ?.
const city = user && user.address && user.address.city; // ""

// With ?.
const city2 = user?.address?.city; // undefined (no error)

// Method calls
const result = obj?.method?.(); // undefined if obj or method is null/undefined

// Dynamic property access
const key = "name";
const val = obj?.[key]; // undefined if obj is null

// Array index
const first = arr?.[0];

// ?? vs ||
// || returns right side if left is falsy (0, "", false, null, undefined)
// ?? returns right side ONLY if left is null or undefined

const count = 0;
console.log(count || 10);  // 10 — because 0 is falsy
console.log(count ?? 10);  // 0 — because 0 is not null/undefined

// Logical assignment operators (ES2021)
let a = null;
a ??= "default"; // a = "default" (only assigns if a is null/undefined)

let b = 0;
b ||= 42; // b = 42 (assigns if b is falsy)

let c = 1;
c &&= 99; // c = 99 (assigns if c is truthy)
```

---

## Generators and Iterators

A generator function returns a generator object that implements both the Iterator and Iterable protocols.

```js
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i; // suspend and return value; resume on next .next() call
  }
}

const gen = range(1, 10, 2);
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 3, done: false }
// ...
console.log([...range(0, 5)]); // [0, 1, 2, 3, 4]

// Custom iterable using Symbol.iterator
class InfiniteCounter {
  constructor(start = 0) { this.start = start; }

  [Symbol.iterator]() {
    let current = this.start;
    return {
      next() {
        return { value: current++, done: false };
      }
    };
  }
}

const counter = new InfiniteCounter(5);
const [c1, c2, c3] = counter; // 5, 6, 7 — destructuring uses iterator

// Generator as infinite sequence
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

function take(n, iterable) {
  const result = [];
  for (const val of iterable) {
    result.push(val);
    if (result.length === n) break;
  }
  return result;
}

take(8, fibonacci()); // [0, 1, 1, 2, 3, 5, 8, 13]
```

---

## WeakMap and WeakSet

`WeakMap` keys must be objects (not primitives). Keys are held **weakly** — if the object used as a key has no other references, it can be garbage collected, and the WeakMap entry is removed automatically. This prevents memory leaks when associating metadata with objects whose lifetime you don't control.

```js
// Use case: attach private metadata to DOM elements
const metadata = new WeakMap();

function attachData(element, data) {
  metadata.set(element, data);
}

// When element is removed from DOM and GC'd,
// the WeakMap entry is automatically cleaned up.
// With a regular Map, you'd need to manually delete entries.

// Use case: private class data (pre-class-fields era)
const _private = new WeakMap();

class SecureCache {
  constructor() {
    _private.set(this, { data: new Map(), hits: 0 });
  }
  set(key, val) { _private.get(this).data.set(key, val); }
  get(key) {
    const priv = _private.get(this);
    priv.hits++;
    return priv.data.get(key);
  }
  get hits() { return _private.get(this).hits; }
}

// WeakMap limitations: not iterable, no .size, no .clear
// That's intentional — iteration would prevent GC
```

---

## Proxy and Reflect API

`Proxy` wraps an object and intercepts fundamental operations. `Reflect` provides the default behavior for those operations (equivalent to what the engine would do without the proxy).

```js
// Validation proxy
function createValidatedObject(target, validators) {
  return new Proxy(target, {
    set(obj, prop, value, receiver) {
      if (validators[prop] && !validators[prop](value)) {
        throw new TypeError(`Invalid value for ${prop}: ${value}`);
      }
      return Reflect.set(obj, prop, value, receiver);
      // Reflect.set is equiv to: obj[prop] = value (but returns boolean)
    },
    get(obj, prop, receiver) {
      console.log(`Getting ${prop}`);
      return Reflect.get(obj, prop, receiver);
    }
  });
}

const user = createValidatedObject({}, {
  age: (v) => typeof v === "number" && v >= 0 && v <= 150,
  name: (v) => typeof v === "string" && v.length > 0
});

user.name = "Alice";  // OK
user.age = 30;        // OK
// user.age = -1;     // TypeError: Invalid value for age: -1

// Observable pattern with Proxy
function observable(obj, onChange) {
  return new Proxy(obj, {
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) onChange(key, oldValue, value);
      return result;
    }
  });
}
```

---

## Symbol

```js
// Create unique keys that don't collide with string keys
const ID = Symbol("id");
const obj = { [ID]: 123, name: "test" };
console.log(obj[ID]);     // 123
console.log(obj["id"]);   // undefined — Symbol key is distinct

// Well-known symbols customize built-in behavior
class Temperature {
  constructor(celsius) { this.celsius = celsius; }

  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.celsius;
    if (hint === "string") return `${this.celsius}°C`;
    return this.celsius; // default
  }
}

const temp = new Temperature(100);
console.log(+temp);        // 100
console.log(`${temp}`);   // "100°C"
console.log(temp + 0);    // 100

// Symbol.iterator — makes any object iterable
// Symbol.hasInstance — customizes instanceof
// Symbol.toPrimitive — customizes type coercion
// Symbol.toStringTag — customizes Object.prototype.toString.call()
```

---

## Tagged Template Literals

```js
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const val = values[i - 1];
    return result + (val !== undefined ? `<strong>${val}</strong>` : "") + str;
  });
}

const name = "Alice";
const role = "admin";
const html = highlight`User ${name} has role ${role}.`;
// "User <strong>Alice</strong> has role <strong>admin</strong>."

// SQL injection prevention (concept)
function sql(strings, ...values) {
  // Sanitize each value, combine with static string parts
  const sanitized = values.map(v => sanitizeSQL(v));
  return strings.reduce((q, part, i) => q + (sanitized[i-1] || "") + part);
}
```
