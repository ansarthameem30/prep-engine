# React Interview Prep Guide

## Top 25 React Concepts Checklist

Rate yourself 1-5 on each. Focus review time on anything below 4.

### Fundamentals (Should be 5/5)
- [ ] What is the Virtual DOM and why does it exist?
- [ ] How does React reconciliation work? What are the two heuristics?
- [ ] What is the difference between render phase and commit phase?
- [ ] How do useState and useReducer differ? When do you use each?
- [ ] How does useEffect work? Cleanup functions, dependency array rules?

### Intermediate (Target 4+/5)
- [ ] When does React.memo fail to prevent re-renders?
- [ ] What is the difference between useCallback and useMemo?
- [ ] When should you use useLayoutEffect over useEffect?
- [ ] What is automatic batching in React 18?
- [ ] How do you implement a custom hook with cleanup?
- [ ] What are the rules of hooks and why do they exist?
- [ ] How does code splitting with React.lazy work?
- [ ] What is the Context re-render problem and how do you fix it?

### Advanced (Target 4/5)
- [ ] What is Fiber and what problem did it solve?
- [ ] What is Concurrent Mode and how does startTransition work?
- [ ] What are compound components and when do you use them?
- [ ] How do Error Boundaries work? Why must they be class components?
- [ ] What is a Portal and when is it necessary?
- [ ] How does Suspense work under the hood?
- [ ] What is server state vs client state? How does TanStack Query handle it?
- [ ] Optimistic updates: walk through the full pattern with rollback
- [ ] How do you test a component that fetches data? (RTL + MSW approach)
- [ ] What is the testing trophy? When do you write integration vs unit tests?
- [ ] How do you diagnose a performance issue in a React app?
- [ ] What is the stale-while-revalidate pattern?

---

## Trick Questions and Gotchas

### "Is the Virtual DOM always faster?"
No. The Virtual DOM adds overhead. For trivial UIs, direct DOM manipulation is faster. The value is in enabling batching, diffing, and platform abstraction — not in the VDOM being inherently faster than the DOM.

### "Does React.memo prevent all re-renders?"
No. memo only prevents re-renders from *prop* changes. It doesn't help with:
- Context changes (the component still re-renders)
- Unstable prop references (new object/function/array each render defeats memo)
- When the parent's memoization fails

### "Is useState synchronous?"
No. `setState` schedules a re-render — the value doesn't update in the same call frame:
```js
const [count, setCount] = useState(0);
setCount(5);
console.log(count); // still 0 — React hasn't re-rendered yet
```
For updates based on current state: `setCount(prev => prev + 1)` — this is always correct.

### "useEffect with empty deps runs once, right?"
In React 18 StrictMode (development): **twice**. React intentionally unmounts and remounts to verify cleanup functions work. If your app breaks on the second mount, your effect has a cleanup bug.

### "Can you call hooks conditionally?"
No, and the reason is important: React identifies hooks by their call order. Every render must call the same hooks in the same order. Conditional calls would shift the order and corrupt state.

### "Is useRef reactive?"
No. Changing `ref.current` does NOT cause a re-render and is NOT tracked by React. It's a mutable escape hatch. This is intentional for values like interval IDs.

### "What's wrong with this code?"
```js
// BUG: creates infinite loop
useEffect(() => {
  setData(processData(data)); // sets data → triggers re-render → effect runs again
}, [data]);
```

### "When does key cause a full remount?"
When the `key` prop changes. Interviewers love this — you can force reset a component's state by changing its key:
```jsx
<DatePicker key={selectedMonth} defaultDate={today} />
// Changing selectedMonth "resets" DatePicker to a fresh instance
```

---

## Live Coding Tips for React Interviews

### Before you code:
1. Clarify requirements: "Is this controlled or uncontrolled? Does it need to work with SSR?"
2. Discuss the API first: "Here's how I'd like the component to be used..."
3. Mention tradeoffs before being asked: "I could use useState here, or if this data is shared, I'd lift it up or use Context"

### While coding:
1. Name your event handlers descriptively: `handleUserNameChange` not just `onChange`
2. Add accessibility attributes: `aria-label`, `role`, `htmlFor` — shows senior awareness
3. Handle loading and error states explicitly — even in a simple demo
4. Use functional updates for state that depends on previous state: `setItems(prev => [...prev, newItem])`

### Performance-related questions:
Walk through a checklist:
1. "First, I'd profile with React DevTools to find the actual bottleneck"
2. "Is it a render count issue? → React.memo + useCallback"
3. "Is it a slow render? → useMemo for expensive computations"
4. "Is it a list rendering issue? → Virtualization with react-window"
5. "Is it a bundle size issue? → Code splitting, tree shaking"

### State management decisions:
Use the decision framework explicitly:
- "This is local UI state → useState"
- "This is shared between nearby components → lift up or useReducer"
- "This is server data → TanStack Query"
- "This is global client state → Zustand"
- "This is complex domain state with many actors → Redux Toolkit"

---

## Component Design Walkthrough Approach

When asked to design a component (e.g., "Design a reusable Modal"):

**Step 1: Define the API (2 min)**
```jsx
// Controlled (parent manages open state)
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <Modal.Header>Delete User</Modal.Header>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button onClick={onClose}>Cancel</Button>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </Modal.Footer>
</Modal>
```

**Step 2: Identify state and behaviors (1 min)**
- State: open/closed (controlled externally via isOpen)
- Behaviors: close on Escape, close on overlay click, focus trap, scroll lock

**Step 3: Identify infrastructure needs (1 min)**
- Portal (escape overflow/z-index issues)
- Error Boundary (if Modal content can throw)
- Ref (for focus management)

**Step 4: Accessibility (1 min)**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Focus the modal container on open
- Return focus to trigger on close

**Step 5: Edge cases (1 min)**
- SSR: `typeof document !== 'undefined'` before portal creation
- Multiple modals: z-index management
- Nested modals: should close inner before outer

**Step 6: Code (rest of time)**
Implement in order of importance: open/close → portal → keyboard → accessibility
