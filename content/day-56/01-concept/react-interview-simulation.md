# Day 56 — React + Frontend Mock Interview Guide

## Top 10 React Gotchas and Deep Questions

### 1. Why does React re-render and what triggers it?
Re-renders are triggered by: (a) state change via `useState`/`useReducer`, (b) parent re-rendering (unless the component is memoized), (c) context value change. React does NOT re-render on prop changes alone — it re-renders the parent and passes new props. If props are the same object reference, a memoized child won't re-render.

### 2. Why do hooks have rules? (No conditionals, no loops)
React stores hook state in an ordered array indexed by call order. If you call hooks conditionally, the call order changes between renders, and React reads the wrong state from the array. The ESLint `rules-of-hooks` plugin enforces this statically. Custom hooks are just functions — the rule applies to any function that calls hooks.

### 3. What is the difference between `useMemo` and `useCallback`?
`useCallback(fn, deps)` memoizes the function reference — returns the same function instance unless deps change. Critical for: callbacks passed to memoized child components (`React.memo`) that would otherwise re-render because the parent creates a new function reference on every render.
`useMemo(fn, deps)` memoizes the computed value — runs the function and caches the result. Use for: expensive computations, creating stable reference types (arrays, objects) that would otherwise be new instances on every render.
Both are NOT needed unless there is a measurable performance problem. Premature memoization adds complexity.

### 4. When does `useEffect` run vs `useLayoutEffect`?
`useEffect`: runs asynchronously AFTER the browser has painted. Use for: data fetching, subscriptions, non-visual side effects.
`useLayoutEffect`: runs synchronously AFTER DOM mutations but BEFORE the browser paints. Use for: measuring DOM elements, synchronizing DOM with state before the user sees it (prevents flicker). Almost never needed.

### 5. What is React Concurrent Mode / Automatic Batching?
React 18 introduced automatic batching — state updates inside event handlers AND async contexts (setTimeout, fetch callbacks) are now batched into a single re-render. Previously, only event handler updates were batched.
Concurrent features (via `createRoot`): `useTransition` marks state updates as non-urgent — React can interrupt them to handle more urgent updates. `useDeferredValue` defers an expensive re-render without blocking UI. Enables React to keep UI responsive while rendering.

### 6. Why should you not update state directly?
React's state updates are immutable. If you mutate state directly (`state.count++`), React doesn't detect the change (it compares object references). You must create a new object/array. This is why spread syntax is used: `setObj({ ...obj, key: newVal })`. Mutation also causes bugs with closures capturing stale state references.

### 7. What is the `key` prop and what happens if keys are wrong?
`key` is React's identifier for reconciling list items. With a stable, unique key, React reuses the existing DOM element and updates only changed props. Without a key (or with index as key), React may reuse the wrong component instance, causing bugs: inputs retaining values from a different list item, animations misfiring, form state leaking between items.

### 8. Explain the difference between controlled and uncontrolled components.
Controlled: React state is the single source of truth. `<input value={state} onChange={setState} />`. Validation, conditional logic, and cross-field interaction are easy. Every keystroke triggers a re-render.
Uncontrolled: DOM holds the state, accessed via `useRef`. `<input ref={inputRef} />`. Less re-renders, slightly better performance for large forms. Harder to validate dynamically.

### 9. What are render props and how do hooks supersede them?
Render props: a component accepts a function prop that it calls with its internal state, letting the parent control rendering. Pattern for sharing stateful logic before hooks: `<Mouse render={({ x, y }) => <Cursor x={x} y={y} />} />`.
Hooks replaced this pattern: `const { x, y } = useMouse()` — same capability, much cleaner. But render props are still valid for complex slot-based composition (e.g., `<Table renderRow={...} />`).

### 10. How does React's reconciliation algorithm work?
React's reconciliation uses a diffing algorithm with key assumptions:
1. Elements of different types produce different trees — replace entirely
2. The developer provides `key` to identify stable list items
The algorithm compares old and new trees level by level. When types match, React updates props in place. When types differ, React unmounts the old subtree and mounts a new one (all children are destroyed and recreated). This is why changing a `div` to a `section` at the top of a tree is expensive.

---

## Common Mistakes Candidates Make in React Interviews

1. **Mutating state directly**: `state.items.push(x)` instead of `[...state.items, x]`
2. **Missing dependency array items**: Using a variable in `useEffect` without listing it in deps
3. **Stale closures**: Event handlers or timers that capture stale state — fix with `useRef` or functional update form `setState(prev => ...)`
4. **Not cleaning up effects**: Subscriptions, intervals, fetch requests that don't cancel on unmount
5. **Over-memoizing**: Adding `useMemo`/`useCallback` everywhere "for performance" without profiling
6. **Not using the key prop correctly**: Using array index as key when items can reorder or be deleted
7. **Treating `setState` as synchronous**: Reading state immediately after `setState` — state updates are batched

---

## Component Design Challenge Approach

When given a component design challenge (e.g., "build an autocomplete component"):

**Step 1 — Requirements clarification (2 min)**:
- Controlled or uncontrolled?
- Async suggestions (API) or sync (local filter)?
- Keyboard navigation required?
- Multi-select?
- Accessibility (ARIA)?

**Step 2 — Component tree design**:
```
<Autocomplete>           ← manages open/closed state, selected value
  <Input />             ← controlled input, triggers search
  <SuggestionList />    ← conditionally rendered
    <SuggestionItem />  ← each suggestion
```

**Step 3 — State design**:
What state is needed? Where does it live?
- `query` (string): Input value → lives in Autocomplete (or parent if controlled)
- `suggestions` (array): API results → Autocomplete
- `isOpen` (bool): dropdown visibility → Autocomplete
- `highlightedIndex` (number): keyboard navigation → Autocomplete

**Step 4 — API / prop shape**:
```ts
interface AutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch: (query: string) => Promise<Option[]>;
  renderOption?: (option: Option) => React.ReactNode;
  placeholder?: string;
}
```

**Step 5 — Edge cases**:
- Debounce the API call
- Cancel in-flight requests when query changes (AbortController)
- Loading state
- Empty state message
- Click outside to close
- Keyboard: ArrowUp/ArrowDown/Enter/Escape
