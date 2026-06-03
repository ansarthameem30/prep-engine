# Advanced React Hooks: Deep Dive

## useCallback: When to Use (and When NOT To)

`useCallback` returns a memoized function reference that only changes when its dependencies change. It is syntactic sugar over `useMemo`:

```js
useCallback(fn, deps)
// is exactly equivalent to:
useMemo(() => fn, deps)
```

### When useCallback Helps

useCallback only provides value in two scenarios:

**1. Stable prop for a memoized child:**
```jsx
const handleSubmit = useCallback(async (data) => {
  await api.post('/submit', data);
}, []); // stable reference

// Only useful because FormComponent is wrapped in React.memo
const MemoizedForm = React.memo(FormComponent);
<MemoizedForm onSubmit={handleSubmit} />
```

**2. Dependency for another hook:**
```jsx
const fetchData = useCallback(async () => {
  const data = await api.get('/data');
  setData(data);
}, [userId]); // re-created only when userId changes

useEffect(() => {
  fetchData();
}, [fetchData]); // safe because fetchData has stable reference
```

### When useCallback Makes Things WORSE

```jsx
// Anti-pattern: wrapping everything "just in case"
function UserCard({ userId }) {
  // This creates a new closure AND subscribes to deps every render
  // Overhead: memoization check + deps comparison + closure creation
  const handleClick = useCallback(() => {
    console.log(userId);
  }, [userId]); // userId changes on every render anyway!

  // The child is NOT memoized — so the stable reference does nothing
  return <button onClick={handleClick}>View</button>;
}
```

Rules of thumb:
- If the consuming component is not wrapped in `React.memo`, useCallback is wasted
- If dependencies change on every render, useCallback is wasted
- If the function is defined inline and only used once, skip useCallback

---

## useMemo: Expensive Computations and Referential Equality

`useMemo` memoizes the **result** of a computation. It recomputes only when dependencies change.

### Expensive Computation Case

```jsx
function DataDashboard({ transactions, filter }) {
  // Without useMemo: re-computed on every render (e.g., parent state changes)
  // With useMemo: only re-computed when transactions or filter changes
  const summary = useMemo(() => {
    return transactions
      .filter(t => t.category === filter)
      .reduce((acc, t) => ({
        total: acc.total + t.amount,
        count: acc.count + 1,
        avg: (acc.total + t.amount) / (acc.count + 1),
      }), { total: 0, count: 0, avg: 0 });
  }, [transactions, filter]);

  return <SummaryCard data={summary} />;
}
```

**Rule of thumb**: Only apply useMemo if the computation takes >1ms. Use `console.time()` to measure before adding it. Premature memoization is a maintenance burden.

### Referential Equality Case

```jsx
// Without useMemo: new array reference on every render
// → causes FilteredList to re-render even when data/query unchanged
function SearchPage({ data, query }) {
  const filtered = data.filter(item => item.name.includes(query));
  return <FilteredList items={filtered} />; // FilteredList is memo'd
}

// With useMemo: stable reference unless data or query changes
function SearchPage({ data, query }) {
  const filtered = useMemo(
    () => data.filter(item => item.name.includes(query)),
    [data, query]
  );
  return <FilteredList items={filtered} />;
}
```

### When useMemo Hurts

```jsx
// Wasteful: trivial computation, no memo'd consumer
const doubled = useMemo(() => count * 2, [count]); // Just write: count * 2

// Wasteful: object that will never be compared
const config = useMemo(() => ({ timeout: 3000, retries: 3 }), []); // use a constant
```

---

## useRef: Three Distinct Use Cases

useRef returns `{ current: initialValue }` — a mutable box that React does NOT track. Changing `.current` never triggers a re-render.

### 1. DOM Reference

```jsx
function FocusableInput() {
  const inputRef = useRef(null);

  function handleFocus() {
    inputRef.current?.focus(); // safe with optional chaining
    inputRef.current?.select(); // also valid
  }

  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={handleFocus}>Focus Input</button>
    </>
  );
}
```

### 2. Mutable Value Without Re-render (Intervals, Timeouts, Flags)

```jsx
function AutoSave({ content }) {
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any pending save
    clearTimeout(timerRef.current);

    // Schedule new save — timerRef.current update does NOT cause re-render
    timerRef.current = setTimeout(() => {
      saveContent(content);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [content]);

  return null; // or a "Saving..." indicator using separate state
}
```

### 3. Previous Value Pattern

```jsx
function usePrevious(value) {
  const prevRef = useRef(undefined);

  useEffect(() => {
    // Runs AFTER render: prevRef now holds the value from the previous render
    prevRef.current = value;
  }); // no dependency array — runs after every render

  return prevRef.current; // returns value from the PREVIOUS render
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <p>Current: {count}, Previous: {prevCount}</p>
  );
}
```

### forwardRef: Exposing DOM Refs to Parents

