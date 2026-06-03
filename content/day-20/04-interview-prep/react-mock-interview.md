# React Full Mock Interview

## Instructions
Set a timer. Treat this as a real interview. Answer each question out loud (or write your answer), then check against the model answer. Score yourself: 0 (missed it), 1 (partial), 2 (nailed it).

Target score: 26+/30 to feel confident about React interviews.

---

## SECTION 1: Conceptual Questions (15 questions × 2 pts each = 30 pts)

---

### Q1: You call `setState` twice in an event handler. How many re-renders happen in React 17 vs React 18?

**Model Answer:**
- React 17: ONE re-render (batched inside synthetic event handlers, but NOT in async code)
- React 18: ONE re-render in ALL cases (automatic batching via the scheduler)

In React 18, even setState calls inside setTimeout, Promise.then, or native event listeners are batched. To opt out: `flushSync` from react-dom.

**Gotcha follow-up**: What about `async function handleClick() { await fetch(); setA(1); setB(2); }`?
- React 17: TWO re-renders (the `await` crosses an async boundary, exiting the batch)
- React 18: ONE re-render (automatic batching catches these too)

---

### Q2: A component re-renders when its parent re-renders but none of its props changed. How do you fix this, and what pitfalls should you watch for?

**Model Answer:**
Wrap the component in `React.memo`. But watch for these failure modes:
1. Any prop that's a function — new reference each render. Fix with `useCallback`.
2. Any prop that's an object or array — new reference each render. Fix with `useMemo`.
3. Component consumes a Context — `React.memo` doesn't prevent context re-renders.
4. Component has a `children` prop — React elements are always new references.

Decision: Profile first (React DevTools "why did this render?"). Only add memo where the render cost is measurable.

---

### Q3: Explain how keys work in React, and describe a bug caused by using array index as key.

**Model Answer:**
`key` is React's identity signal for elements in a list. React matches elements across renders by key, not position.

**Bug with index as key**: Imagine a list `[A, B, C]` with index keys `[0, 1, 2]`. If you prepend `D`:
- React sees: key=0 was A, now is D (update), key=1 was B, now is A (update), etc.
- Every item "updates" instead of just inserting one.
- If list items have input state (controlled or uncontrolled), the state gets associated with the wrong item — items appear to shift.

Concrete bug: Todo list with input fields. Delete first item → inputs appear to shift up because React thinks items 1,2,3 updated but item 0 was removed.

Fix: Use stable, unique IDs as keys.

---

### Q4: What is the difference between `isLoading` and `isFetching` in TanStack Query?

**Model Answer:**
- `isPending` (was `isLoading` in v4): True only when there is **no cached data** and a request is in-flight. The component is "mounting blind."
- `isFetching`: True whenever a request is in-flight — initial load OR background refetch of stale data.

```
Scenario:              isPending  isFetching
First mount (no cache): true       true
Background refetch:     false      true
Cache hit (fresh):      false      false
```

Use `isPending` to show full skeletons. Use `isFetching && !isPending` to show a subtle "refreshing" indicator alongside visible stale data.

---

### Q5: When would you use `useReducer` instead of `useState`?

**Model Answer:**
`useReducer` is better when:
1. State transitions are complex with many sub-cases (`switch` on action type is cleaner than multiple `if` statements)
2. Next state depends on previous state in complex ways
3. Multiple state variables that update together (a form with validation state, submit state, error state)
4. State logic needs to be tested independently of the component (reducers are pure functions)
5. Actions need to be logged or replayed (like Redux)

Rule of thumb: when you write `setState(prev => { ...big transformation logic... })`, that's a sign to extract it into a reducer.

---

### Q6: Describe how you would implement an infinite scroll feature using TanStack Query.

**Model Answer:**
Use `useInfiniteQuery`:

```js
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: ({ pageParam = 1 }) => api.getItems({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  initialPageParam: 1,
});

const items = data?.pages.flatMap(p => p.items) ?? [];
```

