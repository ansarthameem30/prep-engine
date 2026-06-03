/**
 * Day 14 Hands-On: React Performance Examples
 *
 * Each example demonstrates one optimization technique with a before/after.
 * Run with React DevTools Profiler open to measure impact.
 */

import React, {
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  Profiler,
  memo,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1: React.memo with custom comparison
// ─────────────────────────────────────────────────────────────────────────────

const USERS = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  name: `User ${i}`,
  email: `user${i}@example.com`,
  status: i % 3 === 0 ? 'active' : 'inactive',
  lastSeen: new Date().toISOString(), // changes frequently
}));

// Without custom comparison: re-renders when lastSeen changes even if irrelevant
const UserRowBasic = memo(function UserRowBasic({ user, isSelected, onSelect }) {
  console.log(`[UserRow] render: ${user.name}`);
  return (
    <tr
      style={{ background: isSelected ? '#e3f2fd' : 'white', cursor: 'pointer' }}
      onClick={() => onSelect(user.id)}
    >
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.status}</td>
    </tr>
  );
});

// With custom comparison: only re-renders when visible data or selection changes
const UserRow = memo(
  function UserRow({ user, isSelected, onSelect }) {
    return (
      <tr
        style={{ background: isSelected ? '#e3f2fd' : 'white', cursor: 'pointer' }}
        onClick={() => onSelect(user.id)}
      >
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.status}</td>
      </tr>
    );
  },
  (prev, next) =>
    prev.user.id === next.user.id &&
    prev.user.name === next.user.name &&
    prev.user.status === next.user.status &&
    prev.isSelected === next.isSelected
  // Intentionally omits lastSeen — irrelevant to this row's display
);

export function Example1_ReactMemo() {
  const [selectedId, setSelectedId] = useState(null);
  const [tick, setTick] = useState(0);

  const handleSelect = useCallback((id) => setSelectedId(id), []);

  return (
    <div>
      <h3>Example 1: React.memo with custom comparison</h3>
      <p>
        Click "Tick" to simulate frequent updates (like a WebSocket pushing lastSeen
        changes). With custom comparison, rows only re-render when their visible
        data changes.
      </p>
      <button onClick={() => setTick((t) => t + 1)}>Tick: {tick}</button>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Status</th></tr>
        </thead>
        <tbody>
          {USERS.slice(0, 5).map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelected={selectedId === user.id}
              onSelect={handleSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: Code Splitting with React.lazy
// ─────────────────────────────────────────────────────────────────────────────

// In a real app, these would be separate files:
// const HeavyChart = lazy(() => import('./HeavyChart'));
// const DataTable = lazy(() => import('./DataTable'));

// Simulated lazy components (inline for demo purposes)
const SimulatedHeavyChart = lazy(() =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          default: function HeavyChart() {
            return (
              <div style={{ background: '#f0f4c3', padding: 20, height: 200 }}>
                Chart component (simulated 800ms load)
              </div>
            );
          },
        }),
      800
    )
  )
);

