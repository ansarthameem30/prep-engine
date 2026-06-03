/**
 * Day 20 — React Mock Day: Hands-On Exercises
 * These 5 exercises cover the most commonly asked React coding questions.
 * Implement each WITHOUT looking at your notes. Time yourself.
 * Target: complete all 5 in under 50 minutes.
 *
 * NOTE: These are plain JS implementations of React patterns
 *       since we can't render JSX here. In an interview, you'd
 *       write JSX — the logic is identical.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Custom Hook — useDebounce (Day 13)
// Implement a useDebounce hook. The debounced value only updates after
// `delay` ms have passed without a new value being set.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In React (JSX):
 *
 * function useDebounce(value, delay) {
 *   const [debouncedValue, setDebouncedValue] = useState(value);
 *
 *   useEffect(() => {
 *     const timer = setTimeout(() => setDebouncedValue(value), delay);
 *     return () => clearTimeout(timer); // cleanup: cancel if value changes
 *   }, [value, delay]);
 *
 *   return debouncedValue;
 * }
 *
 * Usage:
 *   function SearchBar() {
 *     const [query, setQuery] = useState('');
 *     const debouncedQuery = useDebounce(query, 300);
 *
 *     useEffect(() => {
 *       if (debouncedQuery) fetch(`/api/search?q=${debouncedQuery}`);
 *     }, [debouncedQuery]); // only fires 300ms after user stops typing
 *   }
 */

// Plain JS simulation of the same logic:
function createDebounceHook(delay) {
  let timer;
  let currentValue;
  let listeners = [];

  function setValue(newValue) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      currentValue = newValue;
      listeners.forEach(cb => cb(currentValue));
    }, delay);
  }

  function subscribe(callback) {
    listeners.push(callback);
    return () => { listeners = listeners.filter(cb => cb !== callback); };
  }

  return { setValue, subscribe, get current() { return currentValue; } };
}

console.log('=== Exercise 1: useDebounce ===');
const debounced = createDebounceHook(100);
debounced.subscribe(val => console.log('Debounced value:', val));

debounced.setValue('h');     // reset timer
debounced.setValue('he');    // reset timer
debounced.setValue('hello'); // this fires after 100ms
// Only "hello" prints, not 'h' or 'he'


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Custom Hook — useFetch (Day 13)
// Implement a useFetch hook that handles loading, data, and error states.
// Must cancel the request if the component unmounts (AbortController).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In React (JSX):
 *
 * function useFetch(url) {
 *   const [state, setState] = useState({ data: null, loading: true, error: null });
 *
 *   useEffect(() => {
 *     const controller = new AbortController();
 *     setState({ data: null, loading: true, error: null });
 *
 *     fetch(url, { signal: controller.signal })
 *       .then(res => {
 *         if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *         return res.json();
 *       })
 *       .then(data => setState({ data, loading: false, error: null }))
 *       .catch(err => {
 *         if (err.name === 'AbortError') return; // ignore cancellations
 *         setState({ data: null, loading: false, error: err.message });
 *       });
 *
 *     return () => controller.abort(); // cleanup on unmount or url change
 *   }, [url]);
 *
 *   return state;
 * }
 *
 * Why AbortController matters:
 *   Without it, if the component unmounts while the request is in-flight,
 *   the fetch callback still runs and calls setState on an unmounted component.
 *   React 18 doesn't throw for this anymore, but it's a memory leak and
 *   can cause state update bugs if the component remounts.
 */

console.log('\n=== Exercise 2: useFetch pattern (explained) ===');
console.log('Key points:');
console.log('1. AbortController.signal passed to fetch() — cancels on cleanup');
console.log('2. err.name === AbortError check — dont set error state on cancellation');
console.log('3. Reset to loading: true on URL change (new dependency → new effect)');
console.log('4. Always check res.ok before calling res.json() — 4xx is not thrown by fetch');


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Memoization — when useMemo/useCallback actually help (Day 12/14)
// Explain (and demonstrate in plain JS) why these should be used sparingly.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The common mistake: wrapping everything in useMemo/useCallback.
 *
 * useMemo(fn, [deps]) — returns memoized VALUE. Re-computes only when deps change.
 * useCallback(fn, [deps]) — returns memoized FUNCTION. Re-creates only when deps change.
 *
 * When to use:
 *   useMemo:     - Expensive computation (>1ms, runs often)
 *                - Reference stability needed for useEffect deps or React.memo children
 *   useCallback: - Passed as prop to React.memo child (prevents unnecessary renders)
 *                - Used in useEffect deps (stable reference prevents infinite loop)
 *
 * When NOT to use:
 *   - Primitive return values (strings, numbers): React.memo compares by value anyway
 *   - Component re-renders are cheap (most are)
 *   - The memoization overhead exceeds the computation overhead
 */

// Demonstrate reference equality (why it matters for React.memo):
function simulateMemo() {
  const deps = [1, 2, 3];
  const prevDeps = [1, 2, 3];

  // Arrays with same values are NOT referentially equal — React would re-run
  console.log('Same array contents, different reference:', deps === prevDeps); // false

  // useMemo stores the result and returns the same reference if deps unchanged
  // This prevents unnecessary re-renders of child components
}

