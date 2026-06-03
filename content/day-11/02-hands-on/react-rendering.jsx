/**
 * Day 11 Hands-On: React Rendering Exercises
 *
 * Run with: npx create-react-app react-rendering-demo
 * Or paste into a React sandbox (codesandbox.io)
 *
 * Open React DevTools Profiler to observe re-renders visually.
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useTransition,
  useRef,
  memo,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 1: Demonstrate Unnecessary Re-renders
// Problem: ExpensiveChild re-renders every time Parent state changes,
// even though it receives no relevant props.
// ─────────────────────────────────────────────────────────────────────────────

// Render counter — use a ref so counting doesn't cause its own re-renders
function useRenderCount(label) {
  const count = useRef(0);
  count.current += 1;
  console.log(`[RENDER] ${label}: render #${count.current}`);
  return count.current;
}

function ExpensiveChildUnmemoized({ onLog }) {
  const renderCount = useRenderCount('ExpensiveChildUnmemoized');

  // Simulate an expensive computation inline
  const items = Array.from({ length: 1000 }, (_, i) => i * 2);

  return (
    <div style={{ border: '1px solid red', padding: 8 }}>
      <p>Unmemoized Child — Rendered {renderCount} times</p>
      <p>Item count: {items.length}</p>
      <button onClick={onLog}>Log from child</button>
    </div>
  );
}

export function Exercise1_UnnecessaryRerenders() {
  const [count, setCount] = useState(0);

  // This handler is a NEW function reference on every render
  // so even with React.memo it would cause re-renders (see Exercise 2)
  function handleLog() {
    console.log('Child button clicked');
  }

  return (
    <div>
      <h2>Exercise 1: Unnecessary Re-renders</h2>
      <p>
        Click the counter. Watch the console — ExpensiveChild re-renders on
        EVERY click even though nothing about it changed.
      </p>
      <button onClick={() => setCount((c) => c + 1)}>
        Counter: {count}
      </button>
      <ExpensiveChildUnmemoized onLog={handleLog} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 2: Fix with React.memo + useCallback
// React.memo does a shallow comparison of props.
// If a prop is a function, it changes reference every render unless useCallback.
// ─────────────────────────────────────────────────────────────────────────────

// React.memo wraps the component — skips render if props are shallowly equal
const ExpensiveChildMemoized = memo(function ExpensiveChildMemoized({ onLog }) {
  const renderCount = useRenderCount('ExpensiveChildMemoized');

  return (
    <div style={{ border: '1px solid green', padding: 8 }}>
      <p>Memoized Child — Rendered {renderCount} times</p>
      <button onClick={onLog}>Log from child</button>
    </div>
  );
});

// Custom comparison function — use when default shallow equal isn't enough
const ExpensiveChildCustomMemo = memo(
  function ExpensiveChildCustomMemo({ data, onLog }) {
    const renderCount = useRenderCount('ExpensiveChildCustomMemo');
    return (
      <div style={{ border: '1px solid blue', padding: 8 }}>
        <p>Custom Memo Child — Rendered {renderCount} times</p>
        <p>Data ID: {data.id}</p>
        <button onClick={onLog}>Log</button>
      </div>
    );
  },
  // Only re-render if data.id changes (ignore other data fields)
  (prevProps, nextProps) => prevProps.data.id === nextProps.data.id
);

export function Exercise2_FixWithMemo() {
  const [count, setCount] = useState(0);
  const [data] = useState({ id: 1, noise: Math.random() });

  // WITHOUT useCallback: new function reference every render → memo is defeated
  // const handleLogBad = () => console.log('clicked'); // uncomment to see re-renders

  // WITH useCallback: stable reference → memo works
  const handleLog = useCallback(() => {
    console.log('Child button clicked, parent count is', count);
  }, [count]); // count in deps because closure captures it

  // Key insight: if handleLog doesn't need count, use [] deps for max stability
  const handleLogStable = useCallback(() => {
    console.log('Stable handler — does not capture count');
  }, []); // empty deps = created once, never changes

  return (
    <div>
      <h2>Exercise 2: Fix with React.memo + useCallback</h2>
      <p>
        Green box: memoized + stable callback = no re-render on counter click.
        <br />
        Blue box: custom comparator ignores data.noise changes.
      </p>
      <button onClick={() => setCount((c) => c + 1)}>
        Counter: {count}
      </button>
      <ExpensiveChildMemoized onLog={handleLogStable} />
      <ExpensiveChildCustomMemo data={data} onLog={handleLogStable} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 3: Automatic Batching in React 18
// Before React 18: multiple setState in setTimeout/Promise = multiple renders.
// React 18: ALL setState calls are batched automatically.
// ─────────────────────────────────────────────────────────────────────────────

export function Exercise3_Batching() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  const renderCount = useRenderCount('Exercise3_Batching');

  // React 18: even inside setTimeout, these batch into ONE render
  function handleTimeoutBatch() {
    setTimeout(() => {
      setCount((c) => c + 1); // \
      setFlag((f) => !f);     //  > ONE render, not two
    }, 0);                    // /
  }

  // React 18: also batched inside async/await
  async function handleAsyncBatch() {
    const result = await Promise.resolve(42);
    setCount((c) => c + result); // \
    setFlag((f) => !f);          //  > ONE render in React 18
  }

  // Force immediate render (opt-out of batching — rare use case)
  function handleFlushSync() {
    import('react-dom').then(({ flushSync }) => {
      flushSync(() => setCount((c) => c + 1)); // render 1
      flushSync(() => setFlag((f) => !f));     // render 2 (two renders total)
    });
  }

  return (
    <div>
      <h2>Exercise 3: Automatic Batching</h2>
      <p>Component rendered: {renderCount} times</p>
      <p>count: {count} | flag: {String(flag)}</p>
      <button onClick={handleTimeoutBatch}>
        Batch in setTimeout (React 18 = 1 render)
      </button>
      <button onClick={handleAsyncBatch}>
        Batch in async/await (React 18 = 1 render)
      </button>
      <button onClick={handleFlushSync}>
        flushSync (opt-out = 2 renders)
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE 4: useTransition for Heavy UI Update
// startTransition marks the update as "non-urgent" — React keeps the UI
// responsive and shows isPending=true while the expensive render happens.
// ─────────────────────────────────────────────────────────────────────────────

// Simulate a slow component (blocks the thread for ~50ms per item)
function SlowItem({ text }) {
  // Simulate work (in real life this might be a complex chart or data grid)
  const startTime = performance.now();
  while (performance.now() - startTime < 0.5) {
    // artificial slowdown — do NOT do this in production
  }
  return <li>{text}</li>;
}

const SlowList = memo(function SlowList({ query }) {
  const items = Array.from({ length: 200 }, (_, i) => `Item ${i}: ${query}`);
  return (
    <ul style={{ height: 200, overflow: 'auto' }}>
      {items.map((item, i) => (
        <SlowItem key={i} text={item} />
      ))}
    </ul>
  );
});

export function Exercise4_UseTransition() {
  const [query, setQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;

    // Urgent: update the input immediately (user sees their keystrokes)
    setQuery(value);

    // Non-urgent: defer the heavy list re-render
    // React will interrupt this if more urgent updates arrive
    startTransition(() => {
      setDeferredQuery(value);
    });
  }

  return (
    <div>
      <h2>Exercise 4: useTransition</h2>
      <p>
        Type in the input. Notice the input stays responsive even while the
        list (200 slow items) re-renders.
      </p>
      <input
        value={query}
        onChange={handleChange}
        placeholder="Search items..."
        style={{ fontSize: 16, padding: 8, width: '100%' }}
      />
      {isPending && (
        <p style={{ color: 'orange' }}>Updating list... (pending)</p>
      )}
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        <SlowList query={deferredQuery} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP — Combine all exercises
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 800 }}>
      <h1>Day 11: React Rendering Exercises</h1>
      <hr />
      <Exercise1_UnnecessaryRerenders />
      <hr />
      <Exercise2_FixWithMemo />
      <hr />
      <Exercise3_Batching />
      <hr />
      <Exercise4_UseTransition />
    </div>
  );
}
