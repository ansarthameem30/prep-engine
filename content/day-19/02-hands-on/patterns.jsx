/**
 * Day 19 Hands-On: Advanced React Patterns
 *
 * 1. Compound Component — Tabs implementation
 * 2. HOC — withAuth for route protection
 * 3. Portal — Modal component
 * 4. Error Boundary — with recovery
 */

import React, {
  useState,
  useContext,
  createContext,
  useRef,
  createPortal,
  useEffect,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 1: COMPOUND COMPONENT — Tabs
//
// Key points to explain in an interview:
// - Context shares state between sibling sub-components (no prop drilling)
// - The API is compositional — consumer controls layout
// - Each sub-component is autonomous — doesn't need to be passed the state
// ─────────────────────────────────────────────────────────────────────────────

const TabsContext = createContext(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs sub-components must be used within a <Tabs> component');
  }
  return context;
}

function Tabs({ defaultValue, children, onChange }) {
  const [activeValue, setActiveValue] = useState(defaultValue);

  function handleChange(value) {
    setActiveValue(value);
    onChange?.(value);
  }

  return (
    <TabsContext.Provider value={{ activeValue, onChange: handleChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, ...props }) {
  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: '2px solid #eee', ...props.style }}>
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, disabled = false }) {
  const { activeValue, onChange } = useTabs();
  const isActive = activeValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      disabled={disabled}
      onClick={() => !disabled && onChange(value)}
      style={{
        padding: '8px 16px',
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderBottom: isActive ? '2px solid #1976d2' : '2px solid transparent',
        color: isActive ? '#1976d2' : disabled ? '#aaa' : '#333',
        fontWeight: isActive ? 'bold' : 'normal',
        marginBottom: -2, // overlap the tablist border
      }}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, children }) {
  const { activeValue } = useTabs();
  if (activeValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      style={{ padding: 16 }}
    >
      {children}
    </div>
  );
}

// Attach sub-components
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Panel = TabsPanel;

function TabsDemo() {
  return (
    <div>
      <h3>Compound Component: Tabs</h3>
      <Tabs defaultValue="overview" onChange={v => console.log('Tab changed to:', v)}>
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="code">Code</Tabs.Trigger>
          <Tabs.Trigger value="docs">Docs</Tabs.Trigger>
          <Tabs.Trigger value="disabled" disabled>Disabled</Tabs.Trigger>
          {/* Consumer can add anything between tabs */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#999' }}>v2.0</span>
          </div>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <h4>Overview Panel</h4>
          <p>This is the overview content. The layout is fully controlled by the consumer.</p>
        </Tabs.Panel>
        <Tabs.Panel value="code">
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
            {`<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="overview">
    Content here
  </Tabs.Panel>
</Tabs>`}
          </pre>
        </Tabs.Panel>
        <Tabs.Panel value="docs">
          <h4>Documentation</h4>
          <p>Uses Context internally. Zero prop drilling. Fully composable.</p>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 2: HOC — withAuth
//
// Wraps any component with authentication check.
// Modern alternative: Protected Route in React Router v6.
// ─────────────────────────────────────────────────────────────────────────────

// Simulate auth context
const AuthContext = createContext({ user: null });

function withAuth(WrappedComponent, options = {}) {
  const { redirectTo = '/login', requiredRole = null } = options;

  function AuthenticatedComponent(props) {
    const { user } = useContext(AuthContext);

    if (!user) {
      return (
        <div style={{ padding: 16, border: '1px solid orange', borderRadius: 4 }}>
          <p>You must be logged in to view this component.</p>
          <p><em>(In production: redirect to {redirectTo})</em></p>
        </div>
      );
    }

    if (requiredRole && user.role !== requiredRole) {
      return (
        <div style={{ padding: 16, border: '1px solid red', borderRadius: 4 }}>
          <p>Access denied. Requires role: {requiredRole}. Your role: {user.role}</p>
        </div>
      );
    }

    // Pass user as extra prop to wrapped component
    return <WrappedComponent {...props} currentUser={user} />;
  }

  // Fix display name for DevTools
  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return AuthenticatedComponent;
}

function BaseAdminPanel({ currentUser }) {
  return (
    <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 4 }}>
      <h4>Admin Panel</h4>
      <p>Welcome, {currentUser.name}! (role: {currentUser.role})</p>
      <p>This component is only visible to admin users.</p>
    </div>
  );
}

const AdminPanel = withAuth(BaseAdminPanel, { requiredRole: 'admin' });

function HOCDemo() {
  const [userState, setUserState] = useState(null);

  return (
    <div>
      <h3>HOC: withAuth</h3>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setUserState(null)}>Logout</button>
        <button onClick={() => setUserState({ name: 'Alice', role: 'user' })}>
          Login as User
        </button>
        <button onClick={() => setUserState({ name: 'Bob', role: 'admin' })}>
          Login as Admin
        </button>
      </div>
      <AuthContext.Provider value={{ user: userState }}>
        <AdminPanel />
      </AuthContext.Provider>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 3: PORTAL — Modal
//
// Renders outside the React root to escape CSS stacking contexts.
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ isOpen, onClose, title, children }) {
  // Trap focus inside modal when open
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus the modal container
    modalRef.current?.focus();

    // Close on Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          background: 'white', borderRadius: 8, padding: 24,
          maxWidth: 400, width: '90%', outline: 'none',
        }}
        onClick={e => e.stopPropagation()} // prevent close when clicking inside
      >
        <h3 id="modal-title" style={{ marginTop: 0 }}>{title}</h3>
        {children}
        <button onClick={onClose} style={{ marginTop: 16 }}>Close</button>
      </div>
    </div>
  );

  // Render in modal-root if it exists, otherwise in body
  const target = document.getElementById('modal-root') ?? document.body;
  return createPortal(modalContent, target);
}

function PortalDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ overflow: 'hidden', padding: 16, border: '1px solid #eee' }}>
      <h3>Portal: Modal</h3>
      <p>
        This container has `overflow: hidden`. Without a portal, the modal would
        be clipped. The portal renders outside this container.
      </p>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Portal Modal"
      >
        <p>This modal rendered via createPortal, escaping the overflow:hidden container.</p>
        <p>Press Escape or click outside to close.</p>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN 4: ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        React.cloneElement(this.props.fallback, {
          error: this.state.error,
          resetError: () => this.setState({ hasError: false, error: null }),
        })
      ) : (
        <div style={{ padding: 16, border: '1px solid red', borderRadius: 4 }}>
          <h4>Something went wrong</h4>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BuggyCounter() {
  const [count, setCount] = useState(0);
  if (count === 3) throw new Error('Counter reached 3! (simulated error)');
  return (
    <div>
      <p>Count: {count} (throws at 3)</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

function ErrorBoundaryDemo() {
  const [key, setKey] = useState(0); // remounting resets the boundary

  return (
    <div>
      <h3>Error Boundary</h3>
      <ErrorBoundary key={key}>
        <BuggyCounter />
      </ErrorBoundary>
      <button onClick={() => setKey(k => k + 1)} style={{ marginTop: 8 }}>
        Reset (remount boundary)
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 700 }}>
      <h1>Day 19: Advanced React Patterns</h1>
      <hr /><TabsDemo />
      <hr /><HOCDemo />
      <hr /><PortalDemo />
      <hr /><ErrorBoundaryDemo />
    </div>
  );
}