console.log('\n=== Exercise 3: Memoization rules ===');
simulateMemo();
console.log('Use useMemo for: expensive computations, stable references for useEffect/memo children');
console.log('Avoid useMemo for: cheap computations, primitives, components that dont use React.memo');


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Performance — identify the bug in this React component (Day 14)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the 3 performance bugs in this component and explain how to fix each.
 *
 * function ProductList({ category, onProductClick }) {
 *   const [search, setSearch] = useState('');
 *
 *   // Bug 1: filteredProducts recalculated on every render
 *   const filteredProducts = products.filter(p =>
 *     p.name.toLowerCase().includes(search.toLowerCase())
 *   );
 *
 *   // Bug 2: new function reference on every render → ProductCard re-renders every time
 *   const handleClick = (id) => {
 *     analytics.track('product_click', { id, category });
 *     onProductClick(id);
 *   };
 *
 *   // Bug 3: renders entire list (could be 10,000 items)
 *   return (
 *     <div>
 *       <input value={search} onChange={e => setSearch(e.target.value)} />
 *       {filteredProducts.map(p => (
 *         <ProductCard key={p.id} product={p} onClick={handleClick} />
 *       ))}
 *     </div>
 *   );
 * }
 *
 * Fixes:
 *
 * Bug 1 → useMemo(() => products.filter(...), [search])
 *          Only refilters when search changes, not on every parent re-render.
 *
 * Bug 2 → useCallback((id) => { analytics.track(...); onProductClick(id); }, [category, onProductClick])
 *          Stable function reference only changes when category or onProductClick changes.
 *          Wrap ProductCard in React.memo() so it only re-renders when props change.
 *
 * Bug 3 → Use react-window or react-virtual (virtualization).
 *          Only renders the rows visible in the viewport (~20), not all 10,000.
 */

console.log('\n=== Exercise 4: Performance bugs ===');
console.log('Bug 1: filter on every render → useMemo with [search] dep');
console.log('Bug 2: new onClick on every render → useCallback + React.memo on child');
console.log('Bug 3: rendering 10k items → react-window virtualization');


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: State Management Decision Framework (Day 15)
// Given a scenario, choose the right state management approach and justify it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scenario 1: A cart badge showing item count on every page.
 * Scenario 2: Form state for a multi-step checkout form (local to that flow).
 * Scenario 3: The authenticated user's profile (name, avatar, permissions).
 * Scenario 4: Server data: product listings, order history.
 * Scenario 5: A modal's open/closed state.
 *
 * Answers:
 *
 * Scenario 1 (cart badge):
 *   Zustand or RTK. Global, shared across routes, updated by add-to-cart actions
 *   from different pages. Too far in the tree for prop drilling. NOT server state
 *   (cart is a UI concern until checkout). Zustand preferred for simplicity.
 *
 * Scenario 2 (multi-step form):
 *   Local useState or useReducer in the parent form component.
 *   Data only matters while the user is on that flow. Not shared globally.
 *   useReducer is better than multiple useState calls when the state has
 *   multiple fields that update together.
 *
 * Scenario 3 (user profile):
 *   React Context + useState (or Zustand). Read on every page, but rarely updated.
 *   Context is appropriate here — it's true global app state, not server data.
 *   Does NOT belong in TanStack Query because it's not "server data" that
 *   becomes stale and needs refetching.
 *
 * Scenario 4 (product listings, order history):
 *   TanStack Query (React Query). This IS server data:
 *   - Becomes stale after time
 *   - Needs refetching on focus, reconnect, cache invalidation
 *   - Benefits from deduplication (two components asking for same data = 1 request)
 *   - Optimistic updates on mutations
 *
 * Scenario 5 (modal open/close):
 *   Local useState in the parent that owns the modal.
 *   Never needs to be global unless the modal can be triggered from
 *   completely unrelated parts of the tree. Keep state as local as possible.
 */

console.log('\n=== Exercise 5: State management framework ===');
const stateDecisions = {
  'Cart badge (global UI)':       'Zustand or RTK — global, non-server state',
  'Multi-step form':              'useReducer — local complex state',
  'Auth user profile':            'Context — global app state, rarely changes',
  'Server data (products, orders)': 'TanStack Query — stale data, caching, invalidation',
  'Modal open/close':             'useState — local, single component concern',
};

Object.entries(stateDecisions).forEach(([scenario, solution]) => {
  console.log(`  ${scenario}:\n    → ${solution}`);
});

/**
 * SELF-ASSESSMENT
 * ───────────────
 * Exercise 1 (useDebounce):   Red / Yellow / Green
 * Exercise 2 (useFetch):      Red / Yellow / Green
 * Exercise 3 (Memoization):   Red / Yellow / Green
 * Exercise 4 (Perf bugs):     Red / Yellow / Green
 * Exercise 5 (State mgmt):    Red / Yellow / Green
 *
 * Any Red → revisit the specific Day (11-19) concept file.
 * Any Yellow on state management → re-read Day 15 state management concept.
 */
