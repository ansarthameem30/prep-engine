# Custom Hooks – Interview Q&A

## Q1: What are the rules for writing a valid custom hook?

**Answer:**
A custom hook is any JavaScript function that:
1. Has a name starting with `use` (e.g., `useAuth`, `useForm`)
2. May call other hooks (React built-ins or other custom hooks)

The `use` prefix is a naming convention that enables:
- React's own rules enforcement (hooks must be called at the top level, not inside conditionals)
- ESLint's `react-hooks/rules-of-hooks` lint rule
- React DevTools to correctly identify and display custom hooks

If a function calls hooks but doesn't start with `use`, the lint rules won't apply, and React won't detect rule violations. If a function starts with `use` but doesn't call any hooks, it still works but is misleading — use regular functions instead.

---

## Q2: How do you implement useDebounce? Walk through the cleanup logic.

**Answer:**
```js
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

Cleanup logic: Every time `value` changes, the effect runs. Before running, React calls the cleanup from the previous effect — `clearTimeout(timer)` — which cancels the pending update. A new timer starts. Only if `value` stops changing for `delay` milliseconds will the timer fire and update `debouncedValue`.

This is the essential pattern: the cleanup function from one effect execution cancels the side effect of the previous execution. Works for debouncing, throttling, or any "cancel previous work" pattern.

---

## Q3: What is the AbortController pattern in useFetch, and why is it needed?

**Answer:**
`AbortController` lets you cancel in-flight `fetch` requests. In useFetch, you create a controller, pass `controller.signal` to fetch, and call `controller.abort()` in the effect cleanup.

**Why it's needed:**
1. **Component unmount**: If the component unmounts before the fetch resolves (user navigates away), without aborting, the `.then()` callback still runs and calls `setState` on an unmounted component. React 18 doesn't warn about this, but it's still a memory leak and a potential bug.

2. **Stale requests**: If `url` changes before the previous request completes, without aborting you might get responses out of order. The second request might resolve before the first, and the first response would overwrite the second.

```js
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      if (!controller.signal.aborted) setState(data); // guard check
    })
    .catch(err => {
      if (err.name !== 'AbortError') setError(err); // ignore abort errors
    });

  return () => controller.abort(); // cleanup on url change or unmount
}, [url]);
```

---

## Q4: How would you make useLocalStorage SSR-safe, and why does it matter?

**Answer:**
`localStorage` is a browser API — it doesn't exist in Node.js (SSR environments like Next.js). Accessing it during server-side rendering throws `ReferenceError: localStorage is not defined`.

Two approaches:

**1. Guard with `typeof window`:**
```js
const [value, setValue] = useState(() => {
  if (typeof window === 'undefined') return initialValue; // server: skip
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch { return initialValue; }
});
```

**2. Lazy initialization in useState**: The `useState(() => ...)` form only runs the initializer once (on mount). Combined with the `window` guard, this prevents any localStorage access during SSR.

**Why it matters**: In Next.js with SSR, components run on the server first, then hydrate on the client. If the server renders with `initialValue` and the client immediately reads a different value from `localStorage`, you get a hydration mismatch. The proper pattern is to always initialize with `initialValue` and then sync from localStorage in a `useEffect` (which only runs client-side).

---

## Q5: Design a usePagination hook. What should its API look like?

**Answer:**
```js
// Desired API
const {
  page,
  totalPages,
  goTo,
  next,
  prev,
  canGoNext,
  canGoPrev,
} = usePagination({ totalItems: 150, itemsPerPage: 10 });

// Implementation
function usePagination({ totalItems, itemsPerPage }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const goTo = useCallback((p) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const next = useCallback(() => goTo(page + 1), [page, goTo]);
  const prev = useCallback(() => goTo(page - 1), [page, goTo]);

  // Reset to page 1 when totalItems changes (e.g., search results change)
  useEffect(() => setPage(1), [totalItems]);

  return {
    page,
    totalPages,
    goTo,
    next,
    prev,
    canGoNext: page < totalPages,
    canGoPrev: page > 1,
    startIndex: (page - 1) * itemsPerPage,
    endIndex: Math.min(page * itemsPerPage, totalItems),
  };
}
```

Design considerations: Reset to page 1 on filter/search changes, clamp page within valid range, expose `startIndex`/`endIndex` for slicing data arrays.

---

## Q6: How would you test a custom hook with renderHook?

**Answer:**
`renderHook` from `@testing-library/react` renders a component whose only job is to call your hook and return the result. No UI involved.

```js
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10));
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(10);
  });
});
```

Key points:
- All state updates must be wrapped in `act()` to flush React's update queue
- `result.current` always reflects the latest return value of the hook
- Use `rerender({ newProp: value })` to test hooks that depend on changing props
- Use `jest.useFakeTimers()` for testing debounce/throttle hooks

---

## Q7: What's the difference between a custom hook and a utility function?

**Answer:**
A custom hook calls React hooks internally; a utility function does not.

| | Custom Hook | Utility Function |
|---|---|---|
| Calls React hooks | Yes | No |
| Has React lifecycle | Yes | No |
| Can cause re-renders | Yes | No |
| Can be called anywhere | Only in components/hooks | Anywhere |
| Naming convention | `use*` | Any name |

Rule: If you need state, effects, context, or any React lifecycle integration → custom hook. If you're just transforming data, formatting strings, or doing math → utility function.

Common mistake: wrapping a pure data transformation in a custom hook "just in case." This adds unnecessary coupling to React's render cycle.

---

## Q8: How do you prevent a useFetch from re-fetching on every render when called with an inline object as options?

**Answer:**
The problem: inline objects create new references on every render, making them unstable as effect dependencies.

```js
// Re-fetches on every render because `options` is a new object each time:
const { data } = useFetch('/api/data', { method: 'POST', body: JSON.stringify(form) });
```

Solutions:

**1. Memoize options in the consuming component:**
```js
const options = useMemo(() => ({
  method: 'POST',
  body: JSON.stringify(form),
}), [form]);
const { data } = useFetch('/api/data', options);
```

**2. Inside the hook, use a ref for options and only re-fetch on URL change:**
```js
function useFetch(url, options) {
  const optionsRef = useRef(options);
  useLayoutEffect(() => { optionsRef.current = options; });
  // Effect only depends on `url`, uses optionsRef.current internally
  useEffect(() => {
    fetch(url, optionsRef.current)...
  }, [url]); // NOT [url, options]
}
```

**3. Accept specific primitive dependencies instead of an object:**
```js
function useFetch(url, { method = 'GET', body = null } = {}) {
  useEffect(() => { fetch(url, { method, body })... }, [url, method, body]);
}
```

The ref approach (option 2) is the most ergonomic for library-style hooks.
