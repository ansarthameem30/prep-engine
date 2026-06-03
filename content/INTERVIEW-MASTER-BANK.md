# Interview Master Bank — 100 Q&A Pairs

> **Usage:** Spend the last 5 minutes of every session reading 5 questions aloud and answering from memory. Do not read the answers first. After your attempt, check your answer. Flag any you stumble on in `PROGRESS.md → Weak Areas`.
>
> This bank is calibrated for **mid-senior / senior full-stack roles** — answers go one level deeper than the surface.

---

## Table of Contents

1. [JavaScript Core (10 Q&A)](#1-javascript-core)
2. [React & Frontend (10 Q&A)](#2-react--frontend)
3. [Node.js & Express (10 Q&A)](#3-nodejs--express)
4. [MySQL & Databases (10 Q&A)](#4-mysql--databases)
5. [MongoDB (10 Q&A)](#5-mongodb)
6. [System Design (10 Q&A)](#6-system-design)
7. [AWS & Cloud (10 Q&A)](#7-aws--cloud)
8. [CI/CD & GitHub (10 Q&A)](#8-cicd--github)
9. [GenAI Engineering (10 Q&A)](#9-genai-engineering)
10. [Behavioral (10 Q&A with STAR)](#10-behavioral)

---

## 1. JavaScript Core

---

**Q1. Explain the JavaScript event loop in detail. What is the difference between the microtask queue and the macrotask queue, and which takes priority?**

**A:** The event loop is the mechanism that allows JavaScript — a single-threaded runtime — to handle asynchronous operations without blocking. The call stack executes synchronous code frame by frame. When async work completes (e.g., a timer fires, a fetch resolves), the corresponding callback is queued.

There are two queues:
- **Microtask queue**: Holds callbacks from `Promise.then/catch/finally`, `queueMicrotask()`, and `MutationObserver`. After every task completes, the event loop drains the **entire** microtask queue before moving to the next task. This means microtasks can starve the macrotask queue if they keep adding more microtasks.
- **Macrotask queue** (task queue): Holds callbacks from `setTimeout`, `setInterval`, `setImmediate` (Node.js), I/O callbacks, and UI rendering events.

**Priority:** Microtasks always run before the next macrotask. The order is: synchronous code → microtasks (drain completely) → one macrotask → microtasks again → render (browser) → repeat.

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
```

---

**Q2. What is a closure, and how can it cause memory leaks in production code?**

**A:** A closure is the combination of a function and the lexical environment in which it was defined. The function retains a reference to variables in its outer scope even after that outer function has returned.

```js
function createCounter() {
  let count = 0; // This variable is "closed over"
  return () => ++count;
}
const counter = createCounter();
counter(); // 1 — count is still alive
```

**Memory leaks from closures** occur when a closure retains a reference to a large object (DOM node, large array, entire module scope) longer than needed:

1. **Event listeners not removed:** A listener closing over a DOM node keeps the node in memory even after it is removed from the DOM. Fix: `removeEventListener` in cleanup.
2. **Timers not cleared:** `setInterval` callbacks that close over large state. Fix: `clearInterval` when component/service unmounts.
3. **Detached DOM references:** A closure holds a reference to a DOM element that has been removed from the tree. The element cannot be garbage collected.
4. **Module-level caches that grow unbounded:** A cache object in module scope that a closure adds to without eviction logic.

In Node.js, closures in long-lived event handlers (e.g., HTTP server request handlers) that close over the `req`/`res` objects are a common source of leaks if the handler is not cleaned up properly.

---

**Q3. Explain prototypal inheritance. What is the difference between `Object.create(proto)` and using ES6 `class extends`?**

**A:** Every JavaScript object has an internal `[[Prototype]]` link to another object (or `null`). When you access a property, the engine first looks on the object itself, then traverses the prototype chain until it finds the property or hits `null`.

`Object.create(proto)` creates a new object with `proto` as its direct `[[Prototype]]`. No constructor function is called. This is the "pure prototypal" approach.

```js
const animal = { breathe() { return 'breathing'; } };
const dog = Object.create(animal);
dog.bark = () => 'woof';
dog.breathe(); // 'breathing' — found on prototype
```

`class extends` is syntactic sugar over prototype chains. Under the hood, it:
1. Sets up the prototype chain between the child and parent.
2. Calls `super()` to invoke the parent constructor.
3. Creates the child's `prototype.constructor` correctly.

The key difference: `class` enforces the constructor pattern and `new` keyword. `Object.create` is more flexible for prototypal delegation patterns (e.g., OLOO — Objects Linked to Other Objects, advocated by Kyle Simpson). In practice, `class` is preferred for clarity and tooling support, but interviewers want you to know that classes do not introduce a new inheritance model — it is still prototype chains.

---

**Q4. What are the rules of `this` binding in JavaScript? When does an arrow function behave differently?**

**A:** `this` is determined at call time, not at definition time (except for arrow functions). There are four binding rules, applied in priority order:

1. **`new` binding:** When called with `new`, `this` is the newly created object.
2. **Explicit binding:** `call()`, `apply()`, `bind()` set `this` explicitly.
3. **Implicit binding:** When a function is called as a method of an object, `this` is that object. `obj.foo()` → `this` is `obj`.
4. **Default binding:** Plain function call in non-strict mode → `this` is the global object (`window`/`global`). In strict mode → `this` is `undefined`.

**Arrow functions** do not have their own `this`. They inherit `this` from the enclosing lexical scope at definition time. This is called **lexical `this`**.

```js
const obj = {
  name: 'Alice',
  regular: function() { return this.name; }, // 'Alice' — implicit binding
  arrow: () => this.name, // undefined — this is from outer scope (module/window)
};
```

A common interview pitfall: calling `obj.regular` as a callback (`setTimeout(obj.regular, 0)`) loses the implicit binding — `this` becomes `undefined` (strict) or `global`. Fix: `bind(obj)` or arrow wrapper.

---

**Q5. What is the difference between `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`? Give use cases for each.**

**A:**

| Method | Resolves when | Rejects when | Use case |
|---|---|---|---|
| `Promise.all(arr)` | ALL promises resolve | ANY promise rejects | Parallel independent operations where all results are needed. Fails fast. |
| `Promise.allSettled(arr)` | ALL promises settle (resolve OR reject) | Never rejects | Parallel operations where you need every result regardless of failures (batch processing, UI updates). |
| `Promise.race(arr)` | FIRST promise settles (either way) | First promise rejects | Timeout pattern: race a real promise against a `setTimeout` reject. |
| `Promise.any(arr)` | FIRST promise resolves | ALL promises reject (`AggregateError`) | Redundancy: try multiple sources, use whichever responds first successfully (e.g., multi-CDN resource loading). |

```js
// Timeout with Promise.race
const timeout = (ms) => new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), ms)
);
const result = await Promise.race([fetchData(), timeout(3000)]);
```

---

**Q6. Implement `debounce` from scratch without using Lodash. Explain when you would use debounce vs throttle.**

**A:**

```js
function debounce(fn, delay) {
  let timerId = null;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

**Debounce:** Waits until the user stops triggering an event for `delay` ms, then fires once. Good for: search input (fire API call after user stops typing), window resize handlers, form validation.

**Throttle:** Fires at most once per `delay` ms regardless of how often the event fires. Good for: scroll event handlers, mouse move tracking, button click protection, rate-limited API calls.

```js
function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
```

**Key difference:** Debounce delays and collapses. Throttle spaces out. If a user types for 5 seconds with debounce(500ms), the function fires once — after they stop. With throttle(500ms), it fires every 500ms while they type.

---

**Q7. Explain how ES6 `Proxy` and `Reflect` work. Give a practical example.**

**A:** `Proxy` wraps an object and intercepts fundamental operations on it (property access, assignment, function invocation, etc.) via "traps."

```js
const validator = {
  set(target, prop, value) {
    if (prop === 'age' && typeof value !== 'number') {
      throw new TypeError('Age must be a number');
    }
    return Reflect.set(target, prop, value); // delegate to default behavior
  },
  get(target, prop) {
    return prop in target ? target[prop] : `Property "${prop}" not found`;
  }
};

const user = new Proxy({}, validator);
user.age = 25; // OK
user.age = 'twenty'; // TypeError
user.name; // 'Property "name" not found'
```

`Reflect` provides the default implementations of the operations that `Proxy` intercepts. It is the idiomatic way to call the default behavior inside a trap. It also normalizes error handling (returns booleans instead of throwing).

**Practical uses:** Validation proxies, reactive state systems (Vue 3's reactivity system uses `Proxy`), mocking in tests, logging/observability wrappers, read-only objects.

---

**Q8. What is the difference between CommonJS (`require`) and ES Modules (`import/export`)? How does tree-shaking relate to this?**

**A:**

| Feature | CommonJS (CJS) | ES Modules (ESM) |
|---|---|---|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | **Dynamic, synchronous** | **Static, async** |
| Structure | Can be in conditionals | Always at top level |
| `this` at top level | `module.exports` object | `undefined` |
| Circular deps | Partially resolved at runtime | Different handling |
| Tree-shaking | Not possible | Possible (static analysis) |

**Tree-shaking** is dead code elimination performed by bundlers (Webpack, Rollup, esbuild). Because ESM `import`/`export` are **static** (resolved at parse time, not runtime), bundlers can statically analyze the dependency graph and exclude exported code that is never imported. With CJS, `require()` can be inside an `if` block, so the bundler cannot know what will or will not be used at build time — tree-shaking is impossible.

```js
// ESM — bundler knows exactly what is used
import { add } from './math.js'; // Only 'add' is included in the bundle
// 'subtract', 'multiply' in math.js are tree-shaken out
```

---

**Q9. Explain the Module design pattern and the Revealing Module pattern. What problem do they solve?**

**A:** The Module pattern (pre-ESM) uses an IIFE to create a private scope, exposing only what you choose via a returned object. This provides **encapsulation** in an environment (browser pre-bundler) where all scripts share the global scope.

```js
const Counter = (function () {
  let _count = 0; // private

  function _validate(n) { // private
    if (typeof n !== 'number') throw new Error('Not a number');
  }

  return {
    increment(n = 1) { _validate(n); _count += n; },
    decrement(n = 1) { _validate(n); _count -= n; },
    getCount() { return _count; },
  };
})();
```

**Revealing Module pattern** is a variation where all logic is defined privately, and the returned object only contains references to what should be public. This makes the public API declaration cleaner and all names consistent.

```js
const Counter = (function () {
  let _count = 0;
  const increment = () => ++_count;
  const getCount = () => _count;
  return { increment, getCount }; // reveal selectively
})();
```

With ESM, the module system provides this natively — you simply do not `export` what you want private. But understanding these patterns matters because they appear in older codebases and show understanding of scope and encapsulation.

---

**Q10. What is the Temporal Dead Zone (TDZ) and how does it differ from hoisting behavior of `var`?**

**A:** All variable declarations (`var`, `let`, `const`, `function`, `class`) are hoisted — the declaration is moved to the top of its scope during the creation phase. But the behavior differs:

- **`var`:** Hoisted and **initialized to `undefined`**. Accessible before declaration — returns `undefined`.
- **`let` / `const`:** Hoisted but **not initialized**. Accessing them before the declaration in source code throws a `ReferenceError`. The gap between the start of the block scope and the declaration line is the **Temporal Dead Zone**.
- **`function` declarations:** Fully hoisted — both declaration and definition. Callable before the line where it appears.

```js
console.log(a); // undefined — var hoisted + initialized
console.log(b); // ReferenceError — TDZ for let

var a = 1;
let b = 2;

console.log(greet()); // 'hi' — function declaration fully hoisted
function greet() { return 'hi'; }
```

TDZ is not just a gotcha — it is a design decision. It prevents a class of bugs where `var` allowed you to access a variable before you intended to set it, silently returning `undefined` instead of failing loudly.

---

## 2. React & Frontend

---

**Q11. Explain React's reconciliation algorithm. What role do `key` props play, and what happens when you use array indices as keys?**

**A:** Reconciliation is React's algorithm for determining what changed in the virtual DOM and applying minimal updates to the real DOM. When state or props change, React creates a new virtual DOM tree and diffs it against the previous one.

React's diffing heuristics (O(n) instead of O(n³)):
1. If root elements have different types, tear down the old tree and build a new one.
2. Elements of the same type — update attributes in place.
3. For lists, React uses `key` props to match old elements with new ones.

**Keys** allow React to track identity across renders. Without keys (or with wrong keys), React falls back to index-based matching, which causes:
- **Using index as keys:** When items are reordered or inserted at the beginning, index-keyed items get mismatched. React sees "item at index 0 is the same" and preserves its DOM state, even though it is a different item. This causes subtle bugs with controlled inputs (typed values appear in wrong fields), animations, and focus management.
- **Correct keys:** Use stable, unique identifiers (database IDs). React correctly maps each item's identity across re-renders.

```jsx
// Bad — inserting at start breaks input values
items.map((item, i) => <Input key={i} defaultValue={item.name} />)

// Good — identity is stable
items.map(item => <Input key={item.id} defaultValue={item.name} />)
```

---

**Q12. When does `React.memo` NOT improve performance? Explain with a concrete example.**

**A:** `React.memo` does a **shallow comparison** of props. It skips re-rendering if props are shallowly equal. It does NOT help (and adds slight overhead) when:

1. **Props are objects/arrays/functions created inline** — new reference on every parent render:
```jsx
// Parent re-renders → new `style` object each time → memo is bypassed
<MemoChild style={{ color: 'red' }} onClick={() => doSomething()} />
```
Fix: `useMemo` for objects, `useCallback` for functions.

2. **The component itself is cheap to render** — the cost of the shallow comparison exceeds the cost of re-rendering. `React.memo` is not free.

3. **Props change on almost every render anyway** — memo never finds a match, so you just added comparison overhead.

4. **The component has a `children` prop** — `children` is a new JSX object every render, memo is always bypassed unless you wrap `children` in `useMemo`.

**Rule of thumb:** Profile first with React DevTools Profiler. Add `memo` only where the profiler shows expensive re-renders with stable props.

---

**Q13. Explain the difference between `useEffect`, `useLayoutEffect`, and `useInsertionEffect`. When would you reach for `useLayoutEffect`?**

**A:**

| Hook | When it runs | Blocks paint? | Use case |
|---|---|---|---|
| `useEffect` | After React commits to DOM and browser has painted | No | Side effects: fetch data, set up subscriptions, analytics |
| `useLayoutEffect` | After React commits to DOM, **before** browser paint | Yes | DOM measurement + mutation that must happen synchronously before visual update |
| `useInsertionEffect` | Before any DOM mutations (for CSS-in-JS libraries) | Yes | CSS-in-JS library authors only (inject `<style>` tags) |

**`useLayoutEffect` use case:** When you need to read a DOM measurement (e.g., element dimensions) and immediately set state based on it without causing a visual flicker. If you use `useEffect`, the browser paints first → user sees the wrong state for one frame → then state updates → repaints. With `useLayoutEffect`, you mutate synchronously before paint.

```jsx
// Tooltip that positions itself above/below based on available space
useLayoutEffect(() => {
  const { bottom } = triggerRef.current.getBoundingClientRect();
  setPosition(bottom > window.innerHeight / 2 ? 'top' : 'bottom');
}, []);
```

**Warning:** `useLayoutEffect` blocks paint. Heavy computation inside it will delay the visual update, causing jank. Use sparingly.

---

**Q14. How does React's Fiber architecture improve over the original stack reconciler?**

**A:** The original "stack" reconciler processed the entire component tree synchronously in one call stack frame. This meant:
- Long renders could block the main thread for 100ms+, causing dropped frames and jank.
- There was no way to pause, abort, or prioritize rendering work.

**Fiber** (React 16+) is a complete rewrite of the reconciler. Key improvements:

1. **Incremental rendering:** Fiber represents each component as a "fiber node" (a plain object). React can render one fiber at a time, pause between fibers, and yield to the browser for input handling or painting.

2. **Priority scheduling:** Different updates have different priorities (user input = high priority, background data fetch = low priority). The scheduler can interrupt low-priority work to process high-priority updates first. This is the foundation of **Concurrent Mode**.

3. **Work phases:**
   - **Render phase** (reconciliation): Pure and interruptible. React builds the "work in progress" fiber tree.
   - **Commit phase**: Synchronous and non-interruptible. React applies DOM mutations. This is where `useLayoutEffect` runs.

4. **`useTransition` and `useDeferredValue`** are direct products of the Fiber scheduler — they allow marking updates as non-urgent, letting React deprioritize them.

---

**Q15. Explain how RTK Query differs from TanStack Query. When would you choose one over the other?**

**A:** Both handle server state (fetching, caching, revalidation) but come from different ecosystems and have different trade-offs:

| Dimension | RTK Query (Redux Toolkit) | TanStack Query |
|---|---|---|
| State location | Redux store (global, DevTools-inspectable) | Internal cache (no Redux) |
| Learning curve | Higher (requires Redux knowledge) | Lower |
| Mutations | `useMutation` + automatic cache invalidation | `useMutation` + manual or tag-based invalidation |
| Optimistic updates | Supported via `onQueryStarted` | Supported via `onMutate` |
| Offline support | Limited | First-class with `networkMode` |
| Query deduplication | Yes | Yes |
| Integration | Tight with Redux ecosystem (other slices, middleware) | Framework-agnostic (React, Vue, Solid, Svelte) |

**Choose RTK Query when:** Your app already uses Redux Toolkit for client state and you want server state visible in Redux DevTools alongside client state. Good for large enterprise apps with complex state interactions.

**Choose TanStack Query when:** You do not need or want Redux, want simpler setup, need advanced caching features (stale-while-revalidate, background refetch, `placeholderData`), or need framework portability. It is generally the right choice for greenfield React apps.

---

**Q16. How does the Context API cause unnecessary re-renders, and what are the patterns to mitigate this?**

**A:** Every consumer of a Context re-renders whenever the context **value** changes — even if the consuming component only uses part of the value. React Context does not support granular subscriptions.

```jsx
// Every component consuming UserContext re-renders when ANY field in user changes
const UserContext = createContext();
<UserContext.Provider value={{ user, theme, locale }}>
```

**Mitigation patterns:**

1. **Split contexts by update frequency:** Separate `UserContext`, `ThemeContext`, `LocaleContext`. A component consuming only `ThemeContext` does not re-render when `user` changes.

2. **Memoize the context value:**
```jsx
const value = useMemo(() => ({ user, updateUser }), [user]);
<UserContext.Provider value={value}>
```
Prevents creating a new object reference on every parent render. But still triggers all consumers when `user` changes.

3. **Context + `useReducer`:** Separate the state object (changes often) from the dispatch function (stable reference) into two contexts. Components that only dispatch actions subscribe to `DispatchContext` and never re-render on state changes.

4. **Use `use-context-selector`** (third-party): Allows subscribing to a specific slice of context value, similar to Redux's `useSelector`.

5. **Consider Zustand/Jotai for granular subscriptions** if context performance becomes a real problem.

---

**Q17. Describe your approach to testing a React component that makes an API call. What tools do you use and why?**

**A:** The goal is to test the component's behavior from the user's perspective, not its implementation details. The toolchain: **Jest** (test runner + assertions), **React Testing Library (RTL)** (render + user interactions), **MSW (Mock Service Worker)** (API mocking at network level).

Why MSW over mocking `fetch` or `axios` directly: MSW intercepts at the `Service Worker` level (browser) or `node:http` level (Jest/Node.js), so your actual API client code runs unchanged. You test the full stack from component to network boundary.

```js
// msw handler
rest.get('/api/users', (req, res, ctx) =>
  res(ctx.json([{ id: 1, name: 'Alice' }]))
);

// test
it('renders users after fetch', async () => {
  render(<UserList />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  const user = await screen.findByText('Alice'); // waits for async
  expect(user).toBeInTheDocument();
});
```

**Query priority (RTL philosophy):** `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`. Prefer queries that reflect how users interact with the UI (accessible roles).

**Test error states and loading states** in addition to the happy path. Test that the correct API was called with the correct parameters using `msw`'s request inspection.

---

**Q18. What is the Compound Component pattern? Implement a simple `<Select>` component using it.**

**A:** Compound Components is a pattern where a parent component implicitly shares state with its children via Context, allowing consumers to compose the UI structure while the logic is handled internally.

```jsx
const SelectContext = createContext();

function Select({ children, onChange }) {
  const [selected, setSelected] = useState(null);
  const select = (value) => { setSelected(value); onChange?.(value); };
  return (
    <SelectContext.Provider value={{ selected, select }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

function Option({ value, children }) {
  const { selected, select } = useContext(SelectContext);
  return (
    <div
      className={`option ${selected === value ? 'active' : ''}`}
      onClick={() => select(value)}
    >
      {children}
    </div>
  );
}

// Attach sub-components
Select.Option = Option;

// Usage — consumer controls the structure
<Select onChange={console.log}>
  <Select.Option value="js">JavaScript</Select.Option>
  <Select.Option value="ts">TypeScript</Select.Option>
</Select>
```

**Benefits:** Consumer controls the markup structure. Parent controls the logic. No prop drilling. Easy to add new sub-components without changing the parent API. This is how `<select>/<option>`, `<table>/<tr>/<td>`, and component libraries like Radix UI work.

---

**Q19. Explain React's `Suspense` and `lazy` loading. How do Error Boundaries interact with Suspense?**

**A:** `React.lazy` enables **code splitting** at the component level. The component's code is only loaded when the component is first rendered, reducing the initial bundle size.

```jsx
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart />
    </Suspense>
  );
}
```

`Suspense` catches promises thrown during rendering (React's internal mechanism for async rendering). When a lazy component is not yet loaded, it throws a Promise. The nearest `Suspense` boundary catches it and renders the `fallback` until the Promise resolves.

**Error Boundaries + Suspense:** Error Boundaries catch runtime errors (thrown Errors), while Suspense catches "pending" states (thrown Promises). They serve different purposes but compose together:

```jsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Spinner />}>
    <HeavyChart /> {/* shows Spinner while loading, ErrorMessage if import fails */}
  </Suspense>
</ErrorBoundary>
```

If the dynamic import itself fails (network error), the Promise rejects, and React re-throws the error, which the Error Boundary catches.

With **React 18 Concurrent features**, Suspense works with `use()` hook for data fetching, not just code splitting. `useTransition` can mark a navigation as a transition, keeping the old UI interactive while the new Suspense content loads.

---

**Q20. How would you implement a virtualized list from scratch? What is the core algorithm?**

**A:** Virtualization renders only the visible items plus a small buffer, instead of all items. For a list of 10,000 items, only ~20 DOM nodes exist at any time.

**Core algorithm:**
1. Calculate `scrollTop` from the container's scroll position.
2. Determine `startIndex` = `Math.floor(scrollTop / itemHeight)`.
3. Determine `endIndex` = `startIndex + Math.ceil(containerHeight / itemHeight) + buffer`.
4. Render only items from `startIndex` to `endIndex`.
5. Position each item with `position: absolute; top: index * itemHeight`.
6. Set the container's inner div height to `totalItems * itemHeight` to maintain correct scrollbar behavior.

```jsx
function VirtualList({ items, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  const buffer = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + buffer
  );
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
         onScroll={e => setScrollTop(e.target.scrollTop)}>
      <div style={{ height: items.length * itemHeight }}>
        {visibleItems.map((item, i) => (
          <div key={item.id}
               style={{ position: 'absolute', top: (startIndex + i) * itemHeight, height: itemHeight }}>
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

In production, use `react-window` (fixed size) or `react-virtual` (TanStack Virtual, supports variable sizes). Variable-height virtualization requires maintaining a position cache and using a binary search to find the start index.

---

## 3. Node.js & Express

---

**Q21. Describe the phases of the Node.js event loop in order. What runs in each phase?**

**A:** Node.js's event loop is implemented by libuv. Each "tick" processes one phase before moving to the next.

1. **Timers:** Executes callbacks from `setTimeout()` and `setInterval()` whose threshold has passed.
2. **Pending callbacks:** Executes I/O callbacks deferred from the previous cycle (e.g., TCP errors).
3. **Idle, prepare:** Internal use only (libuv internals).
4. **Poll:** Retrieves new I/O events. Blocks here if the queue is empty and no timers are pending (waiting for I/O). Executes I/O callbacks.
5. **Check:** Executes `setImmediate()` callbacks. Always runs after the poll phase.
6. **Close callbacks:** Executes close event callbacks (e.g., `socket.on('close', ...)`).

**Special queues that run between phases:**
- `process.nextTick()` callbacks run between **every** phase transition — before the event loop moves to the next phase. Higher priority than Promises.
- `Promise.then()` microtasks run after `nextTick` queue is drained, before the next event loop phase.

```js
setImmediate(() => console.log('setImmediate'));
setTimeout(() => console.log('setTimeout'), 0);
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('Promise'));

// Output: nextTick → Promise → setTimeout OR setImmediate (order not guaranteed for same-tick timers)
```

---

**Q22. What is backpressure in Node.js streams and how do you handle it?**

**A:** Backpressure occurs when a writable stream cannot process data as fast as the readable stream produces it. Without backpressure handling, data accumulates in memory, causing potential OOM (out of memory) crashes.

Every writable stream has a `highWaterMark` — a buffer size threshold. When you call `writable.write(data)`, it returns:
- `true`: Buffer is below `highWaterMark`. Safe to continue writing.
- `false`: Buffer has exceeded `highWaterMark`. **Stop writing** and wait for the `'drain'` event before writing more.

**Manual handling:**
```js
function pump(readable, writable) {
  readable.on('data', (chunk) => {
    const canContinue = writable.write(chunk);
    if (!canContinue) {
      readable.pause(); // backpressure: pause the source
      writable.once('drain', () => readable.resume()); // resume when drained
    }
  });
  readable.on('end', () => writable.end());
}
```

**Using `pipe()`:** `readable.pipe(writable)` handles backpressure automatically. The `pipeline()` utility (Node.js streams/promises) is preferred over `pipe()` because it properly handles errors and cleanup for all streams in the chain:

```js
const { pipeline } = require('node:stream/promises');
await pipeline(
  fs.createReadStream('input.csv'),
  new TransformCSV(),
  fs.createWriteStream('output.json')
);
```

---

**Q23. How does Express.js handle errors? What is the signature of an error-handling middleware and why does it have 4 parameters?**

**A:** Express's error-handling middleware is identified by its **4-parameter signature**: `(err, req, res, next)`. Express checks function arity (`.length` property) to distinguish error handlers from regular middleware. If you define a function with only 3 parameters, Express never passes it errors.

```js
// Regular middleware
app.use((req, res, next) => { /* ... */ });

// Error-handling middleware — must be registered LAST
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      code: err.code,
    }
  });
});
```

**Passing errors to the error handler:** Call `next(err)` with any truthy argument. For async routes, errors thrown in `async` functions must be caught and passed to `next()`, or use a wrapper:

```js
// Express 5 handles async errors natively
// Express 4 — wrapper pattern
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id); // if throws, goes to error handler
  res.json(user);
}));
```

---

**Q24. What is the `cluster` module and how does it relate to Node.js's single-threaded nature? When would you use Worker Threads instead?**

**A:** Node.js runs JavaScript in a single thread. To utilize multi-core CPUs, the `cluster` module forks multiple processes, each running the same server code on the same port (using OS-level socket sharing).

```js
import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) cluster.fork();
  cluster.on('exit', (worker) => cluster.fork()); // auto-restart
} else {
  // Each worker runs the server
  app.listen(3000);
}
```

**Cluster vs Worker Threads:**

| | `cluster` | `worker_threads` |
|---|---|---|
| Isolation | Separate processes (separate memory) | Shared memory (`SharedArrayBuffer`) |
| Communication | IPC (slow, serialization) | `MessageChannel` + `SharedArrayBuffer` (fast) |
| Use case | Scale HTTP servers across CPUs | CPU-bound tasks within one server (image processing, crypto, ML inference) |
| Failure isolation | Worker crash does not affect master | Thread crash can affect the process |

**Use Worker Threads for:** CPU-intensive synchronous operations that would otherwise block the event loop — image resizing, video transcoding, large data parsing, ML model inference. The key advantage is shared memory without serialization overhead.

---

**Q25. Explain JWT structure, the refresh token rotation pattern, and how to handle token revocation.**

**A:** A JWT is a Base64URL-encoded string in three dot-separated parts: `header.payload.signature`.

- **Header:** Algorithm (`HS256`/`RS256`) and type.
- **Payload:** Claims — `sub` (subject/user ID), `iat` (issued at), `exp` (expiry), custom claims.
- **Signature:** `HMACSHA256(base64(header) + '.' + base64(payload), secret)`. Validates integrity.

**Refresh token rotation:** Access tokens are short-lived (15 min). Refresh tokens are long-lived (7 days) and stored in `httpOnly` cookies (not accessible to JS, prevents XSS theft). On access token expiry:

1. Client sends refresh token to `/auth/refresh`.
2. Server validates refresh token, checks it against a DB allowlist.
3. Server issues **new** access token AND a **new** refresh token (rotation).
4. Old refresh token is **immediately invalidated** in DB.
5. If the old refresh token is used again (replay attack), invalidate the entire token family (all refresh tokens for that user) — this detects token theft.

**Token revocation challenges:** JWTs are stateless. A server cannot invalidate an issued JWT before its expiry without a blocklist. Strategies:
- Short access token TTL (15 min) — small revocation window.
- Token blocklist in Redis — check on every request. O(1) lookup, TTL-managed.
- "Token version" in DB — increment on logout/password change; compare `jti` or `version` claim on each request.

---

**Q26. Design a production-grade REST API rate limiter in Node.js/Express.**

**A:** Rate limiting prevents API abuse, enforces fair use, and protects against DDoS. A production implementation requires:

**Algorithm choice:**
- **Fixed window:** Simple but allows burst at window boundaries (100 req/min means 200 req in 2 seconds spanning a boundary).
- **Sliding window log:** Accurate but memory-heavy (stores timestamp of every request).
- **Token bucket / Sliding window counter:** Best balance — allows controlled bursting within limits.

**Redis-backed sliding window (production approach):**

```js
import { createClient } from 'redis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 100,       // requests
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block for 60s on limit exceeded
});

