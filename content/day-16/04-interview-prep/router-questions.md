# React Router v6 – Interview Q&A

## Q1: What are the main differences between React Router v5 and v6?

**Answer:**

| Feature | v5 | v6 |
|---------|----|----|
| Container | `<Switch>` | `<Routes>` |
| Route prop | `component={Comp}` | `element={<Comp />}` |
| Exact matching | Requires `exact` | Default behavior |
| Nested routes | Defined separately | Declared inside parent `<Route>` |
| Nested rendering | `useRouteMatch` + manual render | `<Outlet />` |
| Programmatic nav | `useHistory` | `useNavigate` |
| Relative paths | Manual | Built-in for nested routes |
| Data loading | Not built-in | Loaders/actions (v6.4+) |

The philosophical shift: v6 makes nested routing a first-class concept. Instead of defining all routes flat and using `useRouteMatch` to compose layouts, you declare hierarchy in the route config and use `<Outlet>` to render children.

---

## Q2: How do you implement protected routes in v6?

**Answer:**
The v6 idiomatic approach uses a wrapper component that renders `<Outlet />` for authenticated users or `<Navigate />` for unauthenticated users:

```jsx
function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}

<Routes>
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>
  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
    <Route path="/admin" element={<Admin />} />
  </Route>
</Routes>
```

Key details:
- `state={{ from: location }}` saves the originally requested URL for post-login redirect
- `replace` prevents the login page from appearing in browser history (pressing back won't return to login after successful auth)
- The `<Outlet />` renders the matched child route

---

## Q3: Explain the purpose of `<Outlet />` and how it works.

**Answer:**
`<Outlet />` is a placeholder in a parent route's component that renders the matched child route. It enables layout-based routing: the parent handles the chrome (nav, sidebar, header) and the child handles the content area.

```jsx
// Parent route component renders Outlet where children should appear
function Layout() {
  return (
    <>
      <Header />
      <main><Outlet /></main>  {/* child route renders here */}
      <Footer />
    </>
  );
}

// Route config
<Route path="/" element={<Layout />}>
  <Route index element={<Home />} />     {/* renders inside Layout's Outlet */}
  <Route path="about" element={<About />} />
</Route>
```

`useOutletContext()` allows a parent to pass data down to child routes:
```jsx
// Parent
<Outlet context={{ user, permissions }} />

// Child
const { user } = useOutletContext();
```

---

## Q4: What is the difference between `<Link>`, `<NavLink>`, and `useNavigate`?

**Answer:**

- **`<Link>`**: Renders an `<a>` tag with React Router's navigation. Use for all standard navigation. Prevents full page reload.

- **`<NavLink>`**: Same as Link but adds an `active` class (or style via render prop) when the route matches. Use for navigation menus where visual active state matters.

- **`useNavigate`**: Returns a `navigate` function for programmatic navigation — use after async operations (form submit, API call), after authentication, or when you need to navigate based on logic, not user clicks.

```jsx
// After form submission:
const navigate = useNavigate();
async function handleSubmit(data) {
  await api.createPost(data);
  navigate(`/posts/${data.id}`, { replace: true });
}

// Go back:
navigate(-1);

// Pass state:
navigate('/checkout', { state: { items: cart } });
```

---

## Q5: How do route loaders work, and what problem do they solve?

**Answer:**
Route loaders (introduced in v6.4 with `createBrowserRouter`) are async functions that fetch data before a route's component renders. The component receives the data immediately on mount — no loading state needed in the component.

**Problem solved**: The waterfall pattern — component mounts, starts fetching, shows a spinner, then renders. With loaders, the browser can parallelize data fetching while the JS for the page is still loading.

```js
// Without loaders: waterfall
// 1. Route matches
// 2. Component mounts
// 3. useEffect runs fetch
// 4. Data arrives
// 5. Component re-renders with data

// With loaders: parallel
// 1. Route matches
// 2. Loader starts fetching (in parallel with loading the component JS)
// 3. Component renders with data immediately
```

Loaders can also redirect before the component renders:
```js
loader: async () => {
  const user = await checkAuth();
  if (!user) throw redirect('/login');
  return { user };
}
```

In components, data is accessed via `useLoaderData()` — no `useState` or `useEffect` for data fetching.

---

## Q6: How do useSearchParams work and why use them instead of parsing the URL manually?

**Answer:**
`useSearchParams` returns `[searchParams, setSearchParams]` — similar to `useState` but backed by the URL query string. It handles encoding/decoding, creates a new URL when set, and integrates with browser history.

```jsx
const [searchParams, setSearchParams] = useSearchParams();

// Read
const filter = searchParams.get('filter') ?? 'all';
const page = parseInt(searchParams.get('page') ?? '1', 10);

// Write — merges with existing params
setSearchParams(prev => {
  const next = new URLSearchParams(prev);
  next.set('filter', 'active');
  next.set('page', '1'); // reset page on filter change
  return next;
});
```

vs. manual URL parsing with `window.location.search`:
- `useSearchParams` is reactive — component re-renders when URL changes
- Works correctly with browser back/forward
- No need to manually encode/decode values
- Produces a new history entry (back button works) by default

Use `{ replace: true }` in `setSearchParams` to avoid polluting history for filter changes:
```jsx
setSearchParams({ filter: 'active' }, { replace: true });
```

---

## Q7: How do you handle 404s and route errors in v6?

**Answer:**

**404 — No matching route:**
```jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="*" element={<NotFound />} /> {/* Catch-all */}
</Routes>
```

**Loader/action errors — with data routing:**
```jsx
{
  path: 'users/:id',
  element: <UserDetail />,
  loader: async ({ params }) => {
    const user = await fetchUser(params.id);
    if (!user) throw new Response('Not Found', { status: 404 });
    return user;
  },
  errorElement: <ErrorPage />, // Renders when loader throws
}

function ErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <h1>{error.status} - {error.statusText}</h1>;
  }
  return <h1>Unexpected error: {error.message}</h1>;
}
```

The `errorElement` is scoped — it replaces only the route it's defined on, not the entire page. Parent layouts (nav, header) remain intact.

---

## Q8: How do you code-split routes in v6, and what are the performance implications?

**Answer:**
Combine `React.lazy` with `Suspense` around the `<Routes>` component:

```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Performance implications:**
- Initial bundle only includes routes needed for the current page
- Webpack generates separate chunks per lazy import
- First navigation to a lazy route has latency (download + parse + execute)
- Subsequent navigations use the cached chunk

**Preloading to reduce perceived latency:**
```jsx
// Preload on hover — trigger the import before click
<NavLink
  to="/dashboard"
  onMouseEnter={() => import('./pages/Dashboard')} // result is webpack-cached
>
  Dashboard
</NavLink>
```

With `createBrowserRouter` and loaders, lazy routes work even better — the route component JS and data fetch can start in parallel during navigation.
