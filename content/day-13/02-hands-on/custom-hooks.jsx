/**
 * Day 13 Hands-On: Custom Hooks Implementation
 *
 * Implement four production-quality custom hooks from scratch.
 * Each hook is followed by a usage demo component.
 */

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK 1: useDebounce
// Returns a debounced version of the input value.
// ─────────────────────────────────────────────────────────────────────────────

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Demo component
function DebounceDemo() {
  const [input, setInput] = useState('');
  const debouncedInput = useDebounce(input, 500);
  const [apiCallCount, setApiCallCount] = useState(0);

  useEffect(() => {
    if (debouncedInput) {
      // Simulates an API call that only fires after user stops typing
      setApiCallCount((c) => c + 1);
      console.log('[API] Searching for:', debouncedInput);
    }
  }, [debouncedInput]);

  return (
    <div>
      <h3>useDebounce Demo</h3>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type to search (debounced 500ms)..."
        style={{ width: '100%', padding: 8 }}
      />
      <p>Live value: "{input}"</p>
      <p>Debounced value: "{debouncedInput}"</p>
      <p>API calls made: {apiCallCount}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK 2: useFetch — with AbortController, retry logic, and cache
// ─────────────────────────────────────────────────────────────────────────────

// Simple in-memory cache shared across hook instances
const fetchCache = new Map();

/**
 * @param {string | null} url
 * @param {object} options
 * @param {boolean} options.cache - Enable in-memory cache
 * @param {number} options.retries - Number of retry attempts on failure
 */
export function useFetch(url, { cache = false, retries = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);

  const execute = useCallback(async (signal) => {
    if (!url) return;

    // Check cache first
    if (cache && fetchCache.has(url)) {
      setData(fetchCache.get(url));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    retryCountRef.current = 0;

    const attemptFetch = async () => {
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (signal.aborted) return;

        if (cache) fetchCache.set(url, json);
        setData(json);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) return;

        if (retryCountRef.current < retries) {
          retryCountRef.current++;
          const backoff = 2 ** retryCountRef.current * 200; // exponential backoff
          await new Promise((r) => setTimeout(r, backoff));
          await attemptFetch();
        } else {
          setError(err);
          setLoading(false);
        }
      }
    };

    await attemptFetch();
  }, [url, cache, retries]);

  useEffect(() => {
    const controller = new AbortController();
    execute(controller.signal);
    return () => controller.abort();
  }, [execute]);

  const refetch = useCallback(() => {
    if (cache) fetchCache.delete(url);
    const controller = new AbortController();
    execute(controller.signal);
  }, [url, cache, execute]);

  return { data, loading, error, refetch };
}

// Demo component
function FetchDemo() {
  const [userId, setUserId] = useState(1);
  const { data, loading, error, refetch } = useFetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`,
    { cache: true }
  );

  return (
    <div>
      <h3>useFetch Demo</h3>
      <div>
        {[1, 2, 3].map((id) => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            style={{ fontWeight: userId === id ? 'bold' : 'normal', margin: 4 }}
          >
            User {id}
          </button>
        ))}
        <button onClick={refetch}>Refetch</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {data && (
        <pre style={{ background: '#f5f5f5', padding: 8 }}>
          {JSON.stringify({ name: data.name, email: data.email }, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK 3: useLocalStorage — with SSR safety, cross-tab sync, functional updates
// ─────────────────────────────────────────────────────────────────────────────

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (newValue) => {
      try {
        const toStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(toStore);
        if (typeof window !== 'undefined') {
          if (toStore === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(toStore));
          }
        }
      } catch (err) {
        console.error('useLocalStorage write failed:', err);
      }
    },
    [key, value]
  );

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== key) return;
      try {
        setValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
      } catch {
        setValue(initialValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, initialValue]);

  const remove = useCallback(() => {
    setValue(initialValue);
    localStorage.removeItem(key);
  }, [key, initialValue]);

  return [value, set, remove];
}

// Demo component
function LocalStorageDemo() {
  const [name, setName, removeName] = useLocalStorage('demo-name', '');
  const [preferences, setPreferences] = useLocalStorage('demo-prefs', {
    theme: 'light',
    notifications: true,
  });

  return (
    <div>
      <h3>useLocalStorage Demo</h3>
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (persisted to localStorage)"
          style={{ padding: 8 }}
        />
        <button onClick={removeName}>Clear</button>
        <p>Stored name: "{name}"</p>
      </div>
      <div>
        <button
          onClick={() =>
            setPreferences((p) => ({
              ...p,
              theme: p.theme === 'light' ? 'dark' : 'light',
            }))
          }
        >
          Toggle Theme: {preferences.theme}
        </button>
        <button
          onClick={() =>
            setPreferences((p) => ({
              ...p,
              notifications: !p.notifications,
            }))
          }
        >
          Notifications: {String(preferences.notifications)}
        </button>
        <p>
          <small>(Open another tab to see cross-tab sync)</small>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK 4: useIntersectionObserver — for lazy loading and infinite scroll
// ─────────────────────────────────────────────────────────────────────────────

export function useIntersectionObserver({
  threshold = 0,
  rootMargin = '0px',
  once = false, // stop observing after first intersection
} = {}) {
  const [entry, setEntry] = useState(null);
  const ref = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([e]) => {
        setEntry(e);
        if (once && e.isIntersecting) {
          observerRef.current?.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(node);
    return () => observerRef.current?.disconnect();
  }, [threshold, rootMargin, once]);

  return {
    ref,
    isIntersecting: entry?.isIntersecting ?? false,
    entry,
  };
}

// Demo: Lazy-loaded image with fade-in on intersection
function LazyImage({ src, alt }) {
  const { ref, isIntersecting } = useIntersectionObserver({ once: true });
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        height: 200,
        background: '#eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.3s',
        opacity: loaded ? 1 : 0.3,
      }}
    >
      {isIntersecting ? (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{ width: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>Scroll to load image</span>
      )}
    </div>
  );
}

function IntersectionDemo() {
  const images = [
    'https://picsum.photos/seed/1/400/200',
    'https://picsum.photos/seed/2/400/200',
    'https://picsum.photos/seed/3/400/200',
  ];

  return (
    <div>
      <h3>useIntersectionObserver Demo</h3>
      <p>Scroll down — images load lazily as they enter the viewport.</p>
      {images.map((src, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <LazyImage src={src} alt={`Image ${i + 1}`} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 700 }}>
      <h1>Day 13: Custom Hooks</h1>
      <hr /><DebounceDemo />
      <hr /><FetchDemo />
      <hr /><LocalStorageDemo />
      <hr /><IntersectionDemo />
    </div>
  );
}
