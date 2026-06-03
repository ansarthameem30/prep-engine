# Day 55 — JavaScript Deep Mock Interview Guide

## Top 10 JS Trick Questions (with Answers)

### 1. What does `typeof null` return and why?
**Answer**: `"object"`. This is a long-standing bug in JavaScript from its first version. Objects were represented as a bit pattern starting with `000`. `null` was represented as all zeros — which also starts with `000` — so it was incorrectly classified as an object. It was never fixed to preserve backward compatibility.

### 2. What is the difference between `==` and `===`?
**Answer**: `===` (strict equality) compares both value AND type without coercion. `==` (loose equality) performs type coercion before comparing. Classic traps: `0 == false` is `true`, `"" == false` is `true`, `null == undefined` is `true` but `null === undefined` is `false`. Rule: always use `===` in production code.

### 3. What is a closure, and why do they cause memory leaks?
**Answer**: A closure is a function that retains access to variables from its enclosing scope even after the outer function has returned. Memory leak scenario: an event listener attached to a DOM element creates a closure referencing a large object. If you remove the DOM element but forget to remove the listener, the large object can't be garbage collected because the listener still holds a reference to it.

### 4. What does `this` refer to in an arrow function?
**Answer**: Arrow functions don't have their own `this`. They capture `this` from the enclosing lexical context at the time of definition — not invocation. This is why `setTimeout(() => this.doSomething(), 100)` in a class method works correctly (unlike a regular function where `this` would be `undefined` or `window`).

### 5. What is the event loop? What is the microtask queue vs macrotask queue?
**Answer**: The event loop picks tasks from queues and executes them on the single thread. **Macrotasks** (task queue): `setTimeout`, `setInterval`, I/O callbacks, `setImmediate`. **Microtasks** (microtask queue): `Promise.then/catch/finally`, `queueMicrotask`, `MutationObserver`. After each macrotask, ALL pending microtasks are drained before the next macrotask runs. So `Promise.resolve().then(...)` always runs before the next `setTimeout(fn, 0)`.

### 6. What is prototype chain pollution and why is it dangerous?
**Answer**: All objects inherit from `Object.prototype`. If you can set properties on `Object.prototype`, all objects in the application inherit those properties. Classic vector: `JSON.parse('{"__proto__": {"isAdmin": true}}')` using vulnerable merge utilities. This is the "prototype pollution" vulnerability in `lodash.merge < 4.17.21`. Fix: use `Object.create(null)` for dictionaries, validate JSON keys, use `hasOwnProperty` checks.

### 7. What is the difference between `call`, `apply`, and `bind`?
**Answer**: All three set `this` for a function. `fn.call(ctx, arg1, arg2)` — invokes immediately, args as comma-separated. `fn.apply(ctx, [arg1, arg2])` — invokes immediately, args as array. `fn.bind(ctx, arg1)` — returns a NEW function with `this` bound, does not invoke immediately. The new function can be called later.

### 8. Explain `async/await` in terms of how it compiles to Promises.
**Answer**: `async/await` is syntactic sugar over Promises and generators. An `async` function always returns a Promise. `await` suspends execution of the current function and yields control back to the caller — but it does NOT block the thread. Under the hood, the code after `await` becomes a `.then()` callback. `try/catch` around `await` is equivalent to `.catch()` on the Promise.

### 9. What is the difference between `Object.freeze`, `Object.seal`, and `const`?
**Answer**: `const` prevents reassignment of the variable binding, but the object it points to can still be mutated. `Object.seal` prevents adding or removing properties, but existing properties can still be modified. `Object.freeze` prevents adding, removing, AND modifying properties — makes the object effectively immutable at the top level (not deep — nested objects are still mutable).

### 10. What happens when you use `var` inside a `for` loop with a closure?
**Answer**: Classic interview trap: `var` is function-scoped, not block-scoped. By the time the callbacks fire, the loop has finished and `i` is at its final value.
```js
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100); // prints 5 five times
}
// Fix with let (block-scoped): each iteration gets its own `i`
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100); // prints 0,1,2,3,4
}
```

---

## Code Output Predictions

### Example 1: Promise + setTimeout ordering
```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```
**Output**: `1, 4, 3, 2`
**Why**: Synchronous code runs first (1, 4). Then microtask queue is drained (Promise → 3). Then macrotask (setTimeout → 2).

### Example 2: Closure in loop with var
```js
const fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns[0](), fns[1](), fns[2]());
```
**Output**: `3 3 3` — all closures share the same `i`, which is 3 after the loop.

### Example 3: this binding
```js
const obj = {
  name: 'obj',
  regular: function() { return this.name; },
  arrow: () => this?.name,
};
console.log(obj.regular()); // "obj"
console.log(obj.arrow());   // undefined (arrow captures outer this, not obj)
```

### Example 4: Async/await + Promise.all
```js
async function main() {
  const a = await Promise.resolve(1);
  const b = await Promise.resolve(2);
  return a + b;
}
main().then(console.log); // 3 — but both awaits are sequential, not parallel
// Better: const [a, b] = await Promise.all([...]) for parallel execution
```

### Example 5: Object reference vs value
```js
const a = { x: 1 };
const b = a;
b.x = 2;
console.log(a.x); // 2 — a and b point to the same object in memory
const c = { ...a }; // shallow copy
c.x = 99;
console.log(a.x); // 2 — c is a different object
```

---

## Implement from Scratch Checklist

These are the functions you must be able to write in a live interview without looking anything up. Practice until each takes under 10 minutes.

| Function | Key Points | Time Target |
|---|---|---|
| `Promise.all` | Reject fast on first rejection, resolve when all resolve | 8 min |
| `Promise.race` | Settle with first settled (resolved or rejected) | 5 min |
| `debounce` | Delay execution until N ms after last call | 8 min |
| `throttle` | Execute at most once per N ms | 8 min |
| `deepClone` | Handle circular refs, Date, Array, primitives | 12 min |
| `EventEmitter` | `on`, `off`, `emit`, `once` | 10 min |
| `curry` | Return curried function until enough args provided | 8 min |
| `compose` | `compose(f, g, h)(x)` = `f(g(h(x)))` | 5 min |
| `memoize` | Cache results by arguments | 5 min |
| `once` | Function that executes only on first call | 4 min |

---

## Mock Interview Communication Tips

**When shown code and asked "what does this output?"**:
1. Trace execution in your head step by step — don't guess
2. State your reasoning: "This is a `var`, so it's function-scoped..."
3. If unsure about edge cases: "I believe the output is X, but let me verify by tracing through..."

**When asked to implement something**:
1. Clarify the API first: "Should this handle the case where...?"
2. Start with a stub: write the function signature and a simple test case
3. Build up incrementally
4. State time and space complexity when done
5. Test with edge cases: empty input, single element, negative numbers