Trigger next page with IntersectionObserver on a sentinel element at the bottom. The key points: `getNextPageParam` returns `undefined` when there are no more pages, and `data.pages` is an array of page responses that you flatten.

---

### Q7: What is React Fiber, and what problems did it solve over the stack reconciler?

**Model Answer:**
The stack reconciler (React 15-) was synchronous and non-interruptible. Once reconciliation started, it blocked the main thread until completion — causing dropped frames on complex UIs.

Fiber replaced it with an explicit linked-list data structure where each node is a unit of work. This enables React to:
- Pause work and resume later (cooperative scheduling)
- Assign priority to updates (user input > data loading)
- Abort and restart work when better information arrives
- Enable Concurrent Mode features (startTransition, Suspense)

The key mechanism: Fiber decouples "rendering" (computing what changed) from "committing" (applying changes to DOM). The render phase is pausable and restartable; the commit phase is always synchronous.

---

### Q8: What is the Compound Components pattern? Give a real example of where it shines.

**Model Answer:**
Compound Components share implicit state via Context between a parent and its designated child sub-components. The consumer gets a compositional API where they control the structure.

Real example: A `Select` or `Combobox` component:
```jsx
<Select value={selected} onChange={setSelected}>
  <Select.Trigger>
    <Select.Value placeholder="Choose..." />
  </Select.Trigger>
  <Select.Content>
    <Select.Group label="Fruits">
      <Select.Option value="apple"><AppleIcon /> Apple</Select.Option>
      <Select.Option value="banana">Banana</Select.Option>
    </Select.Group>
  </Select.Content>
</Select>
```

The consumer can add grouping, custom option renders, custom trigger content — none of which would be possible with a single-prop API like `options={[...]}`. This is exactly how Radix UI, Headless UI, and shadcn/ui work.

---

### Q9: A user reports that toggling a checkbox in a large list is slow. Walk through how you'd diagnose and fix it.

**Model Answer:**

**Diagnose first:**
1. Open React DevTools Profiler, record the toggle interaction
2. Find the component with high `actualDuration` — it's likely the list container or individual row
3. Check "why did this render?" for each item — they're all re-rendering even though only one changed

**Root cause**: The list re-renders, and because rows aren't memoized (or the `onToggle` callback is a new function reference), every row re-renders.

**Fix:**
1. Memoize list rows: `React.memo(Row)`
2. Stabilize the callback: `useCallback((id) => toggleItem(id), [])` — or use functional update: `setItems(prev => prev.map(...))`
3. If the list is very large (>500 items): add virtualization with `react-window`
4. For extreme cases: move state to a separate context or use Zustand selectors so only the toggled row re-renders

---

### Q10: Explain the difference between controlled and uncontrolled components. When do you prefer each?

**Model Answer:**
**Controlled**: React state drives the input value. `value={state}` + `onChange` handler. React is the single source of truth.

**Uncontrolled**: The DOM drives the value. You read it via `ref.current.value`. Useful when you only need the value at submission time.

```jsx
// Controlled:
<input value={name} onChange={e => setName(e.target.value)} />

// Uncontrolled:
const inputRef = useRef();
<input ref={inputRef} defaultValue="initial" />
// Read at submit: inputRef.current.value
```

Prefer controlled when:
- Real-time validation (check as user types)
- Conditional rendering based on input value
- Synchronizing multiple inputs
- The value needs to be tracked in state for other purposes

Prefer uncontrolled when:
- Simple forms with no validation until submit
- Integrating with non-React DOM code
- File inputs (always uncontrolled — `value` prop is read-only)

---

### Q11: What happens if you put an async function directly as a useEffect callback?

**Model Answer:**
The `useEffect` callback must return either nothing or a cleanup function. An `async` function returns a Promise — which React would receive as the "cleanup function" but it's not a function, so React ignores it (React 18 warns about this).

