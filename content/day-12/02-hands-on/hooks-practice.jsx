/**
 * Day 12 Hands-On: Advanced Hooks Practice
 *
 * Four focused exercises targeting the most common hooks interview scenarios.
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  forwardRef,
  memo,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 1: useCallback to Fix Child Re-renders
// The parent has multiple state variables. The child should only re-render
// when its relevant props change, not on every parent re-render.
// ─────────────────────────────────────────────────────────────────────────────

// Memoized child — will only re-render if props shallowly change
const UserActions = memo(function UserActions({ userId, onDelete, onEdit }) {
  console.log(`[UserActions] rendered for user ${userId}`);
  return (
    <div>
      <button onClick={() => onEdit(userId)}>Edit</button>
      <button onClick={() => onDelete(userId)}>Delete</button>
    </div>
  );
});

export function Exercise1_UseCallback() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
  const [unrelatedCount, setUnrelatedCount] = useState(0);
  const [editingId, setEditingId] = useState(null);

  // Without useCallback: new function references on every render
  // → every UserActions re-renders when unrelatedCount changes

  // With useCallback: stable references that only change when setUsers changes
  const handleDelete = useCallback((id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []); // setUsers is stable (from useState), so [] is safe

  const handleEdit = useCallback((id) => {
    setEditingId(id);
  }, []);

  return (
    <div>
      <h3>Exercise 1: useCallback</h3>
      <p>
        Click "Increment Unrelated" — UserActions should NOT re-render (check
        console).
      </p>
      <button onClick={() => setUnrelatedCount((c) => c + 1)}>
        Increment Unrelated: {unrelatedCount}
      </button>
      {editingId && <p>Editing user: {editingId}</p>}
      {users.map((user) => (
        <div key={user.id}>
          <span>{user.name}</span>
          <UserActions
            userId={user.id}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 2: useMemo for Expensive Filtering + Sorting
// A large list needs to be filtered and sorted. Without memoization, this
// runs on every render — including when unrelated state changes.
// ─────────────────────────────────────────────────────────────────────────────

// Generate a large dataset
const PRODUCTS = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  name: `Product ${i}`,
  price: Math.round(Math.random() * 1000),
  category: ['Electronics', 'Clothing', 'Books', 'Food'][i % 4],
  rating: Math.round((Math.random() * 4 + 1) * 10) / 10,
}));

function expensiveFilter(products, category, minRating, sortBy) {
  // Mark the start to make the computation visible
  const start = performance.now();

  const result = products
    .filter(
      (p) =>
        (!category || p.category === category) &&
        p.rating >= minRating
    )
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

  const elapsed = performance.now() - start;
  if (elapsed > 5) console.log(`[Filter] took ${elapsed.toFixed(1)}ms`);

  return result;
}

export function Exercise2_UseMemo() {
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [unrelatedToggle, setUnrelatedToggle] = useState(false);

  // Without useMemo: expensiveFilter runs even when unrelatedToggle changes
  // With useMemo: only re-runs when filter parameters change
  const filtered = useMemo(
    () => expensiveFilter(PRODUCTS, category, minRating, sortBy),
    [category, minRating, sortBy]
    // Notice: unrelatedToggle is NOT a dep — won't cause recomputation
  );

  return (
    <div>
      <h3>Exercise 2: useMemo</h3>
      <p>
        Clicking "Toggle Unrelated" doesn't recompute the filtered list.
        Changing filters does.
      </p>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All Categories</option>
        <option value="Electronics">Electronics</option>
        <option value="Clothing">Clothing</option>
        <option value="Books">Books</option>
        <option value="Food">Food</option>
      </select>
      <input
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={minRating}
        onChange={(e) => setMinRating(Number(e.target.value))}
      />
      <span>Min rating: {minRating}</span>
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="name">Name</option>
        <option value="price-asc">Price ↑</option>
        <option value="price-desc">Price ↓</option>
        <option value="rating">Rating</option>
      </select>
      <button onClick={() => setUnrelatedToggle((t) => !t)}>
        Toggle Unrelated (no filter recompute): {String(unrelatedToggle)}
      </button>
      <p>Showing {filtered.length} products</p>
      <ul style={{ maxHeight: 200, overflow: 'auto' }}>
        {filtered.slice(0, 20).map((p) => (
          <li key={p.id}>
            {p.name} — ${p.price} — ★{p.rating}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 3: useRef for Focus Management + Interval Tracking
// Pattern 1: Focus management with forwardRef
// Pattern 2: Interval ID storage without triggering re-renders
// ─────────────────────────────────────────────────────────────────────────────

// Pattern 1: forwardRef to expose focus to parent
const SearchInput = forwardRef(function SearchInput(
  { placeholder, onSearch },
  ref
) {
  const [value, setValue] = useState('');

  function handleChange(e) {
    setValue(e.target.value);
    onSearch(e.target.value);
  }

  return (
    <input
      ref={ref}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={{ padding: 8, fontSize: 14 }}
    />
  );
});

// Pattern 2: Stopwatch using useRef for interval ID
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null); // stores interval ID — no re-render on change
  const startTimeRef = useRef(0);  // stores start timestamp

  function start() {
    if (running) return;
    startTimeRef.current = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 10);
    setRunning(true);
  }

  function stop() {
    clearInterval(intervalRef.current);
    setRunning(false);
  }

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
  }

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div>
      <p style={{ fontFamily: 'monospace', fontSize: 24 }}>
        {(elapsed / 1000).toFixed(2)}s
      </p>
      <button onClick={start} disabled={running}>Start</button>
      <button onClick={stop} disabled={!running}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

export function Exercise3_UseRef() {
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');

  return (
    <div>
      <h3>Exercise 3: useRef</h3>
      <p>Pattern 1: Parent focuses child input via forwardRef</p>
      <SearchInput ref={searchRef} placeholder="Search..." onSearch={setQuery} />
      <button onClick={() => searchRef.current?.focus()}>
        Focus Search Input
      </button>
      <p>Query: {query}</p>
      <hr />
      <p>Pattern 2: Stopwatch — interval ID stored in ref (no re-render from it)</p>
      <Stopwatch />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 4: useLayoutEffect for Scroll Position Restoration
// When navigating back to a list, restore the user's scroll position.
// Must use useLayoutEffect to avoid visible flash at top then scroll.
// ─────────────────────────────────────────────────────────────────────────────

const SCROLL_KEY = 'list-scroll-position';

function ScrollableList({ items }) {
  const containerRef = useRef(null);

  // useLayoutEffect: runs synchronously after DOM update, before paint
  // If we used useEffect, user would see list at top for one frame, then scroll
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);
    if (savedPosition && containerRef.current) {
      containerRef.current.scrollTop = parseInt(savedPosition, 10);
    }

    // Save scroll position when component unmounts (navigating away)
    return () => {
      if (containerRef.current) {
        sessionStorage.setItem(SCROLL_KEY, containerRef.current.scrollTop);
      }
    };
  }, []); // only on mount/unmount

  return (
    <div
      ref={containerRef}
      style={{ height: 300, overflow: 'auto', border: '1px solid #ccc' }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ padding: 16, borderBottom: '1px solid #eee' }}>
          {item}
        </div>
      ))}
    </div>
  );
}

export function Exercise4_UseLayoutEffect() {
  const [showList, setShowList] = useState(true);
  const items = Array.from({ length: 50 }, (_, i) => `List Item ${i + 1}`);

  return (
    <div>
      <h3>Exercise 4: useLayoutEffect</h3>
      <p>
        Scroll down in the list, click "Hide List", then "Show List".
        Your scroll position is restored synchronously — no flash.
      </p>
      <button onClick={() => setShowList((s) => !s)}>
        {showList ? 'Hide List' : 'Show List'}
      </button>
      {showList && <ScrollableList items={items} />}
    </div>
  );
}

// Main App
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 800 }}>
      <h1>Day 12: Advanced Hooks Practice</h1>
      <hr /><Exercise1_UseCallback />
      <hr /><Exercise2_UseMemo />
      <hr /><Exercise3_UseRef />
      <hr /><Exercise4_UseLayoutEffect />
    </div>
  );
}