app.use(async (req, res, next) => {
  try {
    const key = req.user?.id || req.ip; // per-user if auth, per-IP if not
    await limiter.consume(key);
    next();
  } catch (rejRes) {
    res.set('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
    res.set('X-RateLimit-Limit', 100);
    res.set('X-RateLimit-Remaining', 0);
    res.status(429).json({ error: 'Too Many Requests' });
  }
});
```

**Production considerations:** Different limits for different endpoints (auth = 10/min, public API = 1000/min), per-tenant limits in SaaS, grace limits for trusted IPs, monitoring and alerting on limit hits, returning standard `Retry-After` and `X-RateLimit-*` headers.

---

**Q27. How would you implement structured logging in a Node.js application? What information should every log entry contain?**

**A:** Structured logging means every log entry is a machine-parseable JSON object rather than a plain string. This enables filtering, aggregation, and alerting in log management systems (ELK, Datadog, CloudWatch Logs Insights).

**Every production log entry should include:**

```json
{
  "timestamp": "2026-06-03T10:30:00.000Z",
  "level": "info",
  "message": "HTTP request completed",
  "requestId": "req-abc-123",      // for distributed tracing
  "userId": "usr-456",             // for user-scoped debugging
  "method": "GET",
  "path": "/api/users/456",
  "statusCode": 200,
  "durationMs": 45,
  "service": "user-service",
  "environment": "production",
  "version": "2.1.0"
}
```

**Implementation with Pino (fastest Node.js logger):**

```js
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Request-scoped logger with correlation ID (use with AsyncLocalStorage)
app.use((req, res, next) => {
  req.log = logger.child({ requestId: crypto.randomUUID() });
  next();
});

// Automatic request logging with pino-http
import pinoHttp from 'pino-http';
app.use(pinoHttp({ logger }));
```

**Log levels:** ERROR (system errors, alert-worthy) → WARN (degraded state, retry loops) → INFO (normal operations, request lifecycle) → DEBUG (detailed debugging, never in production) → TRACE (very verbose).

---

**Q28. What are the different Node.js `require` resolution strategies and what is the module cache?**

**A:** When `require('x')` is called, Node.js resolves `x` using this algorithm:

1. **Core modules** (`path`, `fs`, `http`): Returned immediately, no file system access.
2. **File paths** (`./`, `../`, `/`): Resolved relative to the current file. Node.js tries: exact path → `.js` → `.json` → `.node` → `index.js` → `index.json`.
3. **`node_modules`**: Looks in `./node_modules/x`, then `../node_modules/x`, traversing up to the file system root. Within a package, follows `package.json`'s `main` field, then `index.js`.

**Module cache:** After a module is loaded for the first time, Node.js caches the **exports object** in `require.cache` (keyed by resolved file path). Subsequent `require()` calls for the same path return the **cached exports object** — the module code does not re-execute.

**Implications:**
- Singleton pattern: A module-level variable (e.g., a DB connection pool) is instantiated once and shared across all importers.
- Circular dependencies: Node.js handles them by returning a **partial** (incomplete) exports object to break the cycle. This can lead to `undefined` imports if the circular dependency is not carefully managed.
- **Cache clearing** (`delete require.cache[require.resolve('./module')]`): Used in hot-reloading and testing to force re-evaluation. In production, avoid this — it breaks the singleton pattern.

---

**Q29. Explain the N+1 query problem in the context of a Node.js + SQL application. How do you solve it?**

**A:** The N+1 problem occurs when you fetch a list of N resources, then make 1 additional query per resource to fetch related data — resulting in N+1 total queries instead of a few efficient queries.

```js
// N+1 problem: 1 query for users + 1 query per user for their posts
const users = await db.query('SELECT * FROM users LIMIT 10'); // 1 query
const result = await Promise.all(
  users.map(async (user) => ({
    ...user,
    posts: await db.query('SELECT * FROM posts WHERE user_id = ?', [user.id]) // 10 queries
  }))
);
// Total: 11 queries
```

**Solutions:**

1. **JOIN query:** Fetch everything in one query.
```sql
SELECT u.*, p.* FROM users u LEFT JOIN posts p ON p.user_id = u.id LIMIT 10;
```
Downside: Duplicates user data per post row. Handle with grouping in application code.

2. **Batch query (DataLoader pattern):**
```js
// Collect all user IDs, then fetch all posts in one query
const userIds = users.map(u => u.id); // [1, 2, 3, ...]
const posts = await db.query('SELECT * FROM posts WHERE user_id IN (?)', [userIds]);
// Group posts by user_id in memory
const postsByUser = groupBy(posts, 'user_id');
```

3. **DataLoader library (Facebook, for GraphQL):** Batches and deduplicates all DB calls made within a single event loop tick, even across deeply nested resolvers.

4. **ORM eager loading:** Sequelize's `include`, TypeORM's `relations` option generate proper JOIN or batch queries.

---

**Q30. How do you gracefully shut down a Node.js HTTP server? What is the risk of not doing this in a Kubernetes environment?**

**A:** Graceful shutdown means:
1. Stop accepting new connections (call `server.close()`).
2. Let in-flight requests complete.
3. Close DB connections, flush logs, clean up resources.
4. Exit with code 0.

```js
const server = app.listen(3000);
let isShuttingDown = false;

// Health check returns 503 during shutdown (Kubernetes readiness probe)
app.get('/health', (req, res) =>
  res.status(isShuttingDown ? 503 : 200).json({ status: isShuttingDown ? 'shutting_down' : 'ok' })
);

async function gracefulShutdown(signal) {
  isShuttingDown = true;
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    await db.pool.end();    // close DB connections
    await redisClient.quit(); // close Redis
    process.exit(0);
  });
  // Force exit after timeout (requests taking too long)
  setTimeout(() => process.exit(1), 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

**Kubernetes risk without graceful shutdown:** When Kubernetes rolls out a new deployment, it sends `SIGTERM` to the old pod and waits `terminationGracePeriodSeconds` (default 30s). If the app exits immediately on `SIGTERM` (or ignores it), all in-flight HTTP requests are dropped — users get connection errors. Additionally, if the readiness probe still passes during shutdown, the load balancer keeps routing traffic to the dying pod. The health check returning 503 triggers Kubernetes to remove the pod from the service endpoints immediately.

---

## 4. MySQL & Databases

---

**Q31. Explain the difference between a clustered index and a non-clustered index in MySQL InnoDB.**

**A:** In InnoDB, **every table has exactly one clustered index** — it is the physical ordering of the table's rows on disk.

- **Clustered index:** By default, the primary key. Row data is stored IN the index leaf nodes. There is no separate "table" — the clustered index IS the table. Range scans on the PK are extremely fast because data is physically ordered.

- **Non-clustered (secondary) index:** A separate B-tree structure where each leaf node stores the indexed column value(s) + the primary key value (not the row data). To read the full row, InnoDB does a "double dip" — finds the PK in the secondary index, then looks up the row in the clustered index.

**Performance implications:**
- Choosing a UUID as a primary key causes random inserts into the clustered index (UUIDs are not sequential), leading to page splits and fragmentation. Auto-increment integer PKs insert at the end of the B-tree.
- A **covering index** is a secondary index that includes all columns needed by a query, so InnoDB never needs to look up the clustered index. This eliminates the double dip:
```sql
-- Query: SELECT name, email FROM users WHERE email = 'x@y.com'
-- Covering index: CREATE INDEX idx_email_name ON users(email, name);
-- EXPLAIN shows: Using index (no table lookup needed)
```

---

**Q32. What are window functions in MySQL? Write a query using `RANK()`, `LAG()`, and a running total.**

**A:** Window functions perform calculations across a set of rows related to the current row without collapsing rows (unlike `GROUP BY` which produces one row per group).

```sql
-- Sales data: get rank by revenue per department, previous month revenue, and running total
SELECT
  employee_id,
  department,
  month,
  revenue,
  RANK() OVER (PARTITION BY department ORDER BY revenue DESC) AS dept_rank,
  LAG(revenue, 1, 0) OVER (PARTITION BY employee_id ORDER BY month) AS prev_month_revenue,
  revenue - LAG(revenue, 1, 0) OVER (PARTITION BY employee_id ORDER BY month) AS mom_change,
  SUM(revenue) OVER (
    PARTITION BY department
    ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM sales
WHERE year = 2026
ORDER BY department, month;
```

Key window function concepts:
- `PARTITION BY`: Divides rows into groups (like a per-group scope for the window).
- `ORDER BY` within `OVER()`: Defines the order for functions like `RANK`, `LAG`, `LEAD`, running totals.
- `ROWS BETWEEN`: Defines the window frame (e.g., `UNBOUNDED PRECEDING AND CURRENT ROW` for running totals).
- `RANK()` vs `DENSE_RANK()`: `RANK()` skips numbers after ties (1,1,3); `DENSE_RANK()` does not (1,1,2).

---

**Q33. Explain transaction isolation levels. What is a phantom read and which isolation level prevents it?**

**A:** Isolation levels define how concurrent transactions see each other's changes.

| Isolation Level | Dirty Read | Non-repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | Prevented | Possible | Possible |
| REPEATABLE READ | Prevented | Prevented | Possible* |
| SERIALIZABLE | Prevented | Prevented | Prevented |

*InnoDB's REPEATABLE READ actually prevents phantom reads via gap locks — a MySQL-specific enhancement beyond the SQL standard.

- **Dirty read:** Reading data written by an uncommitted transaction. The transaction might roll back, making your read invalid.
- **Non-repeatable read:** Reading the same row twice in one transaction gives different values (another transaction committed between your reads).
- **Phantom read:** Re-running the same range query within a transaction returns different rows (another transaction inserted/deleted rows matching the range and committed).

**MySQL InnoDB default is REPEATABLE READ.** It uses **MVCC (Multi-Version Concurrency Control)** — each transaction sees a consistent snapshot from its start time. Gap locks prevent phantom reads on range queries.

**Practical advice:** For financial transactions requiring strict consistency, use `SERIALIZABLE` or explicit `SELECT ... FOR UPDATE` (row locking) within `REPEATABLE READ`.

---

**Q34. Write a CTE-based query to find the top 3 products by revenue in each category.**

**A:**

```sql
WITH ranked_products AS (
  SELECT
    p.product_id,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    DENSE_RANK() OVER (
      PARTITION BY p.category_id
      ORDER BY SUM(oi.quantity * oi.unit_price) DESC
    ) AS revenue_rank
  FROM order_items oi
  JOIN products p ON p.product_id = oi.product_id
  JOIN categories c ON c.category_id = p.category_id
  JOIN orders o ON o.order_id = oi.order_id
  WHERE o.status = 'completed'
    AND o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
  GROUP BY p.product_id, p.name, c.name, p.category_id
)
SELECT
  category_name,
  product_name,
  total_revenue,
  revenue_rank
FROM ranked_products
WHERE revenue_rank <= 3
ORDER BY category_name, revenue_rank;
```

**Why CTE over subquery:** CTEs are named, reusable, and readable. This specific case requires computing `SUM` and `DENSE_RANK` over it, which needs two passes — the CTE cleanly separates the aggregation from the filtering. The equivalent subquery would nest a `FROM (SELECT ...)` which is harder to read and debug.

---

**Q35. How do you identify and fix a slow query in MySQL? Walk through your process.**

**A:** 

**Step 1: Identify slow queries**
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- log queries taking > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';
-- Or check performance_schema.events_statements_summary_by_digest
```

**Step 2: EXPLAIN the query**
```sql
EXPLAIN SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id;
```

Key `EXPLAIN` output columns:
- `type`: `ALL` (full table scan — bad) vs `ref`/`range`/`const` (index scans — good).
- `key`: Which index was used (`NULL` means no index).
- `rows`: Estimated rows examined.
- `Extra`: `Using filesort` (sort without index — expensive), `Using temporary` (temp table — expensive), `Using index` (covering index — great).

**Step 3: Fix**
1. Add index on `users.created_at` to avoid full scan on the WHERE clause.
2. Add index on `orders.user_id` (FK should always be indexed) for the JOIN.
3. Consider a composite index if filtering on multiple columns.
4. Rewrite as a subquery if GROUP BY is causing full scans.
5. Use `EXPLAIN ANALYZE` (MySQL 8.0.18+) for actual execution stats, not just estimates.

---

## 5. MongoDB

---

**Q36. Explain the difference between embedding and referencing in MongoDB schema design. When do you choose each?**

**A:**

**Embedding:** Store related data as a nested subdocument or array within the parent document.

```json
// Embedded — one document, one read
{
  "_id": "order-123",
  "userId": "user-456",
  "items": [
    { "productId": "prod-1", "quantity": 2, "price": 29.99 },
    { "productId": "prod-2", "quantity": 1, "price": 49.99 }
  ],
  "shippingAddress": { "street": "123 Main St", "city": "Austin" }
}
```

**Referencing:** Store the related document's `_id` and fetch it separately (manual JOIN using `$lookup`).

**Decision matrix:**

| Scenario | Choose Embedding | Choose Referencing |
|---|---|---|
| Read pattern | Usually read together | Read separately or infrequently together |
| Update pattern | Updated together | Updated independently |
| Data size | Small, bounded (< 100 items) | Large, unbounded (array could grow infinitely) |
| Duplication | Some duplication acceptable | Normalization required |
| Access latency | Lowest latency needed | Extra lookup acceptable |

**MongoDB's 16MB document limit** is a hard constraint — arrays that grow unboundedly (e.g., all comments on a viral post) must use referencing. The "extended reference pattern" (embed the most-accessed fields + reference for the rest) balances performance and document size.

---

**Q37. Write a MongoDB aggregation pipeline to find the monthly revenue for each product category in the last 6 months.**

**A:**

```js
db.orders.aggregate([
  // Stage 1: Filter to last 6 months
  {
    $match: {
      status: 'completed',
      createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
    }
  },
  // Stage 2: Unwind line items array
  { $unwind: '$items' },
  // Stage 3: Lookup product details
  {
    $lookup: {
      from: 'products',
      localField: 'items.productId',
      foreignField: '_id',
      as: 'productDetails'
    }
  },
  { $unwind: '$productDetails' },
  // Stage 4: Compute revenue per line item and extract month/year
  {
    $project: {
      category: '$productDetails.category',
      lineRevenue: { $multiply: ['$items.quantity', '$items.unitPrice'] },
      yearMonth: {
        $dateToString: { format: '%Y-%m', date: '$createdAt' }
      }
    }
  },
  // Stage 5: Group by category + month
  {
    $group: {
      _id: { category: '$category', yearMonth: '$yearMonth' },
      totalRevenue: { $sum: '$lineRevenue' },
      orderCount: { $sum: 1 }
    }
  },
  // Stage 6: Sort
  { $sort: { '_id.yearMonth': 1, totalRevenue: -1 } },
  // Stage 7: Reshape output
  {
    $project: {
      _id: 0,
      category: '$_id.category',
      month: '$_id.yearMonth',
      totalRevenue: { $round: ['$totalRevenue', 2] },
      orderCount: 1
    }
  }
]);
```

---

**Q38. What is the MongoDB oplog? How does it relate to replication and change streams?**

**A:** The **oplog** (operations log) is a special capped collection in the `local` database on every MongoDB replica set member. It is the replication log — every write operation that modifies data is recorded in the oplog as an idempotent operation.

**Replication flow:**
1. The **primary** member accepts writes and records them in its oplog.
2. **Secondary** members continuously poll the primary's oplog (or a chain of secondaries) and apply operations to replicate data.
3. Each oplog entry has a timestamp-based `ts` field and an `op` field (`i`=insert, `u`=update, `d`=delete).

**Change Streams** (MongoDB 3.6+) are a high-level API built on top of the oplog. They allow applications to subscribe to real-time change notifications without polling:

```js
const changeStream = db.collection('orders').watch([
  { $match: { 'fullDocument.status': 'completed', operationType: 'update' } }
]);

changeStream.on('change', (change) => {
  // Triggered for every update to an order that results in status=completed
  processCompletedOrder(change.fullDocument);
});
```

**Change streams vs direct oplog tailing:** Change streams are resumable (using a `resumeToken`), respect read concern, work across sharded clusters, and provide a stable document-level view. Direct oplog access is lower-level, oplog-format-specific, and generally not recommended for application code.

---

**Q39. Explain MongoDB's WiredTiger storage engine. What is document-level locking and why does it matter?**

**A:** WiredTiger (default since MongoDB 3.2) is a high-performance storage engine with these key characteristics:

1. **Document-level concurrency control:** WiredTiger uses optimistic concurrency at the document level. Multiple writers can concurrently modify **different documents** in the same collection without blocking each other. The old MMAPv1 engine locked at the collection level (one write at a time per collection) — a significant throughput bottleneck.

2. **MVCC (Multi-Version Concurrency Control):** Readers never block writers and writers never block readers. Each reader sees a consistent snapshot at the transaction start time. This is critical for replica set secondaries applying oplog entries while serving reads.

3. **Compression:** WiredTiger compresses data (Snappy by default, Zlib optional) and indexes on disk, reducing storage by ~50–80% compared to uncompressed. There is a CPU cost for decompression on reads.

4. **Block cache:** WiredTiger maintains its own cache (default: 50% of RAM - 1GB). The OS also caches recently read pages. MongoDB's memory usage typically reflects both caches.

**Why document-level locking matters in interviews:** If someone asks about MongoDB's write performance or handling high-concurrency workloads, the answer is: document-level locking means you are not serialized on collection-level locks. Multi-document transactions (MongoDB 4.0+) do introduce collection-level locking for cross-document atomicity, which is a trade-off to be aware of.

---

**Q40. How do you model a many-to-many relationship in MongoDB? Give an example with users and roles.**

**A:** MongoDB does not have native JOINs, so many-to-many can be modeled in several ways depending on access patterns:

**Pattern 1 — Array of references in both collections (bidirectional referencing):**
```json
// users collection
{ "_id": "user-1", "name": "Alice", "roleIds": ["role-admin", "role-editor"] }

// roles collection
{ "_id": "role-admin", "name": "Admin", "permissions": ["read", "write", "delete"] }
```

Fetch user with roles: `$lookup` from users into roles on `roleIds`.

**Pattern 2 — Junction collection (when the relationship has attributes):**
```json
// user_roles collection (join collection)
{
  "_id": "ur-1",
  "userId": "user-1",
  "roleId": "role-admin",
  "assignedAt": "2026-01-15",
  "assignedBy": "user-admin",
  "expiresAt": null
}
```

Use this when the relationship itself has data (assigned date, expiry, context-specific permissions).

**Pattern 3 — Embed roles directly in the user document:**
```json
{ "_id": "user-1", "roles": [{ "roleId": "role-admin", "name": "Admin", "permissions": [...] }] }
```

Best if roles are small, rarely change, and the primary access is "get user with their roles." Downside: updating a role name requires updating every user document containing that role.

**Decision rule:** If you read the relationship data together > 80% of the time, embed. If roles are frequently updated independently or the user document would grow too large, reference.

---

## 6. System Design

---

**Q41. Walk me through how you would design a URL shortener like bit.ly.**

**A:**

**Requirements clarification:**
- Read-heavy (100:1 read:write). 100M URLs created/day, 10B redirects/day.
- Short URL must be unique, ~7 characters.
- URLs should never be reused (even after deletion).
- Latency: redirect < 10ms P99.
- Availability: 99.99%.

**API:**
- `POST /shorten { longUrl, customAlias?, ttl? }` → `{ shortUrl }`
- `GET /{code}` → `302 Redirect` to long URL

**Short code generation:** Base62 encoding of a 64-bit ID. 7 characters in base62 = 62^7 = 3.5 trillion unique URLs. Use a distributed ID generator (Snowflake) to generate monotonically increasing IDs, then base62-encode.

**Database:** Write: relational DB (PostgreSQL) or Cassandra for write scalability. Schema: `code (PK), long_url, created_at, user_id, hits, expires_at`.

**Caching:** Redis (LRU, 100GB cache covers ~20% of URLs which receive ~80% of traffic). Cache key: `short_code` → `long_url`. Cache miss → DB → update cache.

**Redirect flow:**
1. User hits `https://bit.ly/abc1234`
2. Load balancer → App server
3. App checks Redis cache for `abc1234`
4. Cache hit (99%+): Return `302 Location: <long_url>`
5. Cache miss: Query DB, populate cache, return `302`

**Scaling:**
- Multiple app server replicas behind a load balancer
- DB read replicas for redirect lookups
- Geographically distributed Redis (Redis Cluster or Redis Geo-replication)
- Analytics (click tracking) written asynchronously via Kafka to avoid impacting redirect latency

---

**Q42. Explain the CAP theorem. Given a real database, explain which of C, A, and P it sacrifices.**

**A:** The CAP theorem states that a distributed system can guarantee at most **two** of three properties simultaneously during a network partition:

- **Consistency (C):** Every read receives the most recent write or an error. All nodes see the same data at the same time.
- **Availability (A):** Every request receives a response (not an error), though it may not be the most recent data.
- **Partition Tolerance (P):** The system continues to function even if network partitions split nodes.

**P is not optional in practice** — network partitions happen (cables fail, datacenters lose connectivity). So the real choice is between C and A **during** a partition:

| Database | CAP Choice | Behavior during partition |
|---|---|---|
| **PostgreSQL** (single node) | CA | Not partition-tolerant by design (single node) |
| **PostgreSQL** (with synchronous replicas) | CP | Stops accepting writes if it cannot confirm replication |
| **Cassandra** | AP | Continues serving reads/writes from any replica; may return stale data |
| **MongoDB** (replica set) | CP | Primary steps down if quorum lost; reads become unavailable |
| **DynamoDB** (eventual consistency) | AP | Serves requests from any region; eventual consistency |
| **DynamoDB** (strong consistency) | CP | Sacrifices availability for strong reads |

**PACELC extension:** Even when there is no partition (the normal case), systems face a trade-off between **Latency (L)** and **Consistency (C)**. Cassandra is PA/EL (available during partition, low latency normally). DynamoDB with strong reads is PC/EC.

---

**Q43. How does consistent hashing work, and why is it used in distributed caches?**

**A:** In a naive hash-based distribution, if you have N servers and route by `hash(key) % N`, adding or removing a server changes N, causing nearly **all keys** to remap to different servers — a cache stampede.

**Consistent hashing** maps both keys and servers onto a conceptual ring (0 to 2^32). Each server is placed on the ring at `hash(serverIP)`. To find which server handles a key: hash the key, find its position on the ring, walk clockwise to the nearest server.

**Adding a server:** Only keys that fall between the new server and its predecessor need to be remapped — approximately K/N keys (where K = number of keys, N = number of servers).

**Removing a server:** Only that server's keys move to the next server clockwise. All others stay in place.

**Virtual nodes (vnodes):** To prevent uneven distribution (some servers hold more of the ring), each physical server is hashed multiple times (e.g., 150 virtual points). This ensures more uniform distribution and better load balancing.

**Real-world use:** Redis Cluster (hash slots — a variant), Cassandra, Amazon DynamoDB, Memcached (ketama hashing). Twilio and other CDNs use it for edge caching.

---

**Q44. Design a notification system for a social platform (like Instagram). Explain your approach for fan-out.**

**A:**

**Requirements:** 500M users, some celebrities have 10M+ followers. Notification types: likes, comments, follows, mentions. P95 delivery < 1 minute. Push (mobile), email, in-app.

**Fan-out problem:** When a celebrity with 10M followers posts, you need to notify 10M users. Two approaches:

**Fan-out on write (push model):**
- On post creation, enqueue a job to write a notification record for every follower immediately.
- Reading the feed/notifications is a simple lookup for the current user.
- Problem: 10M inserts per celebrity post. High write latency, large storage.

**Fan-out on read (pull model):**
- On post creation, store just the post.
- On read, query "posts from users I follow."
- Problem: Read is expensive (JOIN across millions of followships). Not feasible at scale.

**Hybrid approach (used by Twitter/Instagram):**
- For users with < 1M followers: fan-out on write. Writes to follower inboxes immediately.
- For celebrities (> 1M followers): fan-out on read. Their posts are fetched dynamically at read time and merged into the feed.

**Architecture:**
1. Post created → Kafka topic `post.created`
2. Fan-out service consumes from Kafka, identifies follower type (regular vs celebrity)
3. Regular: Write notification records to Cassandra (append-only, high write throughput), push to Redis sorted set `notifications:{userId}` for fast reads
4. Celebrity: Store post reference; at read time, fetch from celebrity post store and merge
5. Push notification service: Reads from Redis, sends to APNs/FCM asynchronously

---

**Q45. What is the difference between optimistic and pessimistic locking? When do you choose each?**

**A:**

**Pessimistic locking:** Assumes conflicts are likely. Locks the resource before reading it, preventing other transactions from modifying it until you release the lock.

```sql
-- MySQL: Lock selected rows for update
BEGIN;
SELECT balance FROM accounts WHERE id = 123 FOR UPDATE; -- row is locked
UPDATE accounts SET balance = balance - 100 WHERE id = 123;
COMMIT; -- lock released
```

**Optimistic locking:** Assumes conflicts are rare. Does not lock on read. Records a version number or timestamp at read time. Before writing, checks if the version changed. If changed, another transaction modified the record — abort and retry.

```sql
-- Version-based optimistic locking
SELECT balance, version FROM accounts WHERE id = 123; -- version = 5
-- ... application logic ...
UPDATE accounts SET balance = balance - 100, version = version + 1
WHERE id = 123 AND version = 5; -- fails if another transaction incremented version
-- Check affected rows: 0 rows = conflict detected → retry
```

**When to choose:**

| Scenario | Choose Pessimistic | Choose Optimistic |
|---|---|---|
| Conflict probability | High (financial transfers, inventory) | Low (blog post edits, user profiles) |
| Transaction duration | Short | Short |
| Read-to-write ratio | Low (frequent writes) | High (mostly reads) |
| Deadlock risk | Higher (locks can deadlock) | Lower (no locks) |
| Performance under contention | Degrades (waiting for locks) | Degrades (retries) |

---

## 7. AWS & Cloud

---

**Q46. Explain the difference between an S3 bucket policy, an IAM user policy, and an IAM role. When would you use each?**

**A:**

**IAM User Policy:** Attached to an IAM user identity. Grants permissions to a specific human or programmatic user. Use for: individual developer access, CI service accounts (prefer roles for services where possible).

**IAM Role:** An identity without permanent credentials. Any trusted entity (EC2 instance, Lambda function, ECS task, another AWS account, SAML identity) can assume a role to get temporary credentials via STS (Security Token Service). Use for: EC2 instances reading from S3, Lambda functions writing to DynamoDB, cross-account access, GitHub Actions OIDC federation (no long-lived keys in CI).

**S3 Bucket Policy:** A resource-based policy attached to the bucket, specifying which principals (accounts, roles, users, services) can perform which actions on the bucket/objects. Use for: granting cross-account access, making specific prefixes public, restricting access to specific VPC endpoints, enforcing encryption in-transit (deny `http://` requests).

**Example: Grant EC2 read access to S3 without hardcoded credentials:**
1. Create IAM Role with trust policy: `ec2.amazonaws.com` can assume this role.
2. Attach permission policy: `s3:GetObject` on `arn:aws:s3:::my-bucket/*`.
3. Attach the instance profile (role) to the EC2 instance.
4. Code on EC2 uses `aws-sdk`; SDK automatically fetches temporary credentials from the instance metadata service (IMDS).

Never embed `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in application code or EC2 user data.

---

**Q47. How does AWS Lambda handle cold starts? What strategies do you use to mitigate them in production?**

**A:** A **cold start** occurs when Lambda needs to provision a new execution environment for a function invocation — there is no warm, idle environment available. Lambda must:
1. Provision a micro-VM (Firecracker)
2. Download the function code/container image
3. Start the runtime (Node.js, JVM, Python)
4. Run the function's initialization code (outside the handler)

Cold start durations: Node.js ~100–400ms, Java (JVM) ~1–3s, Python ~100–300ms.

**Mitigation strategies:**

1. **Provisioned Concurrency:** Pre-warms N execution environments so they are always ready. Eliminates cold starts for those environments. Cost: you pay for idle time. Use for latency-sensitive endpoints.

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name my-api \
  --qualifier prod \
  --provisioned-concurrent-executions 10
```

2. **Reduce initialization code:** Keep handler init code minimal. Move heavy initialization (DB connections, SDK clients) outside the handler so it runs once per execution environment, but keep it fast.

3. **Reduce deployment package size:** Smaller packages = faster environment initialization. Use `esbuild` to bundle and tree-shake. Use Lambda layers for shared dependencies.

4. **Avoid VPC if not needed:** Lambda functions in a VPC have additional cold start time for ENI (Elastic Network Interface) attachment. AWS has improved this with Hyperplane ENIs, but VPC still adds latency.

5. **Keep functions warm:** A scheduled EventBridge rule that pings the Lambda every 5 minutes. Keeps execution environments alive (they expire after ~15 minutes of inactivity). Not reliable at scale.

6. **Use SnapStart (Java/Python):** Takes a snapshot of a fully initialized execution environment and restores from it. Reduces Java cold starts from 3s to < 500ms.

---

**Q48. Explain S3 consistency model, storage classes, and when you would use a presigned URL.**

**A:**

**Consistency model (as of December 2020):** S3 is **strongly consistent** for all operations. `PUT` followed by `GET` returns the new data. `DELETE` followed by `LIST` no longer includes the deleted object. This replaced the eventual consistency model that caused occasional stale reads.

**Storage classes (cost vs retrieval tradeoff):**

| Class | Use case | Min storage | Retrieval |
|---|---|---|---|
| S3 Standard | Frequently accessed data | None | ms |
| S3 Standard-IA | Infrequently accessed, resilient | 30 days | ms, retrieval fee |
| S3 One Zone-IA | Non-critical infrequent data | 30 days | ms, retrieval fee |
| S3 Glacier Instant Retrieval | Archive, accessed quarterly | 90 days | ms |
| S3 Glacier Flexible | Archive, 1–5 min to 5–12 hr restore | 90 days | Minutes to hours |
| S3 Glacier Deep Archive | Long-term archive (7+ year compliance) | 180 days | 12–48 hours |
| S3 Intelligent-Tiering | Unknown or changing access patterns | 30 days | ms, monitoring fee |

**Presigned URLs:** A time-limited URL that grants temporary access to a private S3 object without exposing AWS credentials. The URL includes AWS credentials, an expiry timestamp, and a signature. When the user accesses the URL, S3 verifies the signature and expiry.

**Use cases:**
- Upload: Generate a presigned `PUT` URL on the server. Client uploads directly to S3 — bypasses your server, saves bandwidth and processing.
- Download: Generate a presigned `GET` URL for a private file (invoice PDF, user data export). Link valid for 1 hour.

```js
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const url = await getSignedUrl(s3Client,
  new GetObjectCommand({ Bucket: 'my-bucket', Key: 'invoices/user-123.pdf' }),
  { expiresIn: 3600 } // 1 hour
);
```

---

**Q49. What is an AWS VPC and how do Security Groups differ from NACLs?**

**A:** A **VPC (Virtual Private Cloud)** is an isolated network within AWS where you control IP ranges (CIDR blocks), subnets, routing tables, internet gateways, and access controls. Resources inside a VPC communicate privately; internet access requires an Internet Gateway or NAT Gateway.

**Subnets:**
- **Public subnet:** Route table has a route to an Internet Gateway. Resources can have public IPs.
- **Private subnet:** No direct internet route. Resources use a NAT Gateway (in a public subnet) for outbound internet access. Inbound internet access is blocked.

**Security Groups vs NACLs:**

| Feature | Security Group | NACL (Network ACL) |
|---|---|---|
| Level | Instance level (attached to ENI) | Subnet level |
| State | Stateful (return traffic auto-allowed) | Stateless (return traffic needs explicit rule) |
| Rules | Allow rules only (implicit deny all) | Allow AND Deny rules |
| Rule evaluation | All rules evaluated, most permissive wins | Rules evaluated in order (lowest number wins) |
| Use case | Fine-grained instance-level control | Subnet-level broad allow/deny (e.g., block IP range) |

**Practical architecture:** Use NACLs as a coarse firewall (block known bad IP ranges at subnet level). Use Security Groups as the primary control (allow only necessary ports between specific groups — app SG allows inbound from ALB SG on port 3000, DB SG allows inbound from app SG on port 3306).

---

**Q50. Explain the difference between SQS and SNS. How do you use them together in a fan-out pattern?**

**A:**

**SQS (Simple Queue Service):** A message queue. Messages are stored until a consumer polls and processes them. Point-to-point (one message consumed by one consumer). Supports two modes:
- **Standard:** At-least-once delivery, best-effort ordering. Very high throughput.
- **FIFO:** Exactly-once delivery, strict ordering. Limited to 300 TPS.

**SNS (Simple Notification Service):** A pub/sub messaging service. Publishers send to a topic; SNS immediately pushes to all subscribers (SQS queues, Lambda, HTTP endpoints, email, SMS). Point-to-fan-out.

**Fan-out pattern (SNS + SQS):**
```
Publisher → SNS Topic → SQS Queue A (Email service)
                      → SQS Queue B (Analytics service)
                      → SQS Queue C (Push notification service)
                      → Lambda (Real-time processing)
```

**Why not publish directly to multiple SQS queues?** You would need the publisher to know about all consumers and send to each manually. SNS decouples producers from consumers — new subscribers can be added without changing the publisher.

**When to use SQS alone:** When you have one consumer per message and need durability/retry logic (worker queues, job processing). When to use SNS alone: broadcast to HTTP webhooks, email/SMS notifications. Together (fan-out): one event needs to trigger multiple independent workflows.

---

## 8. CI/CD & GitHub

---

**Q51. Explain the difference between GitFlow and trunk-based development. Which do you prefer and why?**

**A:**

**GitFlow** uses multiple long-lived branches:
- `main`: Production-ready code
- `develop`: Integration branch, next release
- `feature/*`: Individual features, merged to develop
- `release/*`: Release stabilization
- `hotfix/*`: Emergency production patches

**Trunk-based development (TBD):** All developers commit directly to `main` (or very short-lived feature branches merged within 1–2 days). `main` is always in a deployable state. Requires feature flags for incomplete features.

| Dimension | GitFlow | Trunk-Based |
|---|---|---|
| Branch lifetime | Days to weeks | Hours to 2 days |
| Merge conflicts | Higher (long-lived branches diverge) | Lower (frequent small merges) |
| Release cycle | Scheduled releases | Continuous delivery |
| CI/CD integration | Complex (multiple branch pipelines) | Simple (one pipeline on main) |
| Feature flag dependency | Not required | Often required |
| Team size fit | Large teams, scheduled releases | Teams doing CI/CD, startups, FAANG |

**Preference at 3 years:** Trunk-based development for teams doing continuous delivery. Smaller PRs = easier reviews, faster feedback, fewer merge conflicts. GitFlow makes sense for libraries with formal semver releases or teams with infrequent deployment windows.

---

**Q52. Write a production GitHub Actions workflow for a Node.js API: lint, test, build Docker image, push to ECR, and deploy to ECS.**

**A:**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: my-api
  ECS_SERVICE: my-api-service
  ECS_CLUSTER: production

jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  deploy:
    name: Build & Deploy
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC — no long-lived keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-deploy
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
            --build-arg GIT_SHA=$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment
```

Key security decisions: OIDC instead of long-lived `AWS_ACCESS_KEY_ID` (GitHub's OIDC provider issues a short-lived token), minimal IAM permissions for the deploy role, using commit SHA as image tag (immutable, traceable).

---

**Q53. What is a blue/green deployment? How does it differ from a canary deployment? When do you use each?**

**A:**

**Blue/Green Deployment:**
- Two identical production environments: `blue` (current live) and `green` (new version).
- Deploy to `green`, run smoke tests, then switch all traffic from `blue` to `green` instantly (DNS update or load balancer target group swap).
- `blue` remains untouched as a rollback target.
- Rollback: Switch traffic back to `blue` in seconds.

```
Traffic: 100% → Blue (v1)
Deploy v2 to Green
Test Green
Switch: 100% → Green (v2)
Blue sits idle (rollback option)
```

**Canary Deployment:**
- Route a small percentage of traffic (e.g., 5%) to the new version. Monitor error rates, latency, and business metrics.
- Gradually increase: 5% → 25% → 50% → 100%.
- Rollback: Reduce new version traffic to 0%.

```
Traffic: 95% → Stable (v1), 5% → Canary (v2)
Monitor for 30 minutes
If healthy: 75%/25% → 50%/50% → 0%/100%
If unhealthy: Immediately 100% → Stable (v1)
```

| | Blue/Green | Canary |
|---|---|---|
| Traffic shift | Instant (binary) | Gradual |
| Risk | Lower (fast rollback) | Lower (small blast radius) |
| Infrastructure cost | 2x during deployment | Minimal extra |
| Use case | Confident releases, stateful migrations | Risk-sensitive releases, unknown real-world impact |

AWS ECS supports blue/green via CodeDeploy. AWS Lambda supports canary via weighted aliases. Kubernetes implements both via Deployment rolling updates and tools like Argo Rollouts.

---

**Q54. How do you manage secrets in a production CI/CD pipeline? What are the anti-patterns?**

**A:**

**Anti-patterns:**
- Hardcoding secrets in source code (committed to git — permanent exposure).
- Storing secrets in `.env` files committed to the repo.
- Passing secrets as Docker build args (visible in image layer history via `docker history`).
- Logging environment variables in CI output.
- Using long-lived IAM keys when roles/OIDC are available.

**Production practices:**

1. **GitHub Actions secrets:** Store as encrypted repository/organization secrets. Access as `${{ secrets.MY_SECRET }}`. Secrets are masked in logs. Never echo them.

2. **AWS Secrets Manager / Parameter Store (for runtime):**
```js
// At application startup, fetch from Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: 'prod/myapp/db' }));
const { DB_PASSWORD } = JSON.parse(SecretString);
```
Secrets Manager supports automatic rotation (e.g., rotating RDS passwords every 30 days). Lambda/ECS tasks use IAM roles to access — no hardcoded credentials.

3. **OIDC for AWS:** GitHub Actions authenticates to AWS via OIDC (no AWS credentials stored in GitHub at all). The IAM role's trust policy restricts which repository and branch can assume it.

4. **Docker secrets (BuildKit):** Pass secrets to `docker build` without them appearing in image layers:
```bash
docker build --secret id=npm_token,env=NPM_TOKEN .
# In Dockerfile: RUN --mount=type=secret,id=npm_token npm install
```

---

**Q55. Explain GitHub's OIDC federation with AWS. How does it eliminate the need for long-lived AWS access keys in CI?**

**A:** OIDC (OpenID Connect) is an identity federation protocol. GitHub Acts as an **OIDC identity provider**. AWS IAM can be configured to trust GitHub's OIDC tokens.

**Flow:**
1. GitHub Actions generates a short-lived JWT OIDC token (valid ~5 minutes) signed by GitHub's OIDC provider (`token.actions.githubusercontent.com`).
2. The workflow uses `aws-actions/configure-aws-credentials` with `role-to-assume`.
3. This action exchanges the GitHub OIDC token with AWS STS `AssumeRoleWithWebIdentity` for temporary AWS credentials (15 min–1 hr).
4. The workflow uses those temporary credentials for the duration of the job.

**IAM Trust Policy:**
```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
    }
  }
}
```

The `sub` claim can be scoped to a specific repository, branch, or environment — providing fine-grained control over which GitHub workflows can assume which AWS roles.

**Why this is better than long-lived keys:** No AWS credentials stored in GitHub. If GitHub is compromised, there are no static keys to steal. Temporary credentials expire automatically. Audit trail via AWS CloudTrail (which GitHub workflow assumed which role, when).

---

## 9. GenAI Engineering

---

**Q56. Explain the transformer attention mechanism at a developer level. Why does context window size matter in production?**

**A:** The **transformer** architecture processes tokens in parallel using **self-attention**. For each token in the input, attention computes a weighted sum of all other tokens' representations — how much should each token "attend" to every other token?

The computation: for each token, create a `Query` vector, a `Key` vector, and a `Value` vector (learned projections). Attention score between two tokens = `dot_product(Query_i, Key_j) / sqrt(d_k)`, softmaxed. The output for token `i` = weighted sum of all `Value` vectors.

**Multi-head attention** runs this process in parallel across multiple subspaces (heads), then concatenates, allowing the model to attend to different aspects (syntax, semantics, coreference) simultaneously.

**Context window in production:**
- Context window = maximum number of tokens the model can process in one call.
- GPT-4o: 128K tokens (~96K words). Claude 3.5 Sonnet: 200K tokens.
- **Cost:** Pricing is per token (input + output). A 100K token context costs ~$1 per call at GPT-4o pricing. Processing 1M such calls = $1M in API costs.
- **Latency:** Attention computation is O(n²) in tokens for each layer. Longer contexts = significantly higher latency (and in practice, quality can degrade in the "lost in the middle" problem — models pay less attention to the middle of very long contexts).
- **Chunking strategy for RAG:** You do NOT pass entire documents. You chunk documents into ~500-token pieces, embed them, retrieve the top-k relevant chunks, and pass only those to the model. This controls cost and latency.

---

**Q57. What is RAG? Describe the full production pipeline architecture, including chunking strategies.**

**A:** **RAG (Retrieval-Augmented Generation)** combines a retrieval system with a generative model. Instead of relying solely on the model's training knowledge (which may be outdated or private), RAG retrieves relevant context from a document corpus at query time and includes it in the prompt.

**Full pipeline:**

**Ingestion pipeline (offline, runs on document update):**
1. **Load:** Ingest documents (PDF, web pages, Confluence, Notion) via loaders.
2. **Chunk:** Split documents into overlapping chunks. Strategy matters:
   - *Fixed size:* 500 tokens, 50 token overlap. Simple, works for uniform text.
   - *Recursive character splitting:* Splits on `\n\n`, `\n`, `. ` — respects paragraph/sentence boundaries.
   - *Semantic chunking:* Uses embedding similarity to detect natural topic boundaries.
   - *Parent document retriever:* Embed small chunks for precision, retrieve larger parent chunks for context.
3. **Embed:** Convert each chunk to a dense vector using an embedding model (`text-embedding-3-small`).
4. **Store:** Upsert vectors + metadata into a vector DB (pgvector in PostgreSQL, Pinecone, Weaviate, Qdrant).

**Query pipeline (online, per user request):**
1. Embed the user query.
2. Vector similarity search (cosine similarity, approximate nearest neighbor) → top-K chunks.
3. Optional: Rerank results using a cross-encoder (e.g., Cohere Rerank) for better relevance.
4. Construct prompt: `system_prompt + retrieved_chunks + user_query`.
5. Call LLM, stream response.

**Production concerns:** Chunk freshness (re-embed on document update), hallucination detection, citation tracking (include chunk source in response), hybrid search (vector + BM25 keyword search combined).

---

**Q58. Explain function calling in the OpenAI API. Build a simple example that retrieves current weather.**

**A:** Function calling (now called "tool use") allows the model to request execution of a predefined function when it determines external data or an action is needed. The model does not call the function itself — it returns a structured JSON object specifying which function and what arguments to call with. Your application executes the function and provides the result back to the model.

```js
import OpenAI from 'openai';
const client = new OpenAI();