The real problem: you can't clean up (cancel) the async operation because the cleanup function isn't returned properly.

**Correct pattern:**
```js
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const data = await api.get('/users');
    if (!cancelled) setUsers(data);
  }

  fetchData();

  return () => { cancelled = true; };
}, []);
```

Or use AbortController for fetch cancellation. The `cancelled` flag prevents state updates on unmounted components.

---

### Q12: How would you implement a custom `useForm` hook? What should it handle?

**Model Answer:**
A production-quality `useForm` should handle:
1. Field value management
2. Validation (synchronous and async)
3. Error state per field
4. Submit handler that validates all fields
5. Dirty tracking (has the user changed anything?)
6. Touched tracking (has the user left a field?)

```js
function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field) {
    return (e) => setValues(v => ({ ...v, [field]: e.target.value }));
  }

  function handleBlur(field) {
    return () => setTouched(t => ({ ...t, [field]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate?.(values) ?? {};
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    await onSubmit(values);
    setIsSubmitting(false);
  }

  return { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit };
}
```

In production: use React Hook Form (RHF) which handles all this plus uncontrolled inputs, schema validation (Zod/Yup), and minimal re-renders.

---

### Q13: What is `startTransition` and how is it different from debouncing?

**Model Answer:**
`startTransition` marks a state update as "non-urgent." React can interrupt its rendering to process more urgent updates (user input). The non-urgent render starts immediately but can be abandoned and restarted.

Debouncing **delays** starting the update until the user pauses. It reduces the number of times the update is triggered.

```
User types "r","e","a","c","t":
- Debounce (300ms): update fires ONCE after 300ms of inactivity
- startTransition: update fires 5 times but is interrupted and restarted;
  only the latest one commits (effectively same as debounce for short bursts,
  but more responsive for longer pauses between keystrokes)
```

Use `startTransition` for: heavy renders where showing stale UI is acceptable, navigation transitions, filter/sort operations on large datasets.

Use debouncing for: API calls (reduce server load), expensive computations you want to avoid triggering on every keystroke.

---

### Q14: How does React know which component threw an error in an Error Boundary?

**Model Answer:**
React catches errors during the render phase (and commit phase for lifecycle methods) through `getDerivedStateFromError` and `componentDidCatch`. The React runtime wraps component function calls in try-catch internally.

`componentDidCatch` receives `errorInfo.componentStack` — a string showing the component hierarchy from where the error was thrown up to the error boundary. This is React-specific info constructed from the Fiber tree.

Important: Error Boundaries do NOT catch:
- Errors in event handlers (onClick, onChange) — use try-catch there
- Async errors (setTimeout, Promise rejections) — use `useErrorBoundary` from react-error-boundary
- SSR errors
- Errors thrown in the boundary itself

---

### Q15: You have a component that re-renders 60 times per second due to a subscription. Most other components don't need to update that fast. How do you structure this?

**Model Answer:**
Isolate the high-frequency updates:

1. **Keep high-frequency state as local as possible** — push the subscription into the component that actually needs it, not a shared parent

2. **Use Zustand selectors** — subscribe only to the specific atom, not the whole store:
```js
const mouseX = useStore(state => state.mouseX); // only re-renders on mouseX change
```

3. **Use `useDeferredValue`** for derived computations that are expensive:
```js
const deferredX = useDeferredValue(mouseX);
const position = useMemo(() => computeLayout(deferredX), [deferredX]);
```

4. **`useSyncExternalStore`** for subscribing to external data without tearing in Concurrent Mode

5. **CSS animations** for purely visual high-frequency updates — bypass React entirely for `transform`, `opacity` animations

The architecture principle: separate the "reading" component from the "derived UI" component. The reading component updates fast; React.memo prevents propagation to expensive children.

---

## SECTION 2: Component Design Challenge (10 min)

### Challenge: Design a `<Toast>` Notification System

