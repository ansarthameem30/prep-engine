# Advanced React Patterns

## Compound Components Pattern

Compound Components allow related components to share implicit state through Context. The consumer gets a compositional API instead of a props API.

**The problem with props API:**
```jsx
// Props API — harder to customize structure
<Tabs
  tabs={[{ label: 'Overview', content: <Overview /> }, { label: 'Code', content: <Code /> }]}
  defaultTab={0}
  orientation="vertical"
/>
// Customizing the layout or adding anything between tab and content is impossible without adding more props
```

**The solution — Compound Components:**
```jsx
// Compound API — fully composable structure
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="code">Code</Tabs.Trigger>
    <div className="spacer" /> {/* User can add anything here */}
    <button>Extra action</button>
  </Tabs.List>
  <Tabs.Panel value="overview"><Overview /></Tabs.Panel>
  <Tabs.Panel value="code"><Code /></Tabs.Panel>
</Tabs>
```

**Implementation:**
```jsx
const TabsContext = createContext(null);

function Tabs({ defaultValue, children }) {
  const [activeValue, setActiveValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children }) {
  return <div role="tablist">{children}</div>;
}

function TabsTrigger({ value, children }) {
  const { activeValue, setActiveValue } = useContext(TabsContext);
  return (
    <button
      role="tab"
      aria-selected={activeValue === value}
      onClick={() => setActiveValue(value)}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, children }) {
  const { activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

// Attach sub-components as properties (optional convenience)
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Panel = TabsPanel;
```

**Real-world examples**: Radix UI Tabs, Headless UI Listbox, Reach UI Menu.

---

## Render Props Pattern

Render props pass a function as a prop, letting the parent control how the child's state is rendered. Largely superseded by custom hooks.

```jsx
// Render prop
function MouseTracker({ render }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {render(pos)}
    </div>
  );
}

<MouseTracker render={({ x, y }) => <p>Mouse at: {x}, {y}</p>} />

// The same logic as a custom hook (simpler, composable):
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = e => setPos({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);
  return pos;
}

// No wrapper component needed
function Component() {
  const { x, y } = useMousePosition();
  return <p>Mouse at: {x}, {y}</p>;
}
```

**When render props still make sense**: When you need explicit control over rendering without the consumer having to call a hook. `react-virtualized`'s list renderer, `react-hook-form`'s Controller component.

---

## HOC (Higher Order Components)

HOCs wrap a component and return a new component with additional props or behavior:

```jsx
// withAuth: protects a component if not authenticated
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}

// withLogger: adds logging to any component
function withLogger(WrappedComponent, name) {
  return function LoggedComponent(props) {
    useEffect(() => {
      console.log(`[Mount] ${name}`);
      return () => console.log(`[Unmount] ${name}`);
    }, []);
    return <WrappedComponent {...props} />;
  };
}

const AdminPanel = withAuth(withLogger(BaseAdminPanel, 'AdminPanel'));
```

**HOC pitfalls**:
- Prop drilling: HOCs wrap in layers, making prop origins unclear
- Display names lost: DevTools shows `withAuth(withLogger(Component))` not `AdminPanel`
- Static method forwarding: HOCs don't automatically forward static methods (use `hoist-non-react-statics`)
- Ref forwarding: HOCs block refs (use `forwardRef`)

**When HOCs are still appropriate**:
- Cross-cutting concerns at the route level (not component level)
- Library-provided HOCs you consume (Redux's `connect`, React Router's old `withRouter`)
- When the same behavior needs to wrap many unrelated components and a custom hook is awkward

---

## Portals: Rendering Outside the DOM Tree

```jsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.getElementById('modal-root') // render target outside root
  );
}

// HTML:
// <body>
//   <div id="root"></div>
//   <div id="modal-root"></div>  ← Modal renders here
// </body>
```

