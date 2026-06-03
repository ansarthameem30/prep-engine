# Day 56 — Full 15-Question React Mock Interview

---

## Q1 (Conceptual): Explain React's reconciliation process.

**Model Answer:**
Reconciliation is React's process of comparing the previous virtual DOM tree with the new one and determining the minimal set of DOM operations needed.

React's diffing algorithm makes two assumptions to achieve O(n) complexity (vs O(n³) for a general tree diff):
1. Two elements of different types will produce different trees — React replaces the entire subtree
2. Developer provides stable `key` props for list items to identify which items moved vs were inserted/deleted

**Fiber architecture (React 16+)**: React builds a "work-in-progress" fiber tree (a copy of the current tree). It processes this tree in phases:
- **Render phase**: Traverses the fiber tree, runs your components, builds the new virtual DOM. This phase is interruptible — React can pause, abort, or resume.
- **Commit phase**: Applies DOM mutations. This phase is synchronous and cannot be interrupted.

**Why this matters**: With Concurrent Mode, React can interrupt the render phase to handle higher-priority updates (user input), then resume the interrupted work. This keeps the UI responsive.

---

## Q2 (Conceptual): What are the rules of hooks and why do they exist?

**Model Answer:**
**Rule 1**: Only call hooks at the top level — not inside loops, conditions, or nested functions.
**Rule 2**: Only call hooks from React function components or custom hooks.

**Why**: React stores hook state in a linked list indexed by the order of hook calls. Each render must call hooks in the exact same order so React can associate each hook call with its stored state.

If you use a hook conditionally:
```js
// BROKEN — hook order changes depending on condition
if (someCondition) {
  const [x, setX] = useState(0); // sometimes hook #1, sometimes hook #2
}
const [y, setY] = useState(''); // React reads the wrong state slot
```

The ESLint plugin `eslint-plugin-react-hooks` enforces these rules statically. In CI, any hook rule violation is a build error.

---

## Q3 (Conceptual): When would you use `useReducer` over `useState`?

**Model Answer:**
`useReducer` is better when:
1. **State has complex logic**: multiple state values that change together, with logic for how they transition
2. **Next state depends on previous state**: `(state, action) => newState` makes this explicit
3. **Many related state updates**: instead of 5 `useState` calls that all update together, one reducer keeps transitions consistent
4. **Testing**: pure reducer functions are easy to unit test — just call `reducer(state, action)` and check the output

```js
// Instead of 5 useState calls for a form:
const [formState, dispatch] = useReducer(formReducer, initialState);
dispatch({ type: 'SET_FIELD', field: 'email', value: 'x@y.com' });
dispatch({ type: 'SUBMIT' }); // sets loading: true, clears errors atomically
```

**Not needed for**: simple boolean toggles, single-value state with no complex logic.

---

## Q4 (Conceptual): Explain the React rendering performance optimization strategies.

**Model Answer:**
**`React.memo`**: Wraps a component. Prevents re-render if props haven't changed (shallow comparison). Use when: a component is expensive to render AND its parent re-renders frequently with unchanged props.

**`useMemo`**: Memoizes a computed value. Use when: an expensive calculation runs on every render. Example: filtering a 10K item list on every keystroke.

**`useCallback`**: Memoizes a function reference. Critical when passing callbacks to `React.memo` components — without it, a new function is created on every render, breaking the memo.

**Virtualization**: For long lists (1000+ items), render only what's visible using `react-window` or `react-virtual`. Never render 10,000 DOM nodes if only 20 are visible.

**Code splitting**: `React.lazy` + `Suspense` for route-level and component-level splitting. Users download only what they need.

**Profiling first**: Don't optimize without measuring. React DevTools Profiler shows which components re-render and why. Fix actual bottlenecks, not hypothetical ones.

---

## Q5 (Conceptual): How does state management work in large React applications? Compare approaches.

**Model Answer:**
**useState + prop drilling**: Works for small component trees. Becomes painful when state needs to reach deeply nested components (3+ levels).

**Context API**: Built-in. Good for low-frequency updates (theme, current user, language). Bad for high-frequency updates — every context consumer re-renders when context value changes, even if they only use an unchanged subset.

**Zustand**: Lightweight store. Components subscribe to specific slices — they only re-render when their slice changes. Much simpler API than Redux. Good default for medium apps.

**Redux Toolkit**: Battle-tested for large, complex apps. DevTools with time-travel debugging. Boilerplate-reduced vs classic Redux. Good when: many interconnected state transitions, need for serializable state, complex async flows (RTK Query handles data fetching).

**React Query / SWR**: Dedicated server state management. Handles caching, background refresh, loading/error states, pagination, optimistic updates. Removes the need to store server data in Redux. Best combined with Zustand/context for UI state.

**The modern recommendation**: React Query (or TanStack Query) for server state + Zustand for client UI state + Context for static config (theme, locale). Only reach for Redux Toolkit if you need its DevTools or have genuinely complex state machines.

---

## Q6 (Code Review — Spot the Bug): What is wrong with this code?