const tools = [{
  type: 'function',
  function: {
    name: 'get_current_weather',
    description: 'Get the current weather in a given location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and state, e.g. Austin, TX' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
      },
      required: ['location']
    }
  }
}];

async function chat(userMessage) {
  const messages = [{ role: 'user', content: userMessage }];

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools,
    tool_choice: 'auto' // model decides when to call
  });

  const choice = response.choices[0];

  if (choice.finish_reason === 'tool_calls') {
    const toolCall = choice.message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);

    // Execute the actual function
    const weatherData = await fetchWeatherAPI(args.location, args.unit);

    // Provide result back to model for final response
    messages.push(choice.message); // model's tool_calls message
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(weatherData)
    });

    const finalResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      messages
    });
    return finalResponse.choices[0].message.content;
  }

  return choice.message.content;
}
```

---

**Q59. What is the ReAct pattern in AI agents? How does it differ from a simple chain?**

**A:** **ReAct (Reasoning + Acting)** is a prompting and agent architecture pattern where the model interleaves reasoning steps (`Thought`) with action execution (`Action`) and observation of results (`Observation`) in a loop.

```
Thought: I need to find the current price of AAPL stock.
Action: search_web("AAPL stock price today")
Observation: AAPL is trading at $213.45 as of market close.
Thought: Now I have the price. The user also asked about market cap. I need the shares outstanding.
Action: search_web("AAPL shares outstanding 2026")
Observation: Apple has approximately 15.2 billion shares outstanding.
Thought: Market cap = 213.45 * 15.2B = ~$3.24 trillion. I can now answer.
Final Answer: AAPL is trading at $213.45 with a market cap of approximately $3.24 trillion.
```

**Simple chain vs ReAct agent:**

| | Simple Chain (LCEL) | ReAct Agent |
|---|---|---|
| Steps | Fixed, predetermined | Dynamic, model decides |
| Tools used | Fixed set | Selected per step based on observation |
| Loops | No | Yes (continues until final answer) |
| Failure modes | Fails if a step fails | Can recover by trying alternative actions |
| Use case | Well-defined workflow | Open-ended tasks requiring planning |

**Production concerns with agents:**
- **Infinite loops:** Set a max iterations limit (e.g., 10 steps).
- **Tool error handling:** The agent should handle tool failures gracefully (pass error as observation, let model decide to retry or give up).
- **Cost control:** Each ReAct iteration = one LLM call. A 10-step agent = 10 completions. Budget accordingly.
- **Determinism:** Agents are non-deterministic. For production, log every thought/action/observation for debugging.

---

**Q60. How do you evaluate the quality of a RAG system in production? What metrics do you track?**

**A:** RAG evaluation requires measuring both retrieval quality and generation quality separately, plus end-to-end pipeline quality.

**Retrieval metrics:**
- **Context Precision:** Of the retrieved chunks, what fraction are actually relevant to the question? Measures retrieval noise.
- **Context Recall:** Of all the relevant chunks in the corpus, what fraction were retrieved? Measures retrieval completeness.
- **MRR (Mean Reciprocal Rank):** How high does the first relevant chunk rank in results?

**Generation metrics:**
- **Faithfulness (Groundedness):** Does the generated answer only contain claims supported by the retrieved context? Measured by LLM-as-judge: prompt an LLM to check each claim in the answer against the retrieved chunks.
- **Answer Relevancy:** Is the generated answer relevant to the question? (Even if faithful to context, it might not directly answer the question.)

**End-to-end metrics:**
- **Answer Correctness:** Against a ground-truth labeled dataset, is the answer correct?
- **Latency P50/P95/P99:** Time from query to first token and to complete response.

**Tools:**
- **RAGAS** (open-source): Automated RAG evaluation framework that computes faithfulness, answer relevancy, context precision/recall.
- **LangSmith / Langfuse:** Trace and log every retrieval + generation call. Run evaluators on the traces.
- **Human evaluation:** For high-stakes use cases, a panel of domain experts grades random samples weekly.

```js
// Langfuse tracing example
import { Langfuse } from 'langfuse';
const lf = new Langfuse();

