# React Internals: Virtual DOM, Fiber, and Reconciliation

## Virtual DOM: What It Actually Is

The Virtual DOM (VDOM) is a JavaScript object tree that mirrors the structure of the real DOM. When you write JSX, Babel compiles it to `React.createElement()` calls, which return plain JS objects called **React elements**:

```js
// JSX
const element = <div className="app"><h1>Hello</h1></div>;

// Compiled to:
const element = React.createElement(
  'div',
  { className: 'app' },
  React.createElement('h1', null, 'Hello')
);

// Results in this plain object:
{
  type: 'div',
  props: { className: 'app', children: [{ type: 'h1', props: { children: 'Hello' } }] }
}
```

### Why Does It Exist?

The VDOM solves three real problems:

1. **Batching**: React can accumulate multiple state updates and apply them in a single DOM pass. Direct DOM manipulation cannot batch across call frames.
2. **Diffing**: By comparing old and new VDOM trees, React identifies the minimal set of DOM operations needed. Touching the DOM is expensive — layout, paint, composite — so fewer operations mean less jank.
3. **Platform abstraction**: Because rendering is decoupled from the output target, the same component model works for React DOM, React Native, React Three Fiber, and server-side rendering. The VDOM is the shared intermediate representation.

**Critical interview point**: The VDOM is not inherently "fast." In isolation, creating JS objects and diffing them adds overhead. The win comes from _batching_ and _minimizing_ real DOM mutations. For trivial UIs, vanilla DOM manipulation is faster. React's value is in managing complexity at scale.

---

## Fiber Architecture: The Internal Engine

React Fiber (introduced in React 16) is a complete rewrite of React's core reconciliation algorithm. The previous "stack reconciler" was synchronous and non-interruptible — once React started rendering a component tree, it couldn't stop. This caused dropped frames in complex UIs.

### What Fiber Changed

The old stack reconciler used the JavaScript call stack recursively. Fiber replaced the implicit stack with an **explicit linked list of units of work** called Fiber nodes. Each Fiber node represents a component instance and stores:

- Component type (function, class, DOM element)
- Props and state
- Effect list (what DOM mutations to apply)
- Pointers: `child`, `sibling`, `return` (parent)

This data structure allows React to:
- **Pause** work in the middle of a tree traversal
- **Resume** work in a later frame
- **Abort** work that's no longer relevant (e.g., a navigation happened)
- **Prioritize** urgent updates (user input) over non-urgent ones (data loading)

### The Two Trees

React maintains two Fiber trees at all times:
- **Current tree**: What's currently rendered on screen
- **Work-in-progress (WIP) tree**: The tree being built for the next render

This double-buffering technique lets React build the next UI in memory without disrupting the current display. When the WIP tree is complete, React swaps it in atomically during the commit phase.

---

## Reconciliation Algorithm

Reconciliation is the process of comparing the old Fiber tree (current) with the new React elements returned from render to produce the WIP tree. It determines what actually needs to change in the DOM.

### The Two Heuristics

React's diffing algorithm is O(n) because it relies on two assumptions:

**1. Elements of different types produce different trees.**

When the root element type changes (e.g., `<div>` → `<span>`), React tears down the entire subtree and builds a new one from scratch. Class component instances are destroyed; functional component state is lost.

```jsx
// React unmounts OldComponent entirely and mounts NewComponent fresh
// Even if they look identical, different component references = full unmount/remount
{condition ? <ComponentA /> : <ComponentB />}
```

**2. The `key` prop signals stable identity across renders.**

Without keys, React matches children by position. With keys, React matches by identity regardless of position. This is why reordering a keyed list is O(n) instead of O(n²):

```jsx
// BAD: index as key — defeats the purpose
{items.map((item, i) => <Item key={i} data={item} />)}

// Why it's bad: if you prepend an item, React thinks:
// - key=0 changed (needs update)
// - key=1 changed (needs update)
// - key=2 is new
// Every item updates instead of just inserting one

// GOOD: stable unique ID
{items.map(item => <Item key={item.id} data={item} />)}

// Now prepending causes:
// - key=newId is new (mount)
// - key=existingId1 unchanged (skip)
// - key=existingId2 unchanged (skip)
```

### Component Type Matching

When reconciling, React checks if the element type matches the current Fiber:
- Same type: update the existing Fiber (props diff, state preserved)
- Different type: unmount old, mount new

This is why defining components inside other components is an anti-pattern:

```jsx
// BUG: Every render creates a NEW function reference for InnerComponent
function Outer() {
  function InnerComponent() { return <div />; } // new reference each render
  return <InnerComponent />; // React sees different type every render → full remount
}

// FIX: Define outside, or use useMemo for dynamic components
function InnerComponent() { return <div />; }
function Outer() {
  return <InnerComponent />;
}
```

---

## React Rendering Phases