```jsx
function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setUsers(data));
  }); // Missing dependency array!
  
  return users.map(u => <div>{u.name}</div>); // Missing key prop
}
```

**Model Answer:**
Two bugs:
1. **Missing `[]` dependency array on `useEffect`**: Without deps array, the effect runs after EVERY render. Fetching sets state → triggers re-render → runs effect again → fetches again → infinite loop. Fix: `useEffect(() => { ... }, [])` to run only on mount.
2. **Missing `key` prop on list items**: `users.map(u => <div key={u.id}>{u.name}</div>)`. Without keys, React can't reconcile the list correctly. May cause bugs when items are added/removed.
3. **Bonus**: No cleanup for cancelled requests — if component unmounts during fetch, `setUsers` call on unmounted component causes a warning. Fix: AbortController.

---

## Q7 (Code Review — Anti-Pattern): What is wrong here?

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveChild 
        onClick={() => console.log('clicked')} 
        style={{ color: 'red' }}
      />
    </div>
  );
}
const ExpensiveChild = React.memo(({ onClick, style }) => {
  console.log('Rendering ExpensiveChild');
  return <div style={style} onClick={onClick}>Child</div>;
});
```

**Model Answer:**
`React.memo` is ineffective here because:
1. `onClick={() => console.log('clicked')}` creates a **new function reference** on every `Parent` render. React.memo's shallow comparison sees a different function → re-renders `ExpensiveChild` every time.
2. `style={{ color: 'red' }}` creates a **new object reference** on every render. Same issue.

Fix:
```jsx
const handleClick = useCallback(() => console.log('clicked'), []);
const childStyle = useMemo(() => ({ color: 'red' }), []);
```
Or move constants outside the component if they don't depend on props/state.

---

## Q8 (Code Review — Bug): What's wrong with this useEffect?

```jsx
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(setResults);
  }, [query]);
  
  return <List items={results} />;
}
```

**Model Answer:**
**Race condition**: If the user types "a" then "ab" rapidly, two requests are in flight. "ab" may resolve before "a". Then "a" resolves last and overwrites the "ab" results with stale data.

Fix with AbortController:
```jsx
useEffect(() => {
  const controller = new AbortController();
  
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setResults)
    .catch(err => {
      if (err.name !== 'AbortError') throw err; // ignore intentional cancellations
    });
  
  return () => controller.abort(); // cancel previous request when query changes
}, [query]);
```

---

## Q9 (Design): Design an Autocomplete component. Walk through your approach.

**Model Answer:**
(Use the 5-step approach from the concept file)

**Requirements**: Async suggestions from API, keyboard navigation, accessible.

**State**: `query` (string), `suggestions` (array), `isOpen` (bool), `highlightedIndex` (number), `isLoading` (bool).

**Key implementation details**:
1. Debounce the fetch: `useDebounce(query, 300)` — don't fetch on every keystroke
2. Cancel in-flight requests: AbortController cleanup in useEffect
3. Keyboard navigation: `onKeyDown` handles ArrowUp/ArrowDown (update highlightedIndex), Enter (select), Escape (close)
4. Click outside: `useEffect` attaches document click listener, checks if click was inside component via `ref.current.contains(event.target)`
5. ARIA: `role="combobox"`, `aria-expanded`, `aria-activedescendant` for screen readers

```jsx
function Autocomplete({ onSearch, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  
  // Debounced search
  useEffect(() => {
    if (!query) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const results = await onSearch(query);
      setSuggestions(results);
      setIsOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);
  
  // ... keyboard handler, click outside, render
}
```

---

## Q10 (Design): Design a Modal system that can be triggered from anywhere in the app.

**Model Answer:**
The challenge: modals are often rendered in deeply nested components but should render at the document root (to avoid z-index and overflow issues).

**Approach: Context + Portal**
1. `ModalProvider` wraps the app, holds `modals` state (a Map of id → config)
2. `useModal` hook exposes `open(config)` and `close(id)` functions
3. Each modal renders via `createPortal` into `document.body` — outside the component hierarchy
4. `Suspense`-compatible: large modal contents loaded lazily with `React.lazy`

```jsx
const ModalContext = createContext(null);
function ModalProvider({ children }) {
  const [modals, setModals] = useState([]);
  const open = useCallback((component, props = {}) => {
    const id = Date.now().toString();
    setModals(prev => [...prev, { id, component, props }]);
    return id; // caller can use id to close specific modal
  }, []);
  const close = useCallback((id) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);
  
  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}
      {modals.map(({ id, component: Component, props }) =>
        createPortal(<Component key={id} {...props} onClose={() => close(id)} />, document.body)
      )}
    </ModalContext.Provider>
  );
}
```

---

## Q11 (Design): How would you build a scalable, reusable form wizard?

**Model Answer:**
A form wizard has: multiple steps, forward/back navigation, validation per step, final submit.

**Compound component pattern**:
```jsx
<FormWizard onComplete={handleSubmit}>
  <FormWizard.Step title="Personal Info" validate={personalInfoSchema}>
    <PersonalInfoForm />
  </FormWizard.Step>
  <FormWizard.Step title="Account Setup" validate={accountSchema}>
    <AccountForm />
  </FormWizard.Step>
  <FormWizard.Step title="Review">
    <ReviewStep />
  </FormWizard.Step>
