# Advanced React Patterns – Interview Q&A

## Q1: What is the Compound Components pattern and when do you use it?

**Answer:**
Compound Components is a pattern where a parent component provides state via Context, and child sub-components consume that context to render their portion of the UI. The components work together but consumers compose them freely.

**When to use**: For UI primitives with internal state where the consumer needs to control the layout and composition — Tabs, Accordion, Select, Combobox, Modal+Trigger.

**The key benefit**: Compositional API vs. configuration API.

```jsx
// Configuration API (props-heavy, inflexible):
<Tabs tabs={[{label:'A', content:<A/>}]} activeIndex={0} onTabChange={fn} />

// Compound API (flexible, composable):
<Tabs defaultValue="a">
  <Tabs.List>
    <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
    {/* Consumer can put anything here */}
  </Tabs.List>
  <Tabs.Panel value="a"><A /></Tabs.Panel>
</Tabs>
```

The internal Context should throw a helpful error if sub-components are used outside the parent:
```js
if (!context) throw new Error('TabsTrigger must be inside Tabs');
```

---

## Q2: When do HOCs still make sense in modern React, and what are their pitfalls?

**Answer:**
HOCs are largely superseded by custom hooks for most use cases. They still make sense for:
- Wrapping third-party components you don't own
- When the pattern is provided by a library (Redux `connect`, Apollo's old `graphql`)
- Cross-cutting concerns that genuinely need to wrap the component (adding a Provider, wrapping with ErrorBoundary)

Pitfalls:
1. **Props collision**: HOC and component may both want a prop named `data`
2. **Display name loss**: DevTools shows `HOC(Component)` — fix with `Component.displayName`
3. **Ref blocking**: HOCs don't pass refs through — need `forwardRef`
4. **Static methods not forwarded**: Use `hoist-non-react-statics` library
5. **Composition hell**: `withAuth(withLogger(withTheme(Component)))` — hard to debug

When custom hooks work better:
```jsx
// HOC version
const AuthedPage = withAuth(PageComponent);

// Hook version — easier to read, no wrapper
function PageComponent() {
  const { user } = useAuth(); // same logic, no HOC needed
  if (!user) return <Navigate to="/login" />;
  return <Page />;
}
```

---

## Q3: Why do you need a Portal for modals? What problem does it solve?

**Answer:**
Without portals, modals render inside the component tree — typically deep inside a layout component with CSS rules like `overflow: hidden` or a `z-index` stacking context. These rules trap the modal:
- `overflow: hidden` clips the modal at the container boundary
- `z-index` is relative to the element's stacking context — a high z-index inside a low-stacking-context parent is still below other elements

```jsx
// Problem:
<div style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}>
  <Modal />  {/* Modal is clipped and z-index is trapped */}
</div>

// Solution with Portal:
createPortal(<Modal />, document.body)
// Modal now renders at the body level — no overflow clipping, global z-index
```

**Important**: Even though the portal renders outside the DOM tree, React **event bubbling follows the React tree**, not the DOM tree. Clicking inside a portal bubbles events to the Portal's React parent — useful for click-outside detection on the trigger.

---

## Q4: Why can't Error Boundaries be functional components? Is there a workaround?

**Answer:**
Error boundaries require two lifecycle methods: `static getDerivedStateFromError` (to update state when an error is thrown during rendering) and `componentDidCatch` (to log the error). These lifecycle methods have no hooks equivalent.

The React team intentionally kept error boundaries as class components because:
1. Error boundaries catch errors during the render phase — a time when hooks have complex restrictions
2. It makes error boundaries deliberate, not ad-hoc

**Workaround**: Wrap a class component in a functional component or use the `react-error-boundary` library, which provides `<ErrorBoundary>` component and `useErrorBoundary` hook for programmatically triggering error boundaries from event handlers:

```jsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

function ComponentWithAsyncError() {
  const { showBoundary } = useErrorBoundary();

  async function handleClick() {
    try {
      await riskyAsyncOperation();
    } catch (error) {
      showBoundary(error); // throws to nearest ErrorBoundary
    }
  }
}
```

---

## Q5: What is the Render Props pattern, and why have hooks largely replaced it?

**Answer:**
Render props pass a function as a prop (or `children`), letting the consumer control rendering while the provider controls behavior:

```jsx
<MouseTracker>
  {({ x, y }) => <p>Position: {x}, {y}</p>}
</MouseTracker>
```

Hooks replace render props because:
1. **No wrapper component**: Logic lives in the hook, not a component
2. **No extra DOM node**: Render props typically add an invisible wrapper element
3. **Composable without nesting**: Multiple hooks compose flat; multiple render props nest
4. **Same component, different render**: The same component can use `useMousePosition` and `useWindowSize` without nesting two render prop components

**When render props are still useful**:
- `children` as render prop for explicit control over rendering (Downshift, react-virtualized)
- When you need to pass render behavior to a *library component* you don't control
- React Hook Form's `<Controller>` component uses render props to integrate with non-native inputs

---

## Q6: How does React Suspense work under the hood?

**Answer:**
A component "suspends" by throwing a Promise. React catches this, renders the nearest Suspense fallback, and retries rendering the component when the Promise resolves.

```js
// How a data library implements suspension:
function fetchUser(id) {
  let status = 'pending';
  let result;
  const promise = fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(data => { status = 'fulfilled'; result = data; })
    .catch(err => { status = 'rejected'; result = err; });

  return {
    read() {
      if (status === 'pending') throw promise;      // suspend
      if (status === 'rejected') throw result;      // error boundary
      if (status === 'fulfilled') return result;    // return data
    }
  };
}
```

When a component throws a Promise:
1. React catches it at the nearest `<Suspense>` boundary
2. Renders the `fallback` prop
3. Subscribes to the Promise
4. When Promise resolves: React replays the render from the Suspense boundary

**Important**: Don't implement this yourself. TanStack Query, SWR, Relay, and `use()` (React 18) handle the complexity correctly.

---

## Q7: What are headless UI components, and why are they becoming the standard?

**Answer:**
Headless components provide accessibility behavior and keyboard navigation without any CSS. Consumers supply all visual styling.

**Examples**: Radix UI, Headless UI (Tailwind Labs), React Aria (Adobe), Ariakit.

**Why they're the standard approach**:
1. **Accessibility is hard**: Correct ARIA roles, keyboard navigation (arrow keys, escape, focus trap) are complex and error-prone to implement correctly for each project
2. **Design freedom**: Component libraries (Material UI, Ant Design) force you into their visual system — headless gives full design control
3. **shadcn/ui is built on this**: Copy-paste components built on Radix UI — you own the code, customize anything

```jsx
// Radix UI Select — accessibility is handled, styling is yours
import * as Select from '@radix-ui/react-select';
<Select.Root>
  <Select.Trigger className="your-trigger-style">
    <Select.Value />
  </Select.Trigger>
  <Select.Content className="your-dropdown-style">
    <Select.Item value="apple" className="your-item-style">Apple</Select.Item>
  </Select.Content>
</Select.Root>
```

---

## Q8: Design a reusable Dropdown/Select component. Walk through your approach.

**Answer:**

Start with requirements:
1. Accessibility: keyboard navigation (arrow keys, Enter, Escape), ARIA roles
2. Flexible API: controlled and uncontrolled modes
3. Custom rendering: option labels can be complex JSX

Design decisions:
- Use Compound Components pattern (consumers control option rendering)
- Implement controlled/uncontrolled with `value`/`defaultValue` pattern
- Use `useId` for accessibility IDs that work with SSR

```jsx
// API design:
<Select value={selected} onChange={setSelected}>
  <Select.Trigger>
    <Select.Value placeholder="Select an option" />
  </Select.Trigger>
  <Select.Content>
    {options.map(opt => (
      <Select.Option key={opt.value} value={opt.value}>
        <Icon name={opt.icon} />
        {opt.label}
      </Select.Option>
    ))}
  </Select.Content>
</Select>

// Key implementation considerations:
// 1. State: open/closed, focused option index
// 2. Keyboard: ArrowDown/Up to navigate, Enter to select, Escape to close
// 3. Click outside: close the dropdown
// 4. Scroll: selected option into view when opening
// 5. ARIA: role="combobox" on trigger, role="listbox" on content, aria-selected on option
// 6. Portal: render content in portal to avoid overflow clipping
```

In production, use Radix UI's Select primitive and style it — the accessibility complexity alone is 500+ lines of code for a production-ready implementation.
