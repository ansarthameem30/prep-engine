/**
 * Day 18 Hands-On: Component Test Suite
 *
 * Install: npm install --save-dev @testing-library/react @testing-library/user-event
 *          npm install --save-dev msw jest-environment-jsdom
 *
 * Five test cases covering the most common patterns you'll encounter
 * in a senior-level React testing interview.
 */

import React, { useState, useEffect } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS UNDER TEST
// ─────────────────────────────────────────────────────────────────────────────

// 1. Simple counter component
function Counter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)} aria-label="increment">+</button>
      <button onClick={() => setCount(c => c - 1)} aria-label="decrement">-</button>
      <button onClick={() => setCount(0)} aria-label="reset">Reset</button>
    </div>
  );
}

// 2. Controlled form component
function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email format');
      return;
    }
    setError('');
    onSubmit({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          aria-describedby={error ? 'form-error' : undefined}
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      {error && <p id="form-error" role="alert">{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}

// 3. Async data component
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { if (!cancelled) setUsers(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <div role="status" aria-label="loading">Loading users...</div>;
  if (error) return <div role="alert">Error: {error}</div>;

  return (
    <ul aria-label="user list">
      {users.map(user => (
        <li key={user.id} data-testid={`user-${user.id}`}>
          <span>{user.name}</span>
          <span> — </span>
          <span>{user.email}</span>
        </li>
      ))}
    </ul>
  );
}

// 4. Todo list with delete
function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Write tests', done: false },
    { id: 3, text: 'Exercise', done: true },
  ]);
  const [newTodo, setNewTodo] = useState('');

  function addTodo(e) {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { id: Date.now(), text: newTodo.trim(), done: false }]);
    setNewTodo('');
  }

  return (
    <div>
      <h1>Todos</h1>
      <form onSubmit={addTodo}>
        <label htmlFor="new-todo">Add todo</label>
        <input
          id="new-todo"
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => setTodos(prev =>
                  prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t)
                )}
              />
              {todo.text}
            </label>
            <button
              aria-label={`Delete ${todo.text}`}
              onClick={() => setTodos(prev => prev.filter(t => t.id !== todo.id))}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <p>{todos.filter(t => t.done).length} of {todos.length} completed</p>
    </div>
  );
}

// 5. Custom hook under test
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// MSW SERVER SETUP
// ─────────────────────────────────────────────────────────────────────────────

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
      { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
    ]);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Counter Component
// ─────────────────────────────────────────────────────────────────────────────

describe('Counter', () => {
  it('renders with initial count of 0', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  it('increments when + button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={5} />);

    await user.click(screen.getByRole('button', { name: 'increment' }));

    expect(screen.getByText('Count: 6')).toBeInTheDocument();
  });

  it('decrements when - button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={5} />);

    await user.click(screen.getByRole('button', { name: 'decrement' }));

    expect(screen.getByText('Count: 4')).toBeInTheDocument();
  });

  it('resets to 0 when Reset is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={10} />);

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: LoginForm — Testing Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  it('calls onSubmit with credentials when form is valid', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'password123',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid email/i);
  });

  it('clears error after correcting the form', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    // Trigger error
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Fix and resubmit
    await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
    await user.type(screen.getByLabelText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockSubmit).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: UserList — Async Component with MSW
// ─────────────────────────────────────────────────────────────────────────────

describe('UserList', () => {
  it('shows loading state initially', () => {
    render(<UserList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders users after successful fetch', async () => {
    render(<UserList />);

    // findBy includes implicit waitFor
    const list = await screen.findByRole('list', { name: /user list/i });

    expect(within(list).getByText('Alice Smith')).toBeInTheDocument();
    expect(within(list).getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    // Override handler for this specific test
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      })
    );

    render(<UserList />);

    const errorEl = await screen.findByRole('alert');
    expect(errorEl).toHaveTextContent('HTTP 500');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: TodoApp — Complex User Interactions
// ─────────────────────────────────────────────────────────────────────────────

describe('TodoApp', () => {
  it('displays initial todos and completion count', () => {
    render(<TodoApp />);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
  });

  it('adds a new todo when form is submitted', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.type(screen.getByLabelText(/add todo/i), 'Read a book');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByLabelText(/add todo/i)).toHaveValue(''); // input cleared
  });

  it('deletes a todo when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.click(screen.getByRole('button', { name: /delete buy groceries/i }));

    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 completed')); // count updated
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Custom Hook — useDebounce
// ─────────────────────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update before the delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('initial'); // still old value

    act(() => jest.advanceTimersByTime(100)); // now 300ms have passed
    expect(result.current).toBe('updated');
  });

  it('resets the timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => jest.advanceTimersByTime(200));

    rerender({ value: 'abc' }); // reset timer
    act(() => jest.advanceTimersByTime(200)); // only 200ms since last change

    expect(result.current).toBe('a'); // still old value, timer not expired

    act(() => jest.advanceTimersByTime(100)); // now 300ms from 'abc'
    expect(result.current).toBe('abc');
  });
});
