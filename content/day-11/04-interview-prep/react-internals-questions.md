# React Internals – Interview Q&A

## Q1: What is the Virtual DOM, and why does it exist?

**Answer:**
The Virtual DOM is a lightweight JavaScript object tree representing the UI structure. React creates it on every render and diffs it against the previous version to determine the minimal set of real DOM mutations needed.

It exists to solve three problems:
1. **Batching**: React can accumulate updates and apply them in a single DOM pass, avoiding layout thrash from multiple synchronous DOM writes.
2. **Efficient diffing**: React computes the diff in JS (cheap) rather than touching the DOM (expensive — triggers layout and paint).
3. **Platform abstraction**: The VDOM is an intermediary that lets React target different hosts — React DOM, React Native, server-side rendering, React Three Fiber.

**Gotcha**: The VDOM itself is not "faster than the DOM." The DOM is C++ code that runs natively; the VDOM is JavaScript. The win is from *minimizing* DOM operations, not from the VDOM being inherently fast. For a trivial counter component, direct DOM manipulation would be faster.

---

## Q2: What is React Fiber, and what problem did it solve?

**Answer:**
Fiber is the internal reconciliation engine introduced in React 16. It replaced the original "stack reconciler," which was synchronous and non-interruptible — once React started processing an update, it blocked the main thread until done, causing dropped frames.

Fiber represents each component as a linked-list node (a "fiber") with `child`, `sibling`, and `return` pointers. This data structure lets React:
- Pause and resume work across multiple frames
- Assign priority levels to updates (e.g., user input > data loading)
- Abort stale work when new updates arrive
- Enable Concurrent Mode features (startTransition, Suspense, etc.)

Fiber also enables the double-buffering technique: React builds the new tree (work-in-progress) in memory while the current tree stays on screen, then swaps atomically on commit.

---

## Q3: Explain React's reconciliation algorithm. What are its key heuristics?

**Answer:**
Reconciliation is the diffing process between the old and new React element trees. A naive tree diff is O(n³); React achieves O(n) with two heuristics:

**Heuristic 1 — Different types = full replacement**: When the element type at a position changes (e.g., `<div>` → `<span>`, or `ComponentA` → `ComponentB`), React unmounts the entire subtree and mounts fresh. No diffing of children.

**Heuristic 2 — `key` prop signals identity**: For lists, React matches elements by `key` across renders. Without keys, it matches by position — inserting at the top causes every subsequent element to re-render. With stable unique keys, React correctly identifies moves, adds, and removes.

**Common mistake**: Using array index as key. When items are reordered or deleted, indices change, causing React to see "all items changed" instead of "one item removed." This corrupts state in controlled inputs inside list items.

---

## Q4: What is the difference between the render phase and the commit phase?

**Answer:**

**Render phase**:
- React calls component functions and builds the work-in-progress Fiber tree
- Pure — no DOM mutations, no side effects
- **Interruptible** in Concurrent Mode (React may restart or discard this work)
- May be called multiple times for a single update (StrictMode double-invokes here)

**Commit phase**:
- React applies the computed changes to the actual DOM
- Always **synchronous** and non-interruptible
- Three sub-phases: before-mutation, mutation (DOM updates), layout
- `useLayoutEffect` fires synchronously at the end of commit (before browser paint)
- `useEffect` fires asynchronously after the browser has painted

**Why this matters**: Never put side effects (fetch, subscriptions) in the render phase. Use `useEffect` for async side effects and `useLayoutEffect` only for synchronous DOM measurements.

---

## Q5: How does automatic batching work in React 18, and how did it differ from React 17?

**Answer:**

React 17 only batched state updates inside React event handlers (synthetic events). Any updates inside `setTimeout`, `Promise.then`, or native event listeners triggered separate re-renders per `setState` call.

React 18 extends batching to **all contexts** using the scheduler. Multiple `setState` calls in any context — timeouts, promises, async functions, native events — are now batched into a single re-render.

```js
// React 17: 2 renders
setTimeout(() => {
  setA(1); // render 1
  setB(2); // render 2
}, 0);

// React 18: 1 render (automatic batching)
setTimeout(() => {
  setA(1); // \
  setB(2); //  > 1 render
}, 0);     // /
```

To opt out (rare): use `flushSync` from `react-dom`, which forces synchronous, unbatched execution for a specific update.

---

## Q6: What is `startTransition`, and when should you use it versus debouncing?

**Answer:**
`startTransition` marks a state update as non-urgent. React will render the transition update only when the browser is idle, pausing and restarting it if urgent updates (user input) arrive during rendering.

Use it for: expensive state updates where stale UI is acceptable — filtering large lists, navigating between views, updating data visualizations while input stays live.

**vs. Debouncing:**
- Debouncing *delays* triggering the update (doesn't start until the user pauses)
- `startTransition` starts *immediately* but can be interrupted and restarted
- Debouncing is better when you want to reduce API calls (search-as-you-type)
- `startTransition` is better when you want immediate visual feedback with a graceful "pending" state

The `useTransition` hook returns `[isPending, startTransition]` — `isPending` lets you show a loading indicator without blocking the UI.

---

## Q7: Why does React StrictMode double-invoke component functions in development?

**Answer:**
StrictMode intentionally renders components twice (mount → unmount → mount) and double-invokes render functions, `useState` initializers, `useMemo`, and `useCallback` callbacks.

The reason: React 18 Concurrent Mode can interrupt and replay rendering. If your component function has side effects (mutates globals, fires network requests, increments counters), running twice in development exposes those bugs before they hit production.

React intentionally **discards the result of the first render** — the double-invoke is pure detection; the second result is what React uses. The key rule: component functions must be **pure** — same inputs must always produce the same output, with no observable side effects.

`useEffect` is also double-invoked in StrictMode (React 18): mount → cleanup → mount. If your app behaves differently on the second mount, your effect has a missing cleanup.

---

## Q8: Walk me through what happens when you call `setState` in a React functional component.

**Answer:**

1. **Scheduler enqueues the update**: React adds the update to a queue on the fiber, tagged with a priority (synchronous for direct user events, transition for `startTransition`, etc.).

2. **Batching check**: React checks if other state updates are pending in the same event or batch. All queued updates will be processed together.

3. **Render phase begins**: React calls the component function with the new state value. The new React element tree is diffed against the current Fiber tree to produce the work-in-progress tree with a list of effects.

4. **Commit phase**: React applies DOM mutations synchronously. `useLayoutEffect` cleanups and callbacks fire. Refs are updated.

5. **Paint**: The browser composites and paints the updated frame.

6. **Passive effects**: `useEffect` cleanups and callbacks fire asynchronously after paint.

**Critical gotcha**: `setState` is asynchronous — the value does not update inline:
```js
setCount(1);
console.log(count); // still 0! React hasn't re-rendered yet
// Use functional form for updates that depend on current state:
setCount(prev => prev + 1); // safe — React guarantees prev is current
```
