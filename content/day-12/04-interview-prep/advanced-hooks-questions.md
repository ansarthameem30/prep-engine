# Advanced React Hooks – Interview Q&A

## Q1: What is the relationship between useCallback and useMemo?

**Answer:**
`useCallback(fn, deps)` is exactly equivalent to `useMemo(() => fn, deps)`. Both are cache mechanisms — `useMemo` caches the **result** of calling a function, while `useCallback` caches the **function itself** (which is also a value).

```js
// These are identical:
const memoizedFn = useCallback(() => doSomething(a, b), [a, b]);
const memoizedFn = useMemo(() => () => doSomething(a, b), [a, b]);
```

The practical distinction: `useCallback` is used when the value you want to cache *is* the function (to pass as a stable prop), while `useMemo` is used when you want to cache the function's *return value* (a computed result).

---

## Q2: Give me three scenarios where useCallback is unnecessary or harmful.

**Answer:**

**Scenario 1 — Non-memoized consumer**: If the child component is not wrapped in `React.memo`, a stable callback provides zero benefit. The child re-renders whenever the parent does, regardless of prop stability.

**Scenario 2 — Dependencies change every render**: If a dependency like a computed value or unstable object is in the dep array, `useCallback` recreates the function every render anyway. You pay the memoization overhead for nothing.

**Scenario 3 — Primitive event handler with no deps**:
```jsx
// This is worse than just writing the function inline
const handleClick = useCallback(() => setCount(c => c + 1), []);
// → useCallback overhead, memo comparison overhead, closure creation
// → vs. just: onClick={() => setCount(c => c + 1)}
```

The rule: profile first, optimize second. `useCallback` is not "free" — it compares deps arrays on every render.

---

## Q3: When does useMemo actually help, and how do you decide if it's worth adding?

**Answer:**
useMemo provides value when **all three** are true:
1. The computation is genuinely slow (measure with `console.time` — aim for >1ms)
2. The component re-renders frequently with the same input values
3. The result is either passed to a `React.memo`'d component, or used as a dependency in another hook

Decision process:
1. Profile first using the React Profiler
2. Find the slow component
3. Check if the expensive computation runs during every render or only when relevant deps change
4. Only then add `useMemo`

Common false case: memoizing simple calculations like `items.length`, `user.name.toUpperCase()`, or small array filters on <100 items. These are faster without memoization overhead.

---

## Q4: What is useRef, and what are its three main use cases?

**Answer:**
`useRef` returns a `{ current: value }` object that persists across renders without causing re-renders when mutated. It's a mutable escape hatch from React's reactive model.

**Use case 1 — DOM reference**: Access the underlying DOM node directly for focus, scrolling, or third-party DOM library integration.

**Use case 2 — Mutable value without re-render**: Store values that need to persist across renders but shouldn't trigger updates — interval IDs, timeout handles, flags, previous render values.

**Use case 3 — Previous value tracking**: Store the previous render's value in a `useEffect` (or without deps), so you can compare in the next render.

Key distinction from `useState`: writing to `ref.current` is synchronous and immediate, but completely outside React's render cycle — React doesn't know it happened.

---

## Q5: When should you use useLayoutEffect instead of useEffect?

**Answer:**
`useLayoutEffect` fires **synchronously** after all DOM mutations but **before** the browser paints. Use it when:

1. You need to read DOM layout (element dimensions, scroll position) and then synchronously update state to avoid a visual flash
2. You're integrating an animation library that needs to set initial positions before paint
3. You're restoring scroll position on navigation

If you use `useEffect` for DOM measurements, the sequence is: DOM updated → browser paints (user sees new state) → your effect runs → DOM updated again → browser repaints. This causes a flash. `useLayoutEffect` prevents the first paint until your effect completes.

**When NOT to use it**: Any effect that doesn't depend on DOM measurements, any async operation, any subscription setup. Overusing `useLayoutEffect` blocks the browser's rendering pipeline and hurts perceived performance.

SSR warning: `useLayoutEffect` is a no-op on the server and produces a warning. Use a conditional or `useEffect` for SSR-safe code.

---

## Q6: What is useImperativeHandle and when is it appropriate?

**Answer:**
`useImperativeHandle` customizes what is exposed on the `ref` of a `forwardRef` component. Instead of exposing the raw DOM node, you expose a controlled imperative API.

Appropriate when:
- You have a complex component (custom input, media player, modal) that parent components legitimately need to control imperatively (`.play()`, `.focus()`, `.open()`)
- You want to restrict what the parent can do — expose only `.focus()` instead of the entire DOM element
- You're building a component library with a defined imperative API

Not appropriate when:
- The interaction can be achieved through props and state (declarative approach is always preferred)
- You're using it just to avoid lifting state up — that's usually a code smell

```jsx
useImperativeHandle(ref, () => ({
  focus: () => inputRef.current.focus(),
  // Parent cannot access inputRef.current directly — intentional encapsulation
}), []);
```

---

## Q7: Explain useSyncExternalStore and why it was added in React 18.

**Answer:**
`useSyncExternalStore` is the correct API for subscribing to external stores (anything outside React state — Redux, Zustand, localStorage, browser APIs) in Concurrent Mode.

The problem it solves: **tearing**. In React 18's Concurrent Mode, React may interrupt and resume rendering, reading state at different points in time. If a component reads from an external store at different moments, different parts of the UI might show different snapshots of the same store — the UI appears inconsistent.

`useSyncExternalStore` tells React to make the store read synchronous (atomic), preventing any intermediate states from showing.

```js
// Signature:
const value = useSyncExternalStore(
  subscribe,        // (callback) => unsubscribe — called when store changes
  getSnapshot,      // () => currentValue — must return same reference if unchanged
  getServerSnapshot // () => ssrValue — for hydration
);
```

Libraries like Redux and Zustand use this hook internally. Application code typically doesn't call it directly unless building a custom store.

---

## Q8: What are the most common dependency array mistakes in hooks?

**Answer:**

**1. Missing dependencies (stale closure):**
```js
useEffect(() => {
  fetch(`/users/${userId}`).then(setUser);
}, []); // BUG: userId changes are ignored — stale closure
// FIX: }, [userId]);
```

**2. Over-listing unstable references:**
```js
const options = { timeout: 3000 }; // new object every render
useEffect(() => { /* ... */ }, [options]); // runs every render!
// FIX: move options inside the effect, or useMemo/useRef it
```

**3. Functions as dependencies without useCallback:**
```js
function fetchData() { /* ... */ } // new reference each render
useEffect(() => { fetchData(); }, [fetchData]); // runs every render
// FIX: wrap fetchData in useCallback or move it inside the effect
```

**4. Forgetting that setState and dispatch are stable:**
```js
const [count, setCount] = useState(0);
const dispatch = useDispatch(); // from React-Redux
// Both setCount and dispatch are guaranteed stable — never need them in deps
useEffect(() => { /* uses setCount, dispatch */ }, []); // fine
```

**5. useEffect with async function:**
```js
// BUG: useEffect callback returns a Promise, not a cleanup function
useEffect(async () => { await fetchData(); }, []);
// FIX:
useEffect(() => {
  let cancelled = false;
  async function run() {
    const data = await fetchData();
    if (!cancelled) setData(data);
  }
  run();
  return () => { cancelled = true; };
}, []);
```

The `react-hooks/exhaustive-deps` ESLint rule catches most of these automatically.