### Render Phase (Pure — No Side Effects)

During the render phase, React calls your component functions and builds the WIP Fiber tree. This phase is:
- **Pure**: no DOM mutations, no side effects allowed
- **Interruptible** in Concurrent Mode: React can pause and discard this work
- **Potentially called multiple times** for the same update (StrictMode double-invokes here)

What happens in render phase:
1. React calls the component function
2. React diffs the returned elements against the current Fiber tree
3. React builds a list of effects (mutations, layouts, passives)

### Commit Phase (Synchronous — DOM Updates)

After the render phase produces the complete WIP tree, React enters the commit phase. This is **always synchronous** — React does not yield to the browser until it finishes. Three sub-phases:

1. **Before mutation**: Calls `getSnapshotBeforeUpdate` for class components, schedules `useLayoutEffect` cleanups
2. **Mutation**: Applies DOM insertions, updates, deletions; calls `useLayoutEffect` cleanups from previous render
3. **Layout**: Fires `useLayoutEffect` (synchronously after DOM mutations but before browser paint), updates refs

After commit, React schedules:
- **Passive effects** (`useEffect`) — fired asynchronously after browser paint

```
Render Phase → Commit Phase → Browser Paints → useEffect fires
                    ↓
               useLayoutEffect fires (between commit and paint)
```

---

## Automatic Batching in React 18

Before React 18, batching only happened inside React event handlers:

```jsx
// React 17: Only ONE re-render (batched inside onClick)
function handleClick() {
  setCount(c => c + 1);
  setName('Alice');
}

// React 17: TWO re-renders (not batched — outside React event)
setTimeout(() => {
  setCount(c => c + 1); // re-render 1
  setName('Alice');     // re-render 2
}, 1000);
```

React 18 introduced **automatic batching** everywhere — including `setTimeout`, `Promise.then`, and native event handlers:

```jsx
// React 18: ONE re-render in ALL cases
setTimeout(() => {
  setCount(c => c + 1); // batched
  setName('Alice');     // batched — only one re-render
}, 1000);

// Opt out if needed (rare)
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1)); // forces immediate re-render
flushSync(() => setName('Alice'));      // forces another
```

---

## Concurrent Features: startTransition and useDeferredValue

### startTransition

Marks a state update as "non-urgent." React can interrupt rendering triggered by a transition to handle urgent updates (typing, clicking):

```jsx
import { startTransition, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleInput(e) {
    // Urgent: update input immediately
    setQuery(e.target.value);

    // Non-urgent: defer heavy results update
    startTransition(() => {
      setResults(heavySearch(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleInput} />
      {isPending ? <Spinner /> : <ResultsList data={results} />}
    </>
  );
}
```

**Gotcha**: `startTransition` does NOT debounce. The update starts immediately but can be interrupted. For debouncing, you still need `setTimeout` or `useDeferredValue`.

### useDeferredValue

`useDeferredValue` defers the update of a _value_ rather than wrapping the setter. Useful when you receive a value from props or context and want to defer the expensive render that uses it:

```jsx
function HeavyList({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery lags behind query during fast updates
  const filtered = useMemo(() => expensiveFilter(deferredQuery), [deferredQuery]);
  return <List items={filtered} />;
}
```

---

## StrictMode: Why It Double-Renders

In development, `<React.StrictMode>` intentionally double-invokes:
- Component function bodies (render)
- `useState` initializers
- `useReducer` reducers
- `useMemo` and `useCallback` callbacks

**Why?** React 18 Concurrent Mode can render components multiple times before committing. StrictMode surfaces bugs caused by impure render functions — if your component has side effects in the render phase, the double-invoke will expose them.

```jsx
// Bug this catches:
function BadComponent() {
  // Side effect in render phase — runs TWICE in StrictMode dev
  console.log('Fetching...'); // you'll see this twice in dev
  fetch('/api/data'); // fires twice! Bug exposed by StrictMode
  return <div />;
}
```

`useEffect` is also double-invoked in React 18 StrictMode (mount → unmount → remount) to verify that effects properly clean up. If your app breaks on the second mount, your effect has a cleanup bug.

---

## When Components Re-render

Understanding re-render triggers is essential for performance work:

```jsx
// 1. State change
const [count, setCount] = useState(0);
setCount(1); // triggers re-render

// 2. Props change (parent re-renders passes new props)
function Parent() {
  const [x, setX] = useState(0);
  return <Child value={x} />; // Child re-renders when Parent does, even if x unchanged
}

// 3. Context change
const ThemeContext = createContext();
// Any consumer re-renders when ThemeContext value changes

// 4. Parent re-render (without React.memo)
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <ExpensiveChild /> {/* Re-renders on every count change even with no props! */}
    </>
  );
}

// Fix with React.memo:
const ExpensiveChild = React.memo(function ExpensiveChild() {
  return <div>Expensive</div>;
});
```