**Why portals are necessary for modals/tooltips:**
- CSS `overflow: hidden` on an ancestor would clip the modal
- CSS `z-index` stacking contexts are scoped to positioned ancestors
- Rendering inside `#root` means the modal is trapped in the DOM tree's stacking context

**Key behavior**: Even though the portal renders outside the DOM tree, React events (clicks, keyboard) still bubble through the **React tree**, not the DOM tree. A click in a portal bubbles to its React parent — useful for closing the modal when clicking the trigger.

---

## Error Boundaries: Class Component Requirement

Error boundaries catch JavaScript errors in their child component tree, log them, and display a fallback UI.

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Called when a descendant throws during rendering
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called after the error is captured — use for logging
  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo.componentStack);
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// Usage:
<ErrorBoundary fallback={<ErrorPage />}>
  <Dashboard />
</ErrorBoundary>

// Note: react-error-boundary library provides a hook-friendly wrapper:
import { ErrorBoundary } from 'react-error-boundary';
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => logError(error)}
  onReset={() => queryClient.resetQueries()}
>
  <Dashboard />
</ErrorBoundary>
```

**Why class components only?** Error boundaries require `getDerivedStateFromError` and `componentDidCatch` lifecycle methods. There is no hooks equivalent for catching render-phase errors. This is a conscious limitation — the React team wants error boundaries to be deliberate, not ad-hoc.

**What errors do NOT bubble to boundaries:**
- Event handlers (errors in onClick, onChange — use try/catch)
- Async code (setTimeout, Promises)
- Server-side rendering
- Errors in the error boundary itself

---

## Suspense Patterns

React Suspense lets components "suspend" rendering while waiting for something (code, data) to load. The nearest `<Suspense>` boundary shows a fallback.

```jsx
// Suspense for code splitting (stable, widely used)
const LazyPage = lazy(() => import('./SlowPage'));
<Suspense fallback={<Skeleton />}><LazyPage /></Suspense>

// Suspense for data fetching (React 18+ with supported libraries)
// TanStack Query, Relay, SWR support this
function UserProfile({ userId }) {
  // With suspense: true, useQuery suspends the component while loading
  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: fetchUser,
    suspense: true, // enable suspense mode
  });

  // No loading check needed — component only renders when data is available
  return <h1>{user.name}</h1>;
}

// Wrap with Suspense:
<Suspense fallback={<ProfileSkeleton />}>
  <UserProfile userId={5} />
</Suspense>
```

**Avoiding Suspense waterfalls:**
```jsx
// Waterfall: each component suspends sequentially
<Suspense>
  <UserProfile />    {/* suspends → loads → renders */}
  <UserPosts />      {/* only starts loading after UserProfile done */}
</Suspense>

// Parallel: both start loading simultaneously
<Suspense>
  <UserProfile />    {/* suspends */}
  <UserPosts />      {/* also suspends simultaneously */}
</Suspense>
// Key: both useQuery calls start BEFORE either component renders output
```

---

## Headless UI Components

Headless components provide behavior and accessibility without styles — the consumer owns the presentation:

```jsx
// react-aria (Adobe) example:
import { useButton } from '@react-aria/button';

function Button(props) {
  const ref = useRef(null);
  const { buttonProps } = useButton(props, ref);
  // buttonProps includes: role, aria-pressed, onKeyDown for Enter/Space, etc.

  return (
    <div {...buttonProps} ref={ref} className={props.className}>
      {props.children}
    </div>
  );
}

// Radix UI example:
import * as Select from '@radix-ui/react-select';
// All accessibility: keyboard navigation, aria-*, focus management
// Zero styles: you apply whatever you want
<Select.Root>
  <Select.Trigger>
    <Select.Value />
  </Select.Trigger>
  <Select.Content>
    <Select.Item value="apple">Apple</Select.Item>
  </Select.Content>
</Select.Root>
```

**Why headless UI is increasingly preferred**: It solves the accessibility problem (which is hard and error-prone to implement) while giving designers full control over visuals. Libraries like shadcn/ui are built on top of Radix UI for this reason.