Requirements:
- Toasts can be triggered from anywhere in the app (not just where a button is)
- Multiple toasts can be active simultaneously
- Each toast auto-dismisses after 5 seconds
- Toasts render at the bottom-right corner of the viewport (not inside a component)
- API: `toast.success("Saved!")`, `toast.error("Failed!")`, `toast.info("Loading...")`

**Walk through your design:**

**State location**: Zustand store or Context at root level — toasts need to be accessible from anywhere.

**Data structure**:
```js
const store = {
  toasts: [
    { id: '1', type: 'success', message: 'Saved!', createdAt: Date.now() }
  ],
  addToast: (message, type) => ...,
  removeToast: (id) => ...,
}
```

**Rendering**: Portal to document.body — renders outside all component trees, escapes CSS stacking.

**Auto-dismiss**: `useEffect` in each Toast with `setTimeout` that calls `removeToast(id)`. Cleanup clears the timer.

**Imperative API** (`toast.success()`): Export functions from the Zustand store directly:
```js
export const toast = {
  success: (msg) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg) => useToastStore.getState().addToast(msg, 'error'),
};
```

**Accessibility**: `role="alert"` or `role="status"`, `aria-live="polite"` or `aria-live="assertive"` for screen readers.

---

## SECTION 3: Performance Scenario

### Scenario: "Our dashboard renders 500 rows of financial data. Switching between dashboard views takes 3 seconds."

**Walk through your diagnosis and solution:**

**Step 1 — Profile (don't guess)**:
Open React DevTools Profiler. Record the view switch. Find which components have high `actualDuration`. Check "why did this render?" for each.

**Step 2 — Identify the bottleneck type**:
- All 500 rows re-rendering: → React.memo + stable callbacks
- Each row's render is slow: → useMemo for row-level computations
- 500 DOM nodes being created: → react-window virtualization
- Large JS bundle loading: → code splitting

**Step 3 — Apply targeted fixes**:
1. Memoize the row component
2. Ensure `onRowClick` and similar callbacks are stabilized with `useCallback`
3. If rows do expensive computations (e.g., formatting large numbers, building charts): `useMemo` per row
4. If the table is 500 visible rows: `react-window FixedSizeList` — renders ~15 DOM nodes
5. Wrap view switch in `startTransition` — keeps current view responsive while new view renders

**Step 4 — Measure again**: Confirm the fix worked with the Profiler.

---

## SECTION 4: State Management Architecture

### Question: "Design the state management for a real-time collaborative document editor."

**Categories of state:**

**Server state** (TanStack Query / RTK Query):
- Document content (polled or WebSocket-updated)
- Collaborator presence
- Comment threads

**WebSocket / Real-time state** (custom store or Zustand):
- Live cursor positions (60fps update, not for Redux)
- Operational transforms queue (if CRDT-based)

**Client state** (Zustand):
- Current user selection range
- UI state: sidebar open, active toolbar, zoom level
- Undo/redo history (special: use `useReducer` or Zustand with `temporal` middleware)

**Local state** (useState):
- Inline comment input while typing (don't put in global store until submitted)
- Toolbar dropdown open/closed

**Architecture decision**: For the document content, a CRDT library (Yjs, Automerge) handles the conflict-free merge logic. Zustand stores the local document state; WebSocket syncs with the server. TanStack Query handles the initial load and periodic persistence saves.

---

## Score Yourself

| Section | Score | Max |
|---------|-------|-----|
| Conceptual (Q1-Q15) | /30 | 30 |
| Component Design | /10 | 10 |
| Performance Scenario | /5 | 5 |
| Architecture | /5 | 5 |
| **Total** | **/50** | **50** |

**40-50**: Interview-ready. Move to backend deep-dive.
**30-39**: Review Days 11-19 concepts, focus on weak areas.
**Below 30**: Re-read Days 11-15, redo hands-on exercises.
