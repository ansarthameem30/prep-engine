# React Performance Optimization – Interview Q&A

## Q1: How do you diagnose a performance problem in a React application?

**Answer:**
Start with measurement, not assumptions:

1. **React DevTools Profiler**: Record interactions and check the flame graph. Look for components with high `actualDuration`, especially those that say "why did this render?" — props change, state change, context change, or parent rendered.

2. **Browser Performance tab**: Record the interaction. Identify long tasks (>50ms) on the main thread. JavaScript execution, layout, paint.

3. **Lighthouse**: Measures LCP, FID/INP, CLS. Identifies slow initial load vs. interaction sluggishness.

4. **Chrome Coverage tab**: Shows unused JavaScript — signal for code splitting opportunities.

Diagnosis flow:
- **Too many renders?** → React.memo + useCallback + context splitting
- **Each render is slow?** → useMemo for expensive computations, virtualization for long lists
- **Initial load slow?** → Code splitting, bundle analysis, tree shaking
- **Network slow?** → Caching, prefetching, CDN

---

## Q2: What are the failure modes of React.memo?

**Answer:**
React.memo does a **shallow** prop comparison. It fails (re-renders unnecessarily) when:

1. **Object/array props created inline**: `<Child config={{ timeout: 3000 }} />` creates a new object each render.

2. **Function props without useCallback**: `<Child onClick={() => doThing()} />` is a new function reference each render.

3. **Children prop**: `<Card><Text /></Card>` — `<Text />` is a new React element each render. `React.memo` on `Card` won't help.

4. **Context consumers**: React.memo only prevents re-renders from props. If the component consumes a Context, it re-renders on any context value change, regardless of memo.

5. **Wrong comparison function**: Custom comparators can introduce subtle bugs if they don't cover all relevant props.

The fix for #1 and #2: useMemo for objects, useCallback for functions. The fix for #4: split contexts or use selectors.

---

## Q3: Explain code splitting and when it's most valuable.

**Answer:**
Code splitting divides your JavaScript bundle into smaller chunks loaded on demand. Without it, the browser must download and parse your entire application before rendering anything.

Most valuable at:
- **Route level**: Each page is a separate chunk. User downloading the Dashboard doesn't need the Settings page code. This is the highest-impact, lowest-complexity optimization.
- **Modal/drawer level**: Heavy modals (e.g., a video editor) don't need to load until opened.
- **Third-party library isolation**: Chart libraries (Highcharts, Recharts) are 300-500KB. Split them into their own chunk so they don't block initial render.

Implementation with React.lazy:
```jsx
const AdminPanel = lazy(() => import('./AdminPanel'));
<Suspense fallback={<Skeleton />}><AdminPanel /></Suspense>
```

Key limitations:
- Only works with default exports (workaround: re-export wrapper)
- Suspense fallback shows a loading state — design your fallbacks to match layout to avoid layout shift
- For very small components, split overhead (extra network request) outweighs benefit

---

## Q4: How does react-window enable virtualization, and what are its limitations?

**Answer:**
`react-window` (and `react-virtual`) renders only the items visible in the viewport, plus a small overscan buffer. It achieves this by:

1. Absolutely positioning all items within a container of total height
2. Calculating which items are visible based on `scrollTop`
3. Rendering only those items, unmounting items as they scroll out

**Performance impact**: A 10,000-item list that would normally render 10,000 DOM nodes renders ~15-20 nodes. Scroll performance stays constant regardless of total item count.

**Limitations:**
- Items must have a known height (FixedSizeList) or a height function (VariableSizeList)
- Items that change height after render (dynamic content, images loading) require resizing logic
- Ctrl+F browser search won't find un-rendered items
- Accessibility: screen readers may have difficulty with non-rendered items
- Some CSS features (position: sticky within list) don't work cleanly

For most use cases with consistent row heights, `react-window` is the right choice.

---

## Q5: Describe the problem with anonymous functions in JSX and how to solve it.

**Answer:**
```jsx
// Anonymous function — new reference every render
<input onChange={(e) => setQuery(e.target.value)} />
```

