# Testing React: Philosophy to Practice

## Testing Philosophy: The Testing Trophy

The testing trophy (Kent C. Dodds) recommends prioritizing tests in this order:

```
        /\
       /E2E\      (few — Cypress/Playwright)
      /──────\
     /Integration\   (most — component + API together)
    /────────────────\
   /Unit Tests        \  (fast — pure functions, hooks)
  /──────────────────────\
 /Static Analysis (TS+ESLint)\
```

For React applications:
- **Static** (TypeScript, ESLint): Catches typos, type errors, unused variables — free
- **Unit**: Pure utility functions, reducers, custom hooks with `renderHook`
- **Integration**: Component tests that exercise component + hooks + context + real DOM — the highest value per test
- **E2E**: Full user flows (login → checkout → confirmation) — slow but high confidence

**The anti-pattern**: Testing implementation details (internal state values, component method calls). These tests break on refactors that don't change behavior — they create false negatives and maintenance burden.

**The principle**: Tests should tell you the component works for the user, not how it's implemented internally.

---

## Jest: The Testing Environment

### Matchers

```js
// Equality
expect(value).toBe(5);           // strict equality (===)
expect(obj).toEqual({ a: 1 });   // deep equality
expect(fn).toHaveBeenCalledWith(1, 'hello');
expect(arr).toContain(5);
expect(arr).toHaveLength(3);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Async
await expect(asyncFn()).resolves.toBe('result');
await expect(asyncFn()).rejects.toThrow('Error message');

// Strings
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');
```

### Mocks

```js
// jest.fn() — create a mock function
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: [] }); // for async
mockFn.mockRejectedValue(new Error('fail'));
mockFn.mockImplementation((x) => x * 2);

// Inspect calls
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenLastCalledWith('lastArg');

// jest.spyOn() — spy on existing functions
const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... test code that may call console.error
expect(spy).toHaveBeenCalled();
spy.mockRestore();

// jest.mock() — mock an entire module
jest.mock('./api', () => ({
  fetchUsers: jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
}));

// Mock with factory for module with default export
jest.mock('./useAuth', () => ({
  useAuth: () => ({ user: { id: 1 }, isLoading: false }),
}));
```

### Timer Mocks

```js
jest.useFakeTimers();

// Test debounce/throttle without actual waiting
act(() => {
  fireEvent.change(input, { target: { value: 'hello' } });
  jest.advanceTimersByTime(300); // fast-forward 300ms
});

expect(mockFn).toHaveBeenCalledWith('hello');

jest.useRealTimers(); // restore in afterEach
```

---

## React Testing Library: Core Philosophy

"The more your tests resemble how software is used, the more confidence they give you." — Kent C. Dodds

### Render and Query

```jsx
import { render, screen, within } from '@testing-library/react';

// Render with providers
function renderWithProviders(ui, options = {}) {
  const { initialState = {} } = options;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const { getByRole, queryByText } = renderWithProviders(<UserList />);
```

### Query Priority (use in this order)

```js
// 1. Role — mirrors accessibility tree (best)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { level: 1 })
screen.getByRole('alert') // for error messages

// 2. Label text — connected to form inputs
screen.getByLabelText(/email address/i)

// 3. Placeholder text
screen.getByPlaceholderText(/search.../i)

// 4. Text content
screen.getByText(/welcome, alice/i)

// 5. Test ID — last resort (implementation detail)
screen.getByTestId('submit-button')
```

### userEvent vs fireEvent

```jsx
import userEvent from '@testing-library/user-event';

// userEvent is more accurate — simulates real browser events
// (keydown, keypress, keyup, focus, blur, etc.)

// Setup userEvent (v14+)
const user = userEvent.setup();

// Click
await user.click(screen.getByRole('button', { name: /submit/i }));

// Type
await user.type(screen.getByRole('textbox', { name: /email/i }), 'alice@example.com');

// Clear and type
await user.clear(input);
await user.type(input, 'new value');

// Keyboard
await user.keyboard('{Enter}');
await user.keyboard('{Tab}');

// Select
await user.selectOptions(select, 'option-value');
```

---

## Testing Async Components

```jsx
// Component under test:
function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div role="status">Loading...</div>;
  if (error) return <div role="alert">Error: {error.message}</div>;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// Test:
describe('UserList', () => {
  it('shows loading state initially', () => {
    render(<UserList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders users after successful fetch', async () => {
    jest.spyOn(api, 'getUsers').mockResolvedValue([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    render(<UserList />);

    // findBy queries include implicit waitFor
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    jest.spyOn(api, 'getUsers').mockRejectedValue(new Error('Network error'));

    render(<UserList />);

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Network error');
  });
});
```

---

## Mock Service Worker (MSW)

MSW intercepts requests at the network level — your actual `fetch` or `axios` runs, but the response is intercepted and mocked. This is more realistic than mocking the module.

```js
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body }, { status: 201 });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// src/mocks/server.js (for Node.js/Jest)
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// src/setupTests.js
import { server } from './mocks/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers()); // clean handler overrides
afterAll(() => server.close());

// In tests: override handler for specific test
it('shows error on API failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ message: 'Server error' }, { status: 500 });
    })
  );

  render(<UserList />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

---

## Testing Custom Hooks

```js
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('increments count', () => {
  const { result } = renderHook(() => useCounter(0));

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// With React Query context
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

test('useUserData fetches and returns user', async () => {
  const { result } = renderHook(() => useUserData(1), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data.name).toBe('Alice');
});
```

---

## Test Coverage: What Matters

```bash
# Run with coverage report
jest --coverage

# What to look at:
# - Branch coverage: are all code paths tested? (most important)
# - Line coverage: every line executed at least once
# - Statement coverage: every statement executed

# What NOT to care about:
# - 100% coverage is not the goal — 80% meaningful coverage > 100% superficial
# - Lines covered by trivial assertions (snapshot tests, existence checks)
# - Configuration files, index.js barrel exports, type definitions
```

Configure what to include in coverage:
```js
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/mocks/**',
    '!src/index.{js,jsx}',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  },
};
```
