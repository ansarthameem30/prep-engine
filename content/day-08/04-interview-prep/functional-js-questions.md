# Day 08 – Functional JavaScript: Interview Q&A

---

**Q1: What is a pure function? Why does it matter?**

A pure function satisfies two conditions: it is deterministic (same inputs always return the same output) and has no side effects (doesn't modify external state, doesn't perform I/O, doesn't access mutable shared state). `const add = (a, b) => a + b` is pure. `const greet = (name) => { console.log(name); return name; }` is impure — console.log is a side effect. Pure functions matter because they are predictable, testable without mocks (input → output, no setup), safe to memoize (referential transparency), and safe to parallelize. In React, component render functions should be pure — same props produce same UI. In Redux, reducers must be pure — same state + action = same new state. The React team can safely call render functions multiple times (strict mode, concurrent features) only because they expect purity.

---

**Q2: What is the difference between `compose` and `pipe`?**

Both combine multiple functions into one. The difference is execution order. `compose(f, g, h)(x)` executes right-to-left: `f(g(h(x)))` — like mathematical function composition. `pipe(f, g, h)(x)` executes left-to-right: `h(g(f(x)))`. `pipe` is generally more readable for data pipelines because you write functions in the order data flows through them. `compose` aligns with mathematical notation. Implementation: `compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x)` vs `pipe = (...fns) => x => fns.reduce((v, f) => f(v), x)`. In practice, `pipe` is more common in JavaScript codebases. Both require all intermediate functions to be unary (one argument), or you need to handle multi-argument functions differently.

---

**Q3: What does currying enable that normal functions don't?**

Currying transforms a function with multiple parameters into a sequence of functions each taking one argument. This enables partial application: fixing some arguments early to create specialized functions. `const validate = curry((rules, value) => ...)` lets you do `const validateEmail = validate(emailRules)` — a reusable single-argument validator. Point-free programming becomes natural: `const processNames = pipe(map(trim), map(capitalize), filter(isNotEmpty))` where `map`, `filter` are curried. Configuration and dependency injection are cleaner: `const createHandler = curry((db, logger, req) => ...)` → `app.use(createHandler(db)(logger))`. It also enables function composition of multi-step pipelines where each step is independently reusable. Currying and partial application are the functional equivalent of the Strategy pattern — you parameterize behavior without subclassing.

---

**Q4: Why does React require immutable state updates?**

React uses referential equality (`===`) to detect state changes and decide whether to re-render. If you mutate the state object directly (`state.count++`), the reference is the same — React sees `prevState === newState` and skips the re-render. You get stale UI without errors. Immutable updates (`setState(prev => ({ ...prev, count: prev.count + 1 }))`) create a new object reference, which React correctly detects as a change. Beyond React's detection mechanism: immutability enables time-travel debugging (Redux DevTools can replay state history because each state is a separate snapshot), easier undo/redo functionality, and safe concurrent rendering (React 18's concurrent features run renders at multiple priority levels — mutable state could cause consistency issues across concurrent renders). Libraries like Immer let you write mutating-looking code that produces immutable updates under the hood.

---

**Q5: What is a transducer?**

A transducer is a composable, reusable transformation that is decoupled from the data structure it operates on. The key problem it solves: `array.filter(f).map(g).filter(h)` creates two intermediate arrays and iterates the collection three times. A transducer composes `filter`, `map`, and `filter` at the reducer level, producing a single transformation function that gets applied in one pass with zero intermediate collections. Mechanically: a transducer is a function that takes a reducer and returns a reducer. You compose transducers (right-to-left like compose) and then apply the composed transducer to a base reducer. This works on any reducible collection (arrays, Sets, streams, observables) — the same transducer can reduce over any data source. Transducers are rare in interviews but demonstrate mastery of higher-order functions and performance thinking. Libraries like RxJS operators and Clojure's core transducers use this pattern.

---

**Q6: What is referential transparency and why is it important for optimization?**

Referential transparency means a function call can be replaced by its return value without changing program behavior — which is only guaranteed for pure functions. A call `add(2, 3)` can always be replaced with `5`. This property enables: (1) Memoization — if `f(x)` is referentially transparent, caching `f(5) = 25` is always safe. (2) Dead code elimination — if a referentially transparent function's return value is unused, the compiler can elide the call. (3) Common subexpression elimination — if `f(x)` appears twice with the same `x`, the compiler can compute it once. (4) Parallel evaluation — two referentially transparent expressions can evaluate in any order or simultaneously. React's reconciler leverages this: pure components with the same props will always render the same output, so React can skip re-rendering them (`React.memo` formalizes this as an explicit optimization).

---

**Q7: How does immutability relate to JavaScript's structural sharing (e.g., in Immutable.js or Immer)?**

Naive immutability with spread operators creates a full shallow copy on every update — O(n) time and space. For deeply nested state with large objects, this is expensive. Structural sharing is the solution: create a new root object that shares unchanged subtrees with the old object. Only the path from root to the changed node gets new objects; everything else shares references. Immutable.js uses persistent data structures (tries, hash-array mapped tries) to achieve O(log n) updates with structural sharing — a 10-layer trie needs to copy at most 10 nodes per update, not thousands. Immer uses a different approach: it lets you write mutating code on a draft proxy, records all mutations, and then applies them immutably with structural sharing. The result: readable code + efficient immutable updates. Both approaches are more memory-efficient than naive spread for large, frequently updated state.

---

**Q8: What is the practical difference between `map` and `flatMap`?**

`map` applies a function to each element and returns an array of the same length where each element is the result. `flatMap` applies a function that returns an array for each element, then flattens one level. Equivalent to `map` followed by `flat(1)`. Use `flatMap` when each input element produces zero, one, or multiple output elements: parsing lines of text into tokens, expanding categories into products, filtering and transforming simultaneously (return `[]` to skip, `[transformed]` to include). `[1,2,3].flatMap(x => x % 2 === 0 ? [x, x*10] : [])` → `[2, 20]` — one-pass filter + map + expansion. This is more efficient than chaining `.filter().map()` because it iterates once. `flatMap` is also the bind operation for the Array monad — it enables composable data pipelines where each step can produce multiple outputs or none.
