# React Performance Optimization

## React.memo Deep Dive

`React.memo` is a higher-order component that memoizes a component's render output. It performs a **shallow comparison** of props by default.

### When React.memo Fails

```jsx
// 1. Object props — shallow equal fails even if content is the same
const Child = React.memo(({ style }) => <div style={style}>...</div>);

function Parent() {
  // BUG: New object reference every render → memo is defeated
  return <Child style={{ color: 'red' }} />;

  // FIX: Move outside component or useMemo
  const style = useMemo(() => ({ color: 'red' }), []);
  return <Child style={style} />;
}

// 2. Function props without useCallback
const Child = React.memo(({ onClick }) => <button onClick={onClick}>Click</button>);

function Parent() {
  const onClick = () => console.log('clicked'); // new reference every render
  return <Child onClick={onClick} />; // memo defeated
  // FIX: const onClick = useCallback(() => console.log('clicked'), []);
}

// 3. Children prop — always creates a new React element
const Card = React.memo(({ children }) => <div>{children}</div>);
<Card><p>Text</p></Card> // <p>Text</p> is a new element each render → memo defeated
// This is intentional — children are expected to be dynamic
```

### Custom Comparison Function

```jsx
const ExpensiveRow = React.memo(
  function ExpensiveRow({ user, isSelected }) {
    return <tr className={isSelected ? 'selected' : ''}>{user.name}</tr>;
  },
  // Only re-render if isSelected changes or user.id changes
  // Ignores changes to user.lastSeen, user.preferences, etc.
  (prevProps, nextProps) =>
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.user.id === nextProps.user.id
);
```

---

## Code Splitting with React.lazy + Suspense

Code splitting delays loading JavaScript until it's needed — critical for reducing initial bundle size.

```jsx
// Route-level splitting (highest impact, lowest complexity)
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}

// Component-level splitting (for heavy components conditionally rendered)
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <>
      <button onClick={() => setShowChart(true)}>Load Chart</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </>
  );
}
```

**Important limitation**: `React.lazy` only works with **default exports**. For named exports:
```js
// Create a re-export wrapper:
// ./components/HeavyChartLazy.js
export { HeavyChart as default } from './HeavyChart';
```

### Preloading — Fetch Before User Clicks

```jsx
// Preload on hover — user intent signal
function NavLink({ to, label, component: Component }) {
  const preloadRef = useRef(false);

  function handleMouseEnter() {
    if (!preloadRef.current) {
      preloadRef.current = true;
      // Trigger the dynamic import early — result is cached by webpack
      import('./pages/' + to);
    }
  }

  return <a href={to} onMouseEnter={handleMouseEnter}>{label}</a>;
}
```

---

## Bundle Analysis: webpack-bundle-analyzer

```bash
npm install --save-dev webpack-bundle-analyzer

# For Create React App (without ejecting):
npx source-map-explorer 'build/static/js/*.js'

# For Next.js:
npm install @next/bundle-analyzer
# next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
module.exports = withBundleAnalyzer({});
```

**What to look for in the treemap:**
1. **Duplicate libraries**: Two versions of lodash, two copies of moment.js
2. **Large dependencies you're barely using**: Using one function from a 50KB library
3. **Vendor bundle size**: Should be split from app code for better caching
4. **Tree shaking failures**: Entire UI libraries included when you only use 3 components

**Common fixes:**
```js
// Bad: imports entire lodash (~70KB)
import _ from 'lodash';
_.debounce(fn, 300);

// Good: import only what you need (~3KB)
import debounce from 'lodash/debounce';
debounce(fn, 300);

// Best: use native or lighter alternatives
// debounce via useDebounce hook, no library needed
```

---

## Image Optimization