</FormWizard>
```

**State**: `currentStep`, `formData` (accumulated across steps), `errors` per step.
**Context**: Wizard context provides `nextStep`, `prevStep`, `formData`, `updateData` to child steps.
**Validation**: Each step has a `validate` function (Zod schema or custom). Run before advancing.
**URL sync**: `useSearchParams` to sync current step — browser back button works, users can share links to specific steps.

---

## Q12 (Performance Debug): A React app is slow. Walk me through your debugging process.

**Model Answer:**
1. **React DevTools Profiler**: Record a slow interaction. Look for components with high "self time" (time the component itself took). Look for components that re-render when they shouldn't.
2. **Check for cascade re-renders**: Is a high-level component re-rendering on every state change? Are all its children re-rendering too?
3. **Identify causes**: In Profiler, each component shows "why it rendered" — prop change, state change, context change, parent re-render
4. **Fix the actual cause**:
   - Unnecessary parent re-renders → `React.memo` on children that receive unchanged props
   - Context causing all consumers to re-render → split context (separate ThemeContext, UserContext)
   - Expensive computation → `useMemo`
   - New function/object refs → `useCallback`/`useMemo` for stable references
5. **Long lists**: 1000+ items without virtualization? `react-window`/`react-virtual`.
6. **Bundle size**: `source-map-explorer` or `webpack-bundle-analyzer` — large imports?
7. **Measure before and after**: Lighthouse performance score, Core Web Vitals INP

---

## Q13 (Performance Debug): A user reports the UI freezes when they type in a large form.

**Model Answer:**
Typing causes state updates → component re-renders → expensive computation runs → event loop blocked → INP > 200ms.

**Diagnosis**:
- React DevTools Profiler: shows how long each render takes after each keystroke
- Chrome Performance tab: find long tasks (> 50ms) blocking the main thread

**Solutions**:
1. **`useTransition`**: Mark the state update from typing as "non-urgent"
   ```jsx
   const [isPending, startTransition] = useTransition();
   const handleChange = (e) => {
     setInputValue(e.target.value); // immediate (urgent)
     startTransition(() => setSearchQuery(e.target.value)); // deferred
   };
   ```
2. **`useDeferredValue`**: Defer the expensive re-render
   ```jsx
   const deferredQuery = useDeferredValue(query);
   // Pass deferredQuery to the expensive component — it renders with a lag
   ```
3. **Debounce** the state update (classic approach before Concurrent Mode)
4. **Web Worker**: Move computation off the main thread entirely
5. **`React.memo`** on expensive child components to avoid re-rendering unchanged parts of the form

---

## Q14 (Architecture): Design a scalable component library. What would you consider?

**Model Answer:**
A component library used across multiple apps requires careful architecture:

**Structure**:
- Headless components (Radix UI, Headless UI): behavior + accessibility without styling — consumers bring their own styles
- OR styled components with a design token system for theming

**Design tokens**: colors, spacing, typography defined as CSS variables. Components use tokens, not hardcoded values. Theming = swap token values.

**Accessibility first**: All interactive components follow WAI-ARIA patterns. Keyboard navigation, screen reader support. Test with axe-core in CI.

**Bundle optimization**: Each component tree-shakeable. `import { Button } from '@company/ui'` only bundles Button, not the entire library.

**Documentation**: Storybook with stories for every component and every state (loading, error, empty, hover, focus). Visual regression tests with Chromatic.

**Versioning**: Semantic versioning. Deprecation warnings before removals. Breaking changes in CHANGELOG.

**Testing**: Unit tests for component logic, accessibility tests (`@testing-library/jest-dom`), visual snapshots.

---

## Q15 (Behavioral): Tell me about the most complex React project you built.

**Model Answer (STAR format):**
**Situation**: We were rebuilding a legacy jQuery dashboard (50K lines) as a React application. The dashboard was used by 2000+ business analysts daily with real-time data updates, complex filtering, and custom chart configurations.

**Task**: Lead the frontend architecture. The challenge was incremental migration — we couldn't rewrite all at once, and the app needed to keep running.

**Action**:
1. Chose a Strangler Fig approach: rendered React components inside the existing jQuery app using `createRoot` on specific DOM nodes. React and jQuery coexisted.
2. Built a shared event bus (using CustomEvents) for jQuery↔React communication during the transition.
3. Established the component architecture: a headless chart library (business logic) with a React rendering layer — enabled future migration to a different rendering library without rewriting logic.
4. Implemented WebSocket for real-time data using `useReducer` to manage complex state transitions (connecting, connected, reconnecting, error states).
5. Used React Query for all server data fetching — eliminated 3000 lines of manual caching/loading state management.

**Result**: 18-month migration completed incrementally with zero downtime. Performance improved significantly (Lighthouse score 34 → 87). New features that took 2-3 days in jQuery took 4-6 hours in React. Team velocity increased measurably.