```jsx
// Child exposes its internal input ref to the parent
const TextInput = React.forwardRef(function TextInput(props, ref) {
  return <input {...props} ref={ref} />;
});

// Parent can now directly focus the input
function Form() {
  const inputRef = useRef(null);

  return (
    <>
      <TextInput ref={inputRef} placeholder="Enter text" />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```

---

## useLayoutEffect vs useEffect

Both hooks take the same signature. The difference is **when** they fire relative to the browser's render cycle.

```
Component renders → React commits DOM mutations → useLayoutEffect → Browser paints → useEffect
```

### useEffect (Default — Use This)
- Fires **asynchronously** after the browser has painted
- Does NOT block the browser from showing updates
- Use for: data fetching, subscriptions, analytics, most side effects

### useLayoutEffect (Special Cases — Use Sparingly)
- Fires **synchronously** after DOM mutations but **before** browser paint
- Blocks the browser — user sees nothing until your effect completes
- Use for: DOM measurements, scroll position, animations that depend on layout

```jsx
// Classic use case: measure a DOM element and set state before paint
function Tooltip({ content, targetRect }) {
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const tooltipRef = useRef(null);

  useLayoutEffect(() => {
    // Measure tooltip height after it's in the DOM but before paint
    // If we used useEffect, user would briefly see the tooltip in wrong position
    const height = tooltipRef.current.getBoundingClientRect().height;
    setTooltipHeight(height);
  }, []);

  const top = targetRect.top - tooltipHeight; // position above target

  return (
    <div ref={tooltipRef} style={{ position: 'fixed', top }}>
      {content}
    </div>
  );
}
```

**Server-side rendering warning**: `useLayoutEffect` produces a warning when run on the server (there is no DOM). For SSR-safe code, use `useEffect` or conditionally run `useLayoutEffect` only on the client.

---

## useImperativeHandle: Exposing Child Methods

Lets you customize the ref value exposed to a parent, instead of exposing the raw DOM node:

```jsx
const VideoPlayer = forwardRef(function VideoPlayer(props, ref) {
  const videoRef = useRef(null);

  // Expose only the methods the parent should use
  useImperativeHandle(ref, () => ({
    play() { videoRef.current.play(); },
    pause() { videoRef.current.pause(); },
    seek(time) { videoRef.current.currentTime = time; },
    // Importantly, the parent CANNOT access videoRef.current directly
  }), []); // deps for recreating the handle

  return <video ref={videoRef} {...props} />;
});

function App() {
  const playerRef = useRef(null);
  return (
    <>
      <VideoPlayer ref={playerRef} src="/video.mp4" />
      <button onClick={() => playerRef.current.play()}>Play</button>
    </>
  );
}
```

---

## useId: Stable IDs for Accessibility

Generates a stable, unique ID that's consistent between server and client rendering (solving SSR hydration mismatches from `Math.random()`):

```jsx
function FormField({ label }) {
  const id = useId(); // e.g., ":r0:", ":r1:", etc.

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" />
    </div>
  );
}

// Multiple fields in a component:
function AddressForm() {
  const baseId = useId();
  return (
    <form>
      <label htmlFor={`${baseId}-city`}>City</label>
      <input id={`${baseId}-city`} />
      <label htmlFor={`${baseId}-zip`}>ZIP</label>
      <input id={`${baseId}-zip`} />
    </form>
  );
}
```

---

## React 18: useSyncExternalStore and useInsertionEffect

### useSyncExternalStore

The correct way to subscribe to external stores (Redux, Zustand, browser APIs) in Concurrent Mode. Prevents "tearing" — where different parts of the UI show different snapshots of the store.

```jsx
function useOnlineStatus() {
  return useSyncExternalStore(
    // subscribe: called when store changes, returns unsubscribe
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    // getSnapshot: returns current value (must be stable/memoized)
    () => navigator.onLine,
    // getServerSnapshot: for SSR
    () => true
  );
}
```

### useInsertionEffect

Only for CSS-in-JS library authors. Fires before any DOM mutations — lets libraries inject `<style>` tags before React reads layout. Do not use in application code.

---

## Common Anti-Patterns

```jsx
// 1. Stale closure in useCallback
function Component({ onSave }) {
  const [data, setData] = useState({});

  // BUG: onSave is captured at definition time, not latest render
  const handleSave = useCallback(() => {
    onSave(data); // data is stale if deps don't include onSave
  }, []); // missing: onSave, data

  // FIX:
  const handleSave = useCallback(() => {
    onSave(data);
  }, [onSave, data]);
}

// 2. useEffect with missing dependencies (ESLint react-hooks/exhaustive-deps catches this)
useEffect(() => {
  fetch(`/api/user/${userId}`).then(setUser); // userId not in deps!
}, []); // only runs once — misses userId changes

// 3. Creating objects in deps array — always unstable
useEffect(() => {
  // runs on EVERY render because `options` is a new object each time
}, [{ timeout: 3000 }]); // new object reference each render!
```