function ChartSkeleton() {
  return (
    <div
      style={{
        background: '#eee',
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Loading chart...
    </div>
  );
}

export function Example2_CodeSplitting() {
  const [showChart, setShowChart] = useState(false);
  const [preloaded, setPreloaded] = useState(false);

  // Preload on hover — user intent detection
  function handlePreload() {
    if (!preloaded) {
      setPreloaded(true);
      // In a real app: import('./HeavyChart') — result is cached by webpack
      console.log('[Preload] Triggered chart preload on hover');
    }
  }

  return (
    <div>
      <h3>Example 2: Code Splitting</h3>
      <button
        onClick={() => setShowChart((s) => !s)}
        onMouseEnter={handlePreload}
      >
        {showChart ? 'Hide Chart' : 'Load Chart (hover to preload)'}
      </button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <SimulatedHeavyChart />
        </Suspense>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: Virtual List (simulating react-window behavior)
// In production: npm install react-window
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 50;
const VISIBLE_COUNT = 10;

function VirtualList({ items }) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  const endIndex = Math.min(startIndex + VISIBLE_COUNT + 2, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  const totalHeight = items.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  return (
    <div
      style={{ height: VISIBLE_COUNT * ITEM_HEIGHT, overflow: 'auto', border: '1px solid #ccc' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Spacer that gives the scrollbar the correct total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item) => (
            <div
              key={item.id}
              style={{
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderBottom: '1px solid #eee',
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Example3_Virtualization() {
  const items = useMemo(
    () =>
      Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        label: `Row ${i + 1}: ${Array(5).fill('content').join(' ')}`,
      })),
    []
  );

  return (
    <div>
      <h3>Example 3: Virtual List</h3>
      <p>
        10,000 items. Only ~12 DOM nodes rendered at a time. Scroll smoothly
        with constant memory usage.
      </p>
      <p>DOM nodes in list: ~12 (not 10,000)</p>
      <VirtualList items={items} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 4: React Profiler API
// ─────────────────────────────────────────────────────────────────────────────

const slowRenderLogs = [];

function onRender(id, phase, actualDuration, baseDuration) {
  const log = {
    id,
    phase,
    actual: actualDuration.toFixed(2),
    base: baseDuration.toFixed(2),
    slowdown: ((actualDuration / baseDuration) * 100).toFixed(0) + '%',
  };
  slowRenderLogs.push(log);

  if (actualDuration > 5) {
    console.warn(`[Profiler] Slow render detected:`, log);
  }
}

// Deliberately slow component
function SlowWidget({ count }) {
  const start = performance.now();
  while (performance.now() - start < 10) {} // block for 10ms
  return <div>Widget count: {count}</div>;
}

// Wrapped with profiler
function ProfiledDashboard() {
  const [count, setCount] = useState(0);
  const [logs, setLogs] = useState([]);

  function handleRender(...args) {
    onRender(...args);
    setLogs([...slowRenderLogs].slice(-5));
  }

  return (
    <Profiler id="Dashboard" onRender={handleRender}>
      <div>
        <button onClick={() => setCount((c) => c + 1)}>
          Trigger Render: {count}
        </button>
        <SlowWidget count={count} />
        <div style={{ marginTop: 8 }}>
          <strong>Last 5 Profiler Events:</strong>
          {logs.map((log, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>
              [{log.phase}] actual: {log.actual}ms / base: {log.base}ms
            </div>
          ))}
        </div>
      </div>
    </Profiler>
  );
}

export function Example4_Profiler() {
  return (
    <div>
      <h3>Example 4: React Profiler API</h3>
      <p>Click to trigger renders. Profiler logs timing data below.</p>
      <p>
        <small>
          Open React DevTools Profiler for flame graph visualization.
        </small>
      </p>
      <ProfiledDashboard />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 5: Context Optimization — Split Contexts
// ─────────────────────────────────────────────────────────────────────────────

const CountContext = React.createContext(0);
const ThemeContext = React.createContext('light');

// Consumer that only cares about theme — should NOT re-render on count change
const ThemeDisplay = memo(function ThemeDisplay() {
  const theme = React.useContext(ThemeContext);
  console.log('[ThemeDisplay] rendered'); // with split contexts, only on theme change
  return <div>Current theme: {theme}</div>;
});

// Consumer that only cares about count
function CountDisplay() {
  const count = React.useContext(CountContext);
  return <div>Count: {count}</div>;
}

export function Example5_ContextOptimization() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');

  return (
    <CountContext.Provider value={count}>
      <ThemeContext.Provider value={theme}>
        <div>
          <h3>Example 5: Split Contexts</h3>
          <p>
            Click "Increment Count" — ThemeDisplay should NOT re-render (split
            contexts prevent it). Check console.
          </p>
          <button onClick={() => setCount((c) => c + 1)}>
            Increment Count
          </button>
          <button
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            Toggle Theme
          </button>
          <CountDisplay />
          <ThemeDisplay />
        </div>
      </ThemeContext.Provider>
    </CountContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 800 }}>
      <h1>Day 14: Performance Optimization</h1>
      <hr /><Example1_ReactMemo />
      <hr /><Example2_CodeSplitting />
      <hr /><Example3_Virtualization />
      <hr /><Example4_Profiler />
      <hr /><Example5_ContextOptimization />
    </div>
  );
}
