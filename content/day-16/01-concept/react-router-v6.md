# React Router v6: Complete Guide

## v6 vs v5: Key Changes

### Route Definition

```jsx
// v5: Switch + component prop
import { Switch, Route } from 'react-router-dom';
<Switch>
  <Route path="/users" component={UserList} />
  <Route path="/users/:id" component={UserDetail} />
</Switch>

// v6: Routes + element prop (JSX, not a component reference)
import { Routes, Route } from 'react-router-dom';
<Routes>
  <Route path="users" element={<UserList />} />
  <Route path="users/:id" element={<UserDetail />} />
</Routes>
```

Key differences:
- `<Switch>` → `<Routes>` — all routes are exclusive by default (no need for `exact`)
- `component={UserList}` → `element={<UserList />}` — you pass JSX, which allows prop passing
- Paths are **relative** in v6 nested routes (no leading `/` needed)

### Navigation

```jsx
// v5: useHistory
const history = useHistory();
history.push('/dashboard');
history.replace('/login');
history.goBack();

// v6: useNavigate
const navigate = useNavigate();
navigate('/dashboard');
navigate('/login', { replace: true });
navigate(-1); // go back
navigate(1);  // go forward
navigate('/checkout', { state: { from: '/cart' } }); // pass state
```

---

## Nested Routes with Outlet

The most significant architectural change in v6. Parent routes render `<Outlet />` as a placeholder for child routes:

```jsx
// App.jsx — route configuration
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />           {/* path="/" */}
        <Route path="about" element={<About />} />   {/* path="/about" */}
        <Route path="dashboard" element={<Dashboard />}>
          <Route index element={<Overview />} />            {/* path="/dashboard" */}
          <Route path="analytics" element={<Analytics />} /> {/* path="/dashboard/analytics" */}
          <Route path="settings" element={<Settings />} />   {/* path="/dashboard/settings" */}
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Layout.jsx — renders nav + Outlet (where child routes appear)
function Layout() {
  return (
    <div>
      <Nav />
      <main>
        <Outlet /> {/* Child route renders here */}
      </main>
    </div>
  );
}

// Dashboard.jsx — renders sidebar + Outlet for dashboard sub-routes
function Dashboard() {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div>
        <Outlet /> {/* Analytics or Settings renders here */}
      </div>
    </div>
  );
}
```

### Passing Data Through Outlet

```jsx
// Parent can pass context to nested routes via Outlet context
function Dashboard() {
  const [user] = useState({ name: 'Alice', role: 'admin' });
  return (
    <div>
      <Outlet context={{ user }} />
    </div>
  );
}

// Child accesses it via useOutletContext
function Analytics() {
  const { user } = useOutletContext();
  return <p>Viewing as: {user.name}</p>;
}
```

---

## Dynamic Routes and useParams

```jsx
<Route path="users/:userId/posts/:postId" element={<PostDetail />} />

function PostDetail() {
  const { userId, postId } = useParams();
  // Both are strings — parse numbers explicitly
  const userIdNum = parseInt(userId, 10);

  // Handle invalid params gracefully
  if (isNaN(userIdNum)) {
    return <Navigate to="/users" replace />;
  }

  return <div>User {userId}, Post {postId}</div>;
}
```

---

## Search Params with useSearchParams

```jsx
// URL: /products?category=electronics&sort=price&page=2
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? 'all';
  const sort = searchParams.get('sort') ?? 'name';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  function updateFilter(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.set('page', '1'); // reset pagination on filter change
      return next;
    });
  }

  return (
    <div>
      <select value={category} onChange={e => updateFilter('category', e.target.value)}>
        <option value="">All</option>
        <option value="electronics">Electronics</option>
      </select>
      {/* ... */}
    </div>
  );
}
```

---

## Loaders and Actions (Data Routing)

Introduced in v6.4, loaders run before the component renders and make data available immediately:

```jsx
// router.jsx — using createBrowserRouter for data routing
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'users',
        element: <UserList />,
        loader: async ({ request }) => {
          // Check auth before rendering
          const user = await getAuthUser();
          if (!user) {
            throw redirect('/login');
          }
          // Return data — available via useLoaderData()
          return { users: await fetchUsers() };
        },
        errorElement: <ErrorPage />,
      },
      {
        path: 'users/:id',
        element: <UserDetail />,
        loader: async ({ params }) => {
          const user = await fetchUser(params.id);
          if (!user) throw new Response('Not Found', { status: 404 });
          return { user };
        },
        action: async ({ request, params }) => {
          // Handle form submissions to this route
          const formData = await request.formData();
          const name = formData.get('name');
          await updateUser(params.id, { name });
          return redirect(`/users/${params.id}`);
        },
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

// In the component:
function UserList() {
  const { users } = useLoaderData();
  // No loading state needed — data is ready before component mounts
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// For form submission (works with native HTML forms):
function UserDetail() {
  const { user } = useLoaderData();
  return (
    <Form method="post">
      <input name="name" defaultValue={user.name} />
      <button type="submit">Save</button>
    </Form>
  );
}
```

---

## Protected Routes Implementation

```jsx
// ProtectedRoute.jsx — v6 idiomatic pattern
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner />;
  }

  if (!user) {
    // Save the attempted URL for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />; // render the child route
}

// Usage in router:
<Routes>
  <Route path="/login" element={<Login />} />

  {/* All authenticated routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
  </Route>

  {/* Admin-only routes */}
  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
    <Route path="/admin" element={<AdminPanel />} />
  </Route>
</Routes>

// Login.jsx — redirect back after login
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  async function handleSubmit(credentials) {
    await login(credentials);
    navigate(from, { replace: true }); // go to originally requested page
  }
}
```

---

## Code Splitting with Lazy Routes

```jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Error Handling with useRouteError

```jsx
// ErrorPage.jsx — rendered when a loader/action throws
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // Error from a Response throw (e.g., 404, 401)
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  // Unexpected error
  return <div>Something went wrong: {error.message}</div>;
}
```

---

## Link vs NavLink vs useNavigate

```jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';

// Link: basic navigation — use for most links
<Link to="/about">About</Link>
<Link to="/users/5" state={{ scrollTo: 'top' }}>User 5</Link>

// NavLink: adds `active` class/style when route matches — use for nav menus
<NavLink
  to="/dashboard"
  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
  style={({ isActive, isPending }) => ({
    color: isActive ? 'blue' : 'black',
  })}
>
  Dashboard
</NavLink>

// useNavigate: programmatic navigation — use after async operations
const navigate = useNavigate();
async function handleSubmit(data) {
  await submitForm(data);
  navigate('/success'); // navigate after async operation
}
```
