/**
 * Day 16 Hands-On: React Router v6 — Protected Routes + Nested Routing
 *
 * Run with: npm install react-router-dom
 *
 * This demonstrates a full routing setup with:
 * 1. Nested routes with Outlet
 * 2. Protected routes with role-based access
 * 3. Programmatic navigation
 * 4. Search params
 */

import React, { useState, createContext, useContext } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT — simulates authentication state
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = not logged in

  const login = (role = 'user') => {
    setUser({ id: 1, name: 'Alice', role });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTE — v6 idiomatic pattern using Outlet
// ─────────────────────────────────────────────────────────────────────────────

function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Preserve the attempted URL in state for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        <h2>403 — Unauthorized</h2>
        <p>You need role: {allowedRoles.join(' or ')} to access this page.</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  return <Outlet />; // render child route
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

function Home() {
  return (
    <div>
      <h2>Home</h2>
      <p>Public page — anyone can see this.</p>
      <Link to="/dashboard">Go to Dashboard →</Link>
    </div>
  );
}

function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  // If already logged in, redirect
  if (user) return <Navigate to={from} replace />;

  return (
    <div>
      <h2>Login</h2>
      {location.state?.from && (
        <p style={{ color: 'orange' }}>
          You need to login to access: {location.state.from.pathname}
        </p>
      )}
      <button
        onClick={() => {
          login('user');
          navigate(from, { replace: true }); // back to originally requested page
        }}
      >
        Login as User
      </button>
      <button
        onClick={() => {
          login('admin');
          navigate(from, { replace: true });
        }}
      >
        Login as Admin
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT — renders navigation + Outlet for all child routes
// ─────────────────────────────────────────────────────────────────────────────

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1976d2', color: 'white', padding: '8px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <NavLink to="/" style={({ isActive }) => ({ color: 'white', fontWeight: isActive ? 'bold' : 'normal', textDecoration: 'none' })}>
          Home
        </NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" style={({ isActive }) => ({ color: 'white', fontWeight: isActive ? 'bold' : 'normal', textDecoration: 'none' })}>
              Dashboard
            </NavLink>
            <NavLink to="/products" style={({ isActive }) => ({ color: 'white', fontWeight: isActive ? 'bold' : 'normal', textDecoration: 'none' })}>
              Products
            </NavLink>
            {user.role === 'admin' && (
              <NavLink to="/admin" style={({ isActive }) => ({ color: 'white', fontWeight: isActive ? 'bold' : 'normal', textDecoration: 'none' })}>
                Admin
              </NavLink>
            )}
            <span style={{ marginLeft: 'auto' }}>
              {user.name} ({user.role})
            </span>
            <button onClick={() => { logout(); navigate('/login', { replace: true }); }} style={{ color: 'white', background: 'transparent', border: '1px solid white', cursor: 'pointer' }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: 'white', marginLeft: 'auto', textDecoration: 'none' }}>
            Login
          </Link>
        )}
      </nav>
      <main style={{ padding: 20 }}>
        <Outlet /> {/* Child route renders here */}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD — nested routes with its own Outlet
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <aside style={{ width: 160, borderRight: '1px solid #eee', paddingRight: 20 }}>
        <h3>Dashboard</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><NavLink to="/dashboard" end style={({ isActive }) => ({ color: isActive ? 'blue' : 'inherit' })}>Overview</NavLink></li>
          <li><NavLink to="/dashboard/analytics" style={({ isActive }) => ({ color: isActive ? 'blue' : 'inherit' })}>Analytics</NavLink></li>
          <li><NavLink to="/dashboard/settings" style={({ isActive }) => ({ color: isActive ? 'blue' : 'inherit' })}>Settings</NavLink></li>
        </ul>
      </aside>
      <div style={{ flex: 1 }}>
        <Outlet /> {/* Nested dashboard routes render here */}
      </div>
    </div>
  );
}

function DashboardOverview() {
  return <div><h2>Overview</h2><p>Welcome to your dashboard.</p></div>;
}

function DashboardAnalytics() {
  return <div><h2>Analytics</h2><p>Charts and metrics here.</p></div>;
}

function DashboardSettings() {
  return <div><h2>Settings</h2><p>Account preferences.</p></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — demonstrates search params + dynamic routes
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 1, name: 'Laptop', category: 'Electronics', price: 999 },
  { id: 2, name: 'T-Shirt', category: 'Clothing', price: 29 },
  { id: 3, name: 'React Book', category: 'Books', price: 49 },
  { id: 4, name: 'Headphones', category: 'Electronics', price: 199 },
  { id: 5, name: 'Jeans', category: 'Clothing', price: 79 },
];

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') ?? '';

  const filtered = category
    ? PRODUCTS.filter((p) => p.category === category)
    : PRODUCTS;

  return (
    <div>
      <h2>Products</h2>
      <div>
        <strong>Filter: </strong>
        {['', 'Electronics', 'Clothing', 'Books'].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              if (cat) setSearchParams({ category: cat });
              else setSearchParams({});
            }}
            style={{ marginRight: 8, fontWeight: category === cat ? 'bold' : 'normal' }}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>
      <ul>
        {filtered.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.name}</Link> — ${p.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = PRODUCTS.find((p) => p.id === parseInt(productId, 10));

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h2>{product.name}</h2>
      <p>Category: {product.category}</p>
      <p>Price: ${product.price}</p>
    </div>
  );
}

// Admin — role-restricted
function AdminPanel() {
  return <div><h2>Admin Panel</h2><p>Admin-only content.</p></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP — Full Route Configuration
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public routes */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />

            {/* Protected: authenticated users */}
            <Route element={<ProtectedRoute />}>
              {/* Nested dashboard routes */}
              <Route path="dashboard" element={<Dashboard />}>
                <Route index element={<DashboardOverview />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="settings" element={<DashboardSettings />} />
              </Route>

              {/* Products with search params + dynamic routes */}
              <Route path="products" element={<Products />} />
              <Route path="products/:productId" element={<ProductDetail />} />
            </Route>

            {/* Protected: admin only */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="admin" element={<AdminPanel />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<div><h2>404 — Page Not Found</h2><Link to="/">Go Home</Link></div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
