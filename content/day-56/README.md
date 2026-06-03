# Day 56 – React + Frontend Mock Interview: Full 90-Minute Simulation | DSA: Timed React/DS Challenge

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:05 | No new concept — simulation day. Scan your React weak areas from Days 11-20 only. |
| Hands-On | 00:05–01:00 | Full React interview simulation: internals + hooks + perf debugging + state management + live feature |
| DSA | 01:00–01:20 | Timed React/DS challenge — implement a virtualized list from scratch |
| Interview Q | 01:20–01:30 | Self-grade all rounds, log weak areas |

---

## Today's Objectives

> **Note:** `01-concept/` contains only a `.gitkeep` — this is a simulation day with no new concept files. All study material is in `04-interview-prep/`.

- [ ] Complete full React interview simulation under realistic conditions
- [ ] Score yourself honestly on each round (1–5 rubric)
- [ ] Identify your top 2 React weak areas and log them
- [ ] Implement a windowed/virtualized list component in < 20 minutes
- [ ] Re-do any round you scored < 3 after the session

---

## Concept: Simulation Day

> No new learning today. Review your notes from Days 11–18 if needed (spend max 5 min).

Key areas to quickly scan if shaky:
- React reconciliation and the Fiber architecture (Day 11)
- `useMemo` vs `useCallback` vs `memo` tradeoffs (Day 12)
- `useReducer` + Context vs Zustand vs Redux (Day 13)
- Concurrent features: `useTransition`, `useDeferredValue`, Suspense (Day 14)

---

## Full Mock Interview Simulation

### Ground Rules
- Timer must be running. No pausing. No React docs.
- All coding done in actual files — run the code.
- Grade after each round, not at the end.

---

### Round 1: React Internals (10 min)
Answer these out loud in < 2 min each:
1. What is React's virtual DOM and what problem does it solve? Why is direct DOM manipulation slower?
2. Explain the React Fiber architecture — what is a fiber, why was it introduced (what did the old stack reconciler get wrong)?
3. What is the reconciliation algorithm? Explain the two heuristics React uses to make diffing O(n) instead of O(n³).
4. What is React's concurrent mode? How does `useTransition` differ from wrapping code in `setTimeout`?
5. What happens internally when you call `setState`? Trace from the call to the DOM update.

---

### Round 2: Hooks Deep Dive (10 min)
Live code these without looking anything up:
1. Implement a custom `useDebounce(value, delay)` hook.
2. Implement a custom `useLocalStorage(key, initialValue)` hook that syncs state with localStorage.
3. Implement a custom `useFetch(url)` hook with loading, error, and data states, proper cleanup, and request cancellation using AbortController.
4. Explain when you would use `useReducer` over `useState` — give a concrete example of state where `useReducer` is clearly better.
5. What is the `useEffect` dependency array and what happens if you lie to React about dependencies? Explain stale closure in useEffect.

---

### Round 3: Performance Debugging (10 min)
You are shown a React app where the main product list re-renders every time the user types in a search box, even for items not matching the search. The list has 500 items.

Debug and fix:
1. How do you confirm the re-render problem? (React DevTools Profiler — explain what to look for)
2. Is `React.memo` the right fix here? What are its limitations?
3. When would you reach for `useMemo` vs `useCallback` vs `memo`? Give the exact scenario for each.
4. The list still lags after memoization. Now what? (Virtualization — explain window rendering concept and mention react-virtual / react-window)
5. Explain the `key` prop — what happens if you use array index as key vs a stable ID?

---

### Round 4: State Management Architecture (10 min)
Answer in < 2 min each:
1. When do you use local state, when do you lift state, when do you use Context, and when do you reach for a global store (Zustand/Redux)?
2. What is the Context performance problem and how do you fix it? (Context re-renders all consumers on any value change)
3. Compare Zustand and Redux Toolkit — what's the same, what's different, when do you choose each?
4. What is `React Query` (TanStack Query) and what problem does it solve that `useState + useEffect` doesn't?
5. Explain optimistic UI updates with React Query — what happens if the mutation fails?

---

### Round 5: Accessibility (5 min)
Quick fire — 1 min each:
1. What is ARIA and when should you use `aria-label` vs `aria-labelledby`?
2. What does keyboard navigability require? What HTML elements are naturally focusable?
3. What is the difference between `role="button"` and an actual `<button>` element?
4. How do you test accessibility? Name 3 tools.
5. What is a "focus trap" and when do you need one?

---

### Round 6: Testing Strategy (5 min)
1. What is the testing pyramid for a React application? What goes in unit, integration, and E2E?
2. When do you use React Testing Library vs Cypress? What is React Testing Library's philosophy?
3. How do you test a component that fetches data? What do you mock?
4. What is snapshot testing and why is it often more noise than signal?
5. How do you test a custom hook in isolation?

---

### Round 7: Build a Feature Live — Compound Component Pattern (15 min)
Build a `<Select>` component using the compound component pattern:
```jsx
// Target API:
<Select value={selected} onChange={setSelected}>
  <Select.Trigger>{selected || 'Choose...'}</Select.Trigger>
  <Select.Options>
    <Select.Option value="react">React</Select.Option>
    <Select.Option value="vue">Vue</Select.Option>
    <Select.Option value="angular">Angular</Select.Option>
  </Select.Options>
</Select>
```
Requirements: Context-based state sharing, keyboard navigation (arrow keys, Enter, Escape), proper ARIA attributes (`role="listbox"`, `role="option"`, `aria-selected`, `aria-expanded`), click outside to close.

---

## DSA Focus: Timed Frontend DS Challenge

- **Problem:** Implement a windowed list (virtual scroll) — render only visible items from a 10,000-item array
- **Difficulty:** Medium-Hard (implementation challenge)
- **Pattern:** Sliding window on DOM — calculate visible range from scroll position
- **Time Target:** < 20 minutes
- **Key Insight:** Total height = itemCount × itemHeight; rendered items = Math.ceil(containerHeight / itemHeight) + overscan; startIndex = Math.floor(scrollTop / itemHeight); translate each visible item by `startIndex * itemHeight + offset`; use `position: absolute` on items, `position: relative` on container with explicit height

---

## Today's 5 Interview Questions

> Self-assessment questions — answer after the simulation.

1. Can you explain React Fiber and concurrent mode without hesitation?
2. Can you implement `useFetch`, `useDebounce`, and `useLocalStorage` from scratch?
3. Can you debug a React performance problem from profiler output to specific fix?
4. Can you implement a compound component with Context and keyboard accessibility?
5. Can you explain when to use each state management solution and articulate the Context re-render problem?

---

## Files

> `01-concept/` — Simulation day: no concept notes. See your Phase 2 notes (Days 11-20) for reference.

- `01-concept/` → `.gitkeep` only — simulation day, no new concept files
- `02-hands-on/` → react-mock-solutions/ — your implementations from Rounds 2, 3, and 7
- `03-dsa/` → virtual-list.jsx — windowed list implementation
- `04-interview-prep/` → react-mock-scorecard.md — self-graded rubric (1–5 per round) + weak areas identified

---

## Success Criteria
- [ ] Completed all 7 simulation rounds without pausing
- [ ] Compound Select component works with keyboard navigation and ARIA
- [ ] Virtual list renders correctly and only shows visible items
- [ ] Logged top 2 React weak areas for targeted review before Day 60
- [ ] Scored 4+ on at least 5 of the 7 rounds