The problem has three levels:
1. A new function object is allocated on every render (minor GC pressure)
2. Any child receiving this as a prop sees it as changed, breaking React.memo
3. Any hook with this in deps array runs its effect on every render

**When it actually matters**: Only levels 2 and 3 matter in practice. Level 1 is premature optimization.

Solutions:
```jsx
// 1. useCallback when function is a prop to a memoized child
const handleChange = useCallback((e) => setQuery(e.target.value), []);

// 2. Move handler outside component if it doesn't need closure over state
// (pure event handlers)

// 3. Data attribute technique — avoids per-item closures in lists
<button data-id={item.id} onClick={handleDeleteById}>Delete</button>
function handleDeleteById(e) { handleDelete(e.currentTarget.dataset.id); }
```

The data attribute technique is particularly useful in large lists where you'd otherwise need `useCallback` for each item.

---

## Q6: What is the Context re-rendering problem and how do you solve it?

**Answer:**
When a Context value changes, React re-renders **all consumers** of that context — even if the consumer only uses a subset of the value that didn't change.

```jsx
// Bad: user and cart updates cause ALL consumers to re-render
const AppContext = createContext();
const value = { user, cart, theme }; // new object each render if any field changes
<AppContext.Provider value={value}>
```

Solutions:

**1. Split contexts by update frequency:**
```jsx
<UserContext.Provider value={user}>      // changes rarely
  <CartContext.Provider value={cart}>    // changes on cart ops
    <ThemeContext.Provider value={theme}> // changes on toggle
```

**2. Memoize context value:**
```jsx
const value = useMemo(() => ({ user, updateUser }), [user]);
<UserContext.Provider value={value}>
```

**3. Use Zustand/Jotai with selectors** — consumers only re-render when their selected slice changes:
```js
const userName = useUserStore(state => state.name); // only re-renders if name changes
```

**4. Context + useReducer + subscription pattern** (advanced) — split into state and dispatch contexts so dispatch consumers don't re-render on state changes.

---

## Q7: How would you use the React Profiler to find and fix a performance issue?

**Answer:**

**Step 1**: Open React DevTools → Profiler tab, enable "Record why each component rendered."

**Step 2**: Click "Start recording," perform the slow interaction, click "Stop recording."

**Step 3**: In the flame graph, find components with:
- High `actualDuration` (slow renders)
- Renders that show "Why did this render: props changed" for props that shouldn't have changed

**Step 4**: Click the ranked chart view — slowest components at top.

**Step 5**: For each slow component:
- "Props changed" → check if parent is passing unstable references. Fix with useMemo/useCallback.
- "Parent rendered" → add React.memo with appropriate comparison.
- "Context changed" → split contexts or add selectors.
- `actualDuration` close to `baseDuration` → memoization isn't helping here.

**Common finding**: A root-level state change (clock tick, socket message) re-renders the entire tree because no component is wrapped in React.memo. Start memoizing at the boundary between "frequently updated" and "rarely updated" components.

---

## Q8: What's the difference between browser rendering performance and React rendering performance?

**Answer:**

**React rendering** (JS layer):
- Calling component functions to produce React elements
- Diffing old vs new element trees (reconciliation)
- Measuring in `actualDuration` from the Profiler
- Bottleneck: too many re-renders, expensive computations in render

**Browser rendering** (native layer):
- Layout: computing positions and sizes of DOM elements
- Paint: filling pixels for each element
- Composite: combining painted layers into the final screen
- Measuring in browser Performance tab as "Layout," "Paint," "Composite" tasks

**The relationship**: React rendering updates the DOM → DOM changes trigger browser rendering. Even perfectly optimized React rendering can have browser rendering bottlenecks if the DOM changes are expensive (e.g., changing a CSS property that triggers layout for the entire page).

**Browser rendering optimizations**:
- Use `transform` and `opacity` for animations (GPU-accelerated, no layout trigger)
- Avoid forced synchronous layouts (reading layout-triggering CSS properties after writing, in the same JS frame)
- Use `will-change: transform` sparingly to promote elements to their own GPU layer
- Virtualize long lists to minimize total DOM node count