const trace = lf.trace({ name: 'rag-query', input: { query } });
const retrieval = trace.span({ name: 'retrieval' });
const chunks = await vectorSearch(query);
retrieval.end({ output: chunks });

const generation = trace.span({ name: 'generation' });
const answer = await generateAnswer(query, chunks);
generation.end({ output: answer });
trace.update({ output: answer });
```

---

## 10. Behavioral

> Use the **STAR format** for every answer: **S**ituation (brief context) → **T**ask (your responsibility) → **A**ction (what you specifically did, use "I" not "we") → **R**esult (quantifiable outcome).
>
> Adapt these templates to your real experiences before interviews.

---

**Q61. Tell me about a time you had to debug a production issue under pressure. What was your process?**

**Situation:** Our e-commerce API's response times for the checkout endpoint spiked from 200ms to 8+ seconds at 3 AM on a Black Friday weekend. Revenue was actively being lost.

**Task:** I was the on-call engineer and had to identify and resolve the issue within our 15-minute SLA.

**Action:** I immediately pulled Datadog dashboards and noticed DB query duration had spiked — specifically one query type. I ran `SHOW PROCESSLIST` in MySQL and saw hundreds of queries in "Waiting for lock" state. A marketing team's batch job (data export) had kicked off at midnight, acquired a table-level lock, and was blocking all checkout transactions. I killed the batch job process, confirmed the lock cleared, and watched response times normalize. I then added a post-mortem note and created a ticket to wrap the batch job in read replicas only and add a lock timeout of 5 seconds.

**Result:** Downtime was 11 minutes. We wrote a runbook for lock-related incidents, moved all analytics queries to a read replica, and haven't had a repeat in 8 months. I also added automated alerting on `Waiting for lock` count in our DB monitoring.

---

**Q62. Describe a time you disagreed with a technical decision made by a senior engineer or tech lead. How did you handle it?**

**Situation:** Our team was adopting microservices for a new product feature. The tech lead proposed breaking the user authentication service into its own microservice immediately.

**Task:** I disagreed with this as premature optimization — we had a team of 4 engineers and a 6-week timeline. I needed to express my concern constructively without undermining the tech lead.

**Action:** I scheduled a 30-minute technical discussion and prepared a comparison document. I walked through the operational overhead of a new service (separate deployment, monitoring, service discovery, distributed tracing, network failure modes) vs. keeping auth in the monolith as an isolated module with clean internal APIs. I framed it as "the right decision, potentially the wrong time" — not a rejection but a phasing proposal.

**Result:** The tech lead agreed to a compromise: build auth as an isolated internal module with its own clearly defined interface in the monolith. We established a marker in the code (`@extraction-candidate: auth`) to make the extraction easy when team size and traffic warranted it. The feature shipped on time. Six months later, when we had justified load, the extraction took 2 days instead of 2 weeks because the interface was already clean.

---

**Q63. Tell me about the most technically complex project you have built. Walk me through the architecture.**

**Situation:** I built a multi-tenant, real-time collaborative document editor for a SaaS product — think Google Docs functionality within an existing enterprise workflow tool.

**Task:** I was the lead engineer on a 3-person team. My responsibilities covered the real-time sync architecture, conflict resolution, and the backend infrastructure.

**Action:** I evaluated Operational Transformation (OT) vs CRDT for conflict resolution. Given our document structure (rich text, not arbitrary data), I chose Yjs (a CRDT implementation) with a custom persistence layer. For real-time sync: WebSocket server via Node.js + the `y-websocket` provider. For persistence: Yjs update documents stored in PostgreSQL as binary blobs (efficient diff-based updates) + Redis pub/sub for broadcasting updates across WebSocket server replicas. I also implemented presence (cursor positions, user avatars) as ephemeral data in Redis with TTL.

**Result:** The system handles 50 concurrent editors in a single document with < 50ms sync latency. We saw a 35% increase in user engagement metrics. I presented the architecture internally and the pattern was adopted for two other collaborative features.

---

**Q64. Tell me about a time you had to make a significant performance improvement. What was the impact?**

**Situation:** A product dashboard page was loading in 12–15 seconds for enterprise clients with large datasets. Users were reporting it as the #1 blocker to adoption.

**Task:** I was assigned to investigate and reduce the load time to under 3 seconds without changing the feature set.

**Action:** I started with profiling. Chrome DevTools showed 8 seconds of the load was a single API call. I inspected the query in the backend and found it was loading all 50,000 records into Node.js memory, formatting them in JavaScript, and sending the result. I replaced this with a server-side aggregated query (window functions in MySQL), reducing data transfer from 8MB to 40KB. Next, I identified a classic N+1 problem — 200 individual company lookup queries on each list render. I replaced these with a single batch query and in-memory HashMap. On the frontend, I added virtual scrolling for the table (was rendering all 5,000 visible rows at once, now renders 50). I also added Redis caching for the main query (TTL: 5 minutes, invalidated on data change via a write-through hook).

**Result:** Load time dropped from 12 seconds to 1.4 seconds. User satisfaction scores for the dashboard feature increased by 28% in the next NPS survey. The techniques became our internal performance checklist for new API endpoints.

---

**Q65. Describe a situation where you had to rapidly learn a new technology to deliver a project. How did you approach it?**

**Situation:** Our team won a project that required building a real-time GenAI assistant integrated into our existing Node.js + React app. No one on the team had production experience with LLMs or RAG systems. We had 5 weeks.

**Task:** I volunteered to own the AI integration layer. I needed to go from zero to production-quality in ~2 weeks, leaving 3 weeks for integration and testing.

**Action:** I did not start with tutorials. I started with the end state — what does the production system need to do? I mapped the requirements: streaming responses to UI, document grounding (RAG), cost control, error handling. I then read OpenAI's API documentation end-to-end (2 hours), built a minimal working prototype in day 1 (just chat completion with streaming). Day 2: added function calling. Day 3: studied vector databases, picked pgvector (already had PostgreSQL). Days 4–5: built the RAG pipeline. I documented every decision as an ADR (Architecture Decision Record) so the team could review my reasoning. I also set up Langfuse for observability from day 1 so we could see real traces.

**Result:** The AI assistant launched on week 5 as planned. Latency was < 2 seconds to first token. The ADRs I wrote became the team's GenAI onboarding documentation. I gave a 30-minute internal tech talk on the patterns, which led to two other teams adopting the same RAG architecture.

---

**Q66. Tell me about a time when a project you were working on failed or fell significantly short of expectations. What did you learn?**

**Situation:** I led the migration of our user notification system from a monolithic queue to an event-driven Kafka-based architecture. We projected 3 months; it took 5.5 months and had a major incident.

**Task:** I was responsible for the technical design and coordination of a 4-engineer migration effort.

**Action:** The failure mode: I underestimated the complexity of consumer group offset management during the migration cutover. I had planned a "big bang" cutover on a Saturday. During the cutover, a misconfigured consumer group committed offsets incorrectly, causing approximately 40,000 notifications to be re-delivered to users. I immediately rolled back to the old queue, wrote a migration script to deduplicate the notifications, and ran a post-mortem. The fix: I redesigned the cutover as a parallel-run migration — old and new system ran simultaneously for 2 weeks, with a comparison harness that validated both systems processed the same events. When divergence was detected, it alerted but defaulted to the old system.

**Result:** We completed the migration successfully without a second incident. I documented the parallel-run pattern as a standard approach for our team's future queue migrations. Personally, I learned to explicitly schedule a "failure mode workshop" for every significant infrastructure migration — dedicating a meeting to "what can go wrong and how do we recover."

---

**Q67. How do you handle a situation where you are given an unrealistic deadline?**

**Situation:** Our product team committed to a client that a new compliance reporting feature would be ready in 3 weeks. The actual estimate from engineering was 7–8 weeks.

**Task:** As the senior engineer, I needed to communicate the gap to the team and stakeholders without creating conflict, while finding a path forward.

**Action:** I gathered the engineering team to validate the 7–8 week estimate with concrete breakdown (not gut feel). I then scheduled a meeting with the product manager and presented the estimate with the task breakdown visible. I proposed three options: (1) 3-week MVP with manual data export step (reduces engineering to ~3 weeks); (2) 5-week automated version with reduced scope; (3) 7-week full feature as originally spec'd. I quantified the risk of option 1 — client does a manual step, but the data is accurate and compliant. I did not present it as "engineering says no" but as "here are our real options and the trade-offs."

**Result:** The product team went back to the client with option 1. The client accepted — they preferred an accurate MVP in 3 weeks over a delayed full feature. We delivered on time. The manual step was automated in the following 4-week sprint. This conversation also prompted a broader process change: engineering participates in client commitment conversations before deadlines are set.

---

**Q68. Describe a time you mentored a junior developer. What was your approach?**

**Situation:** A junior developer joined our team, strong in JavaScript fundamentals but with no production Node.js or React experience. They were assigned to a feature that touched both.

**Task:** I was asked to be their informal mentor for the first 3 months.

**Action:** My approach had three pillars. First, context before code — I spent 30 minutes walking through the codebase architecture before they wrote a single line. I explained not just what the code does but why certain decisions were made. Second, review-first development — for the first month, I reviewed their PRs synchronously (pair review on a call) rather than async comments. This let me explain the reasoning, not just mark changes. Third, increasing autonomy — after month 1, I moved to async reviews but framed feedback as questions ("What do you think happens if `userId` is undefined here?") rather than directives. I assigned them an end-to-end feature in month 2 with me available but not directing.

**Result:** By month 3, their PR quality was comparable to other team members. In their performance review, they specifically cited the structured onboarding and code reviews as key to their growth. I also got feedback that the "question" style of code review pushed them to think through issues rather than passively receive answers — which built lasting habits.

---

**Q69. Tell me about a time you had to advocate for technical debt resolution to a non-technical stakeholder.**

**Situation:** Our payments module had been patched 7 times over 2 years and was reaching the point where every new payment feature took 3–4x longer than it should. The codebase had no test coverage, deeply nested conditionals, and 3 different ways to handle currency.

**Task:** I needed to convince the product director to allocate 3 engineering-weeks to a refactor that produced no visible user-facing feature.

**Action:** I framed the argument in business terms, not engineering terms. I tracked the time spent on payment-related bugs over the previous quarter: 23 engineering hours. I showed the time for the last 3 payment features vs. the estimated time in a cleaner codebase. I calculated the cost of the tech debt: approximately 2 additional days per payment feature shipped. I then presented the refactor as an investment: 3 weeks upfront to save an estimated 8–10 days over the next 6 months of planned payment work. I also surfaced the risk angle — the lack of test coverage on payments was a compliance and incident risk. I used a "risk-adjusted cost" framing: the expected value of one payment incident (customer impact, engineering response time, reputational cost) exceeded the refactor cost.

**Result:** The product director approved 2 engineering-weeks (a compromise). We delivered the core refactor (test coverage + currency standardization) in that window. The next payment feature shipped 40% faster. The model I used for the conversation (current cost vs. invested cost vs. risk) became the team's template for future tech debt proposals.

---

**Q70. Where do you see yourself in 3 years, and how does this role fit into that trajectory?**

**Framework for answering (adapt to your genuine goals):**

**What interviewers are evaluating:** Are you motivated, self-directed, and likely to stay and grow? Do your goals align with what this role can offer? Do you have a realistic understanding of your own trajectory?

**Structure:**
1. State a concrete technical direction (not just "I want to be a senior engineer" — what kind?).
2. Connect it to real skills you want to build (system design, distributed systems, AI, platform engineering).
3. Explain why this role specifically accelerates that path — referencing real things about the company/role.
4. Show that you are thinking about impact, not just titles.

**Example answer framework:**

"In 3 years, I want to be the kind of engineer who can take ownership of a significant technical decision — whether that is the architecture of a new product area, a platform migration, or the technical direction for an AI-powered feature. Right now, I have strong full-stack execution skills, but I want to deepen my system design fluency and gain more experience making the calls that have 2-year consequences.

What interests me specifically about this role is [X real thing about the company's technical challenges or scale]. That kind of environment would accelerate exactly the skills I need to develop. I also want to grow my mentorship capability — I find that explaining architecture to others sharpens my own thinking. In 3 years, I want to be someone junior engineers actively want to work with."

The key is to be specific and genuine. Vague ambition ("I want to be a tech lead") is less credible than a specific direction tied to skills and real motivation.

---

*Interview Master Bank v1.0 | 100 Q&A pairs | Calibrated for mid-senior full-stack roles | Updated: 2026-06-03*
