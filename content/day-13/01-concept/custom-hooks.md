# Custom Hooks: Patterns and Production Patterns

## What Makes a Great Custom Hook

A custom hook is any function prefixed with `use` that calls React hooks internally. The pattern exists to extract stateful logic from components so it can be:
1. Reused across multiple components
2. Tested in isolation (with `renderHook`)
3. Reasoned about independently of UI

**Rules for custom hooks:**
- Must be called in the same position in every render (same rules as any hook)
- Must start with `use` — this is a convention that enables React's lint rules
- Should return a consistent, stable API — avoid returning raw state setters when a higher-level API is more expressive

**Signs of a well-designed hook:**
- The consumer doesn't need to know how it's implemented internally
- It handles its own cleanup (subscriptions, timers, AbortControllers)
- It handles error and loading states explicitly
- Its API is minimal — only expose what's necessary

---

## useDebounce: Implementation and Use Case

Debouncing delays executing a function until the user has stopped triggering it for a given delay. Essential for search-as-you-type to avoid firing an API call on every keystroke.

```js
// hooks/useDebounce.js

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the value.
 * The debounced value only updates after `delay` ms of inactivity.
 *
 * @param {T} value - The value to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {T} The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel the timer if value changes before delay expires
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage:
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // Only fires after user stops typing for 300ms
  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**Advanced version — debounced callback:**
```js
export function useDebouncedCallback(callback, delay) {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useMemo(
    () => debounce((...args) => callbackRef.current(...args), delay),
    [delay]
  );
}
```

---

## useFetch: Loading/Error/Data States with Cancellation

The canonical async data hook. Production implementations need cancellation (AbortController) to avoid setting state on unmounted components.

```js
// hooks/useFetch.js

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Generic fetch hook with loading, error, data states and request cancellation.
 */
export function useFetch(url, options = {}) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  // Store options in ref to avoid triggering re-fetch on every render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const refetch = useCallback(() => {
    setState({ data: null, loading: true, error: null });
  }, []);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchData() {
      try {
        const response = await fetch(url, {
          ...optionsRef.current,
          signal, // pass the signal to fetch
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Check if this effect was cancelled (component unmounted or url changed)
        if (!signal.aborted) {
          setState({ data, loading: false, error: null });
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // Request was cancelled — not an error we should surface
          return;
        }
        if (!signal.aborted) {
          setState({ data: null, loading: false, error: err });
        }
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    fetchData();

    // Cleanup: abort the in-flight request when url changes or component unmounts
    return () => controller.abort();
  }, [url]);

  return { ...state, refetch };
}

// Usage:
function UserProfile({ userId }) {
  const { data: user, loading, error, refetch } = useFetch(
    userId ? `/api/users/${userId}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;
  return <ProfileCard user={user} />;
}
```

---

## useLocalStorage: JSON Serialization + SSR Safety

```js
// hooks/useLocalStorage.js

import { useState, useCallback, useEffect } from 'react';

/**
 * Persists state to localStorage with JSON serialization.
 * SSR-safe: checks for window availability.
 * Syncs across tabs via storage event.
 */
export function useLocalStorage(key, initialValue) {
  // Lazy initializer: read from localStorage on first render only
  const [storedValue, setStoredValue] = useState(() => {
    // SSR guard: localStorage doesn't exist on the server
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.error(`useLocalStorage: failed to read key "${key}"`, err);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      // Allow functional updates: setValue(prev => prev + 1)
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        if (valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (err) {
      console.error(`useLocalStorage: failed to write key "${key}"`, err);
    }
  }, [key, storedValue]);

  // Sync across tabs — fires when another tab writes to same key
  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          setStoredValue(e.newValue);
        }
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

// Usage — same API as useState:
function ThemeSwitcher() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  );
}
```

---

## useIntersectionObserver: Infinite Scroll and Lazy Loading

```js
// hooks/useIntersectionObserver.js

import { useEffect, useRef, useState } from 'react';

/**
 * Observe when an element enters/exits the viewport.
 * Returns a ref to attach to the target element and the IntersectionObserverEntry.
 */
export function useIntersectionObserver(options = {}) {
  const [entry, setEntry] = useState(null);
  const targetRef = useRef(null);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      {
        threshold: options.threshold ?? 0,
        rootMargin: options.rootMargin ?? '0px',
        root: options.root ?? null,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.root]);

  return { ref: targetRef, entry, isIntersecting: entry?.isIntersecting ?? false };
}

// Usage: Infinite scroll
function InfiniteList() {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px', // trigger 200px before the sentinel enters view
  });

  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage(page + 1).then(newItems => {
        setItems(prev => [...prev, ...newItems]);
        setPage(p => p + 1);
      });
    }
  }, [isIntersecting]);

  return (
    <>
      {items.map(item => <ListItem key={item.id} {...item} />)}
      <div ref={sentinelRef} /> {/* trigger element at bottom */}
    </>
  );
}
```

---

## useEventListener: Clean Event Listener Management

```js
// hooks/useEventListener.js

import { useEffect, useRef } from 'react';

/**
 * Attaches an event listener to an element (default: window).
 * Automatically handles cleanup and ref stability for the handler.
 */
export function useEventListener(eventName, handler, element = window, options) {
  // Store handler in ref to avoid removing/adding listener on every render
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const target = element?.current ?? element;
    if (!target?.addEventListener) return;

    const listener = (event) => handlerRef.current(event);
    target.addEventListener(eventName, listener, options);
    return () => target.removeEventListener(eventName, listener, options);
  }, [eventName, element, options]);
}

// Usage:
function KeyboardShortcuts() {
  useEventListener('keydown', (e) => {
    if (e.metaKey && e.key === 'k') openCommandPalette();
    if (e.key === 'Escape') closeModal();
  });
}
```

---

## usePrevious and useAsync: Utility Hooks

```js
// Track previous value
export function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// Generic async state management
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });

    asyncFn()
      .then(data => {
        if (!cancelled) setState({ status: 'success', data, error: null });
      })
      .catch(error => {
        if (!cancelled) setState({ status: 'error', data: null, error });
      });

    return () => { cancelled = true; };
  }, deps);

  return state;
}
```

---

## Testing Custom Hooks with renderHook

```js
// hooks/__tests__/useDebounce.test.js

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update value before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });
    expect(result.current).toBe('initial'); // still old value

    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('initial'); // still old value

    act(() => jest.advanceTimersByTime(100)); // total 300ms
    expect(result.current).toBe('changed'); // now updated
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => jest.advanceTimersByTime(200));
    rerender({ value: 'abc' }); // reset timer

    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('a'); // timer not expired yet

    act(() => jest.advanceTimersByTime(100)); // total 300ms from last change
    expect(result.current).toBe('abc');
  });
});
```

---

## Publishing Custom Hooks as Packages

For shared hooks used across projects:

```js
// Structure for a hooks package:
// packages/hooks/
//   src/
//     useDebounce.ts
//     useFetch.ts
//     index.ts     ← barrel export
//   package.json
//   tsconfig.json

// package.json
{
  "name": "@company/hooks",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "react": ">=18.0.0"
  }
}

// Rules for publishable hooks:
// 1. No hardcoded API endpoints or config values
// 2. Accept configuration as parameters
// 3. TypeScript generic types for flexibility
// 4. Export both the hook and its return type
// 5. Full test coverage with renderHook
```