```jsx
// 1. Native lazy loading (built-in browser support)
<img src="/hero.jpg" loading="lazy" alt="Hero image" />

// 2. Modern image formats — serve WebP with JPEG fallback
<picture>
  <source srcSet="/hero.webp" type="image/webp" />
  <source srcSet="/hero.jpg" type="image/jpeg" />
  <img src="/hero.jpg" alt="Hero" />
</picture>

// 3. Responsive images — serve appropriate size for screen
<img
  src="/hero-800.jpg"
  srcSet="/hero-400.jpg 400w, /hero-800.jpg 800w, /hero-1200.jpg 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  alt="Hero"
  loading="lazy"
/>

// 4. Next.js Image component (handles all of the above + CDN)
import Image from 'next/image';
<Image
  src="/hero.jpg"
  width={800}
  height={400}
  alt="Hero"
  priority={false} // set true for above-the-fold LCP images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

---

## Virtualization with react-window

For lists with hundreds or thousands of items, render only the visible portion:

```jsx
import { FixedSizeList, VariableSizeList } from 'react-window';

// Fixed height rows (most common)
function VirtualizedList({ items }) {
  const Row = ({ index, style }) => (
    // CRITICAL: Apply the `style` prop — it contains absolute position
    <div style={style} className="row">
      <UserCard user={items[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}       // visible height
      itemCount={items.length}
      itemSize={80}      // each row height in px
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Variable height rows (more complex, requires measuring)
function VariableList({ items }) {
  const getItemSize = (index) => items[index].expanded ? 160 : 80;

  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ListItem item={items[index]} />
        </div>
      )}
    </VariableSizeList>
  );
}
```

**Impact**: A list of 10,000 items typically renders ~10-15 visible DOM nodes instead of 10,000. Memory usage and render time drop proportionally.

---

## React Profiler API

The Profiler API measures render timing programmatically:

```jsx
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration, baseDuration) {
  // id: "Dashboard" — the Profiler's id prop
  // phase: "mount" | "update" | "nested-update"
  // actualDuration: time spent re-rendering this tree (ms)
  // baseDuration: estimated time to render without memoization
  if (actualDuration > 16) { // 16ms = 1 frame at 60fps
    console.warn(`[Profiler] Slow render: ${id} took ${actualDuration.toFixed(1)}ms`);
  }
}

function App() {
  return (
    <Profiler id="Dashboard" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

**React DevTools Profiler** (browser extension):
- Record a session and see a flame graph of every render
- "Why did this render?" shows which prop/state/context triggered each update
- "Ranked chart" shows slowest components at the top
- Check `baseDuration` vs `actualDuration` — large gap = memoization is helping

---

## Avoid Anonymous Functions in JSX

```jsx
// Bad: new function created on every render
<Button onClick={() => handleDelete(item.id)} />

// Better: stable reference
const handleDeleteItem = useCallback(() => handleDelete(item.id), [item.id]);
<Button onClick={handleDeleteItem} />

// Or: use data attributes to avoid creating closures at all
<button data-id={item.id} onClick={handleDeleteWithEvent}>Delete</button>
function handleDeleteWithEvent(e) {
  handleDelete(e.currentTarget.dataset.id);
}
```

---

## Context Optimization

Context re-renders all consumers when its value changes — even if the consumer only uses a portion of the value.

```jsx
// Bad: one large context — all consumers re-render on any change
const AppContext = createContext();
<AppContext.Provider value={{ user, theme, cart, notifications }}>

// Better: split contexts by update frequency
const UserContext = createContext();   // changes rarely
const ThemeContext = createContext();  // changes on theme toggle
const CartContext = createContext();   // changes on cart operations

// Best: selector pattern with useSyncExternalStore or Zustand
// Consumers only re-render when their slice of state changes
const userName = useStore(state => state.user.name); // Zustand selector
```

---

## Production Build Optimizations

```bash
# Create React App — production mode automatically:
# - Minifies JS and CSS
# - Strips PropTypes (propTypes are only used in development)
# - Sets NODE_ENV=production (disables React warnings, invariant checks)
npm run build

# Key environment variable React checks:
process.env.NODE_ENV === 'production' // true in production builds
// React removes dev-only code paths with tree-shaking based on this
```

**Checklist for production readiness:**
- [ ] `NODE_ENV=production` in deployment environment
- [ ] Separate vendor chunk (React, ReactDOM) for CDN caching
- [ ] Source maps generated but not served publicly (or server-side only)
- [ ] Gzip/Brotli compression enabled on server (40-70% size reduction)
- [ ] HTTP/2 enabled (parallel asset loading)
- [ ] Critical CSS inlined, non-critical CSS deferred
