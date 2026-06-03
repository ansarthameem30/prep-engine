# Testing React – Interview Q&A

## Q1: Explain the testing trophy and how you decide what to test.

**Answer:**
The testing trophy (Kent C. Dodds) recommends investing most effort in **integration tests** — tests that exercise multiple units together without mocking internal implementation details.

Prioritization:
- **Static analysis** (TypeScript, ESLint): Catches bugs before runtime, zero cost
- **Unit tests**: For pure functions, reducers, and custom hooks that have complex logic independent of UI
- **Integration tests**: Component + hooks + real DOM interaction + mocked network. These give the most confidence per unit of test maintenance
- **E2E tests**: Full user flows in a real browser — slow, expensive, but verify the complete system

Decision framework:
- If it's a pure function with complex branching logic → unit test
- If it's a React component the user interacts with → integration test (RTL)
- If it's a critical user journey (checkout, sign-up) → E2E test
- Don't test implementation details: internal state values, component method calls, Redux action types

---

## Q2: What's wrong with testing implementation details, and how does RTL prevent it?

**Answer:**
Tests that check implementation details (internal state, method names, class names) are:
- **Fragile**: Break when you refactor even if behavior doesn't change
- **Low confidence**: Pass even when user-facing behavior is broken

Example of bad test:
```js
// Bad: tests internal state
const wrapper = shallow(<Counter />);
expect(wrapper.state('count')).toBe(0);
wrapper.instance().increment();
expect(wrapper.state('count')).toBe(1);
// Breaks if you rename `count` to `value` or switch from class to function component
```

React Testing Library prevents this by only providing:
- Queries by accessibility role, label, text — what the user sees
- No access to component internals, state, or props directly
- Interactions via `userEvent` that simulate real browser events

```js
// Good: tests what the user sees and does
render(<Counter />);
expect(screen.getByText('Count: 0')).toBeInTheDocument();
await userEvent.click(screen.getByRole('button', { name: 'increment' }));
expect(screen.getByText('Count: 1')).toBeInTheDocument();
// Works regardless of implementation: class, hooks, state structure, CSS classes
```

---

## Q3: When should you use `findBy*` vs `getBy*` vs `queryBy*` queries?

**Answer:**

| Query | Returns | Throws if missing | Awaits |
|-------|---------|-------------------|--------|
| `getBy*` | Element | Yes | No |
| `queryBy*` | Element or null | No | No |
| `findBy*` | Promise<Element> | Yes (after timeout) | Yes |

Usage rules:
- **`getBy*`**: Use when element should be in the DOM right now (synchronous)
- **`queryBy*`**: Use when checking that something is NOT in the DOM — `expect(screen.queryByText('Error')).not.toBeInTheDocument()`
- **`findBy*`**: Use when waiting for async updates — `await screen.findByText('Alice')` automatically waits up to 1000ms

```js
// Don't do this — fragile and requires manual waitFor:
await waitFor(() => {
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

// Do this instead:
expect(await screen.findByText('Alice')).toBeInTheDocument();
```

---

## Q4: What is Mock Service Worker (MSW) and why is it better than mocking fetch/axios?

**Answer:**
MSW is a service worker (in browser) or request interceptor (in Node.js/test) that intercepts network requests and returns mock responses.

**Why it's better than jest.mock('axios')**:
1. **Layer**: MSW intercepts at the network level, not the module level. Your actual `fetch`, `axios`, or any HTTP library runs. Only the network is mocked.
2. **Realism**: Tests exercise the same code path a real user would — including request construction, response parsing, error handling
3. **Reusability**: Same mock handlers work in Node.js tests, browser development mode (with `msw/browser`), and Storybook
4. **Independence**: Tests don't care what HTTP library you use — if you switch from axios to fetch, no tests break

```js
// With jest.mock('axios'): tests are coupled to axios
// Switching to fetch breaks ALL tests even though behavior is unchanged

// With MSW: tests are coupled to the HTTP contract, not the library
// Switching from axios to fetch: zero test changes needed
```

---

## Q5: How do you test a component that uses useEffect for data fetching?

**Answer:**
The key is using `findBy*` queries (or explicit `waitFor`) since the component initially renders in loading state, then updates asynchronously.

```js
// Component:
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser)
      .catch(setError);
  }, [userId]);

  if (!user && !error) return <div role="status">Loading...</div>;
  if (error) return <div role="alert">Error loading user</div>;
  return <h1>{user.name}</h1>;
}

// Test:
it('displays user name after loading', async () => {
  // MSW handles the mock response
  render(<UserProfile userId={1} />);

  // Loading state is visible immediately
  expect(screen.getByRole('status')).toBeInTheDocument();

  // Wait for async update — findBy* waits automatically
  const heading = await screen.findByRole('heading');
  expect(heading).toHaveTextContent('Alice');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
```

---

## Q6: How do you test Redux-connected components or components using Context?

**Answer:**
Wrap the component in the required providers inside a render helper. Avoid testing Redux actions/selectors separately from the component — test them together as the user experiences them.

```js
// Create a render helper with providers:
function renderWithRedux(ui, { preloadedState = {}, ...options } = {}) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
  });
  return render(<Provider store={store}>{ui}</Provider>, options);
}

// For React Query:
function renderWithQuery(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }, // no retries in tests
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options
  );
}

// Test:
it('shows user count from store', () => {
  renderWithRedux(<UserCount />, {
    preloadedState: { users: { entities: { 1: { id: 1, name: 'Alice' } }, ids: [1] } }
  });
  expect(screen.getByText('1 user')).toBeInTheDocument();
});
```

---

## Q7: What are the most common test mistakes React developers make?

**Answer:**

**1. Testing snapshot blindly**: Snapshot tests pass/fail based on HTML output, not behavior. They break on trivial changes (spacing, class names) and get disabled when they break. Better: test specific behavior with meaningful assertions.

**2. Not wrapping state updates in `act`**: State updates from user events outside RTL's `userEvent` need `act()`. RTL's queries (findBy, waitFor) handle this automatically.

**3. Using `getByTestId` for everything**: Overuse of `data-testid` bypasses accessibility testing benefits. `getByRole`, `getByLabelText`, `getByText` are better — they test accessibility too.

**4. Mocking too much**: Over-mocking makes tests test the mocks, not the code. Each mock should be justified.

**5. Not cleaning up between tests**: `afterEach(() => server.resetHandlers())` for MSW, `jest.restoreAllMocks()` for spies.

**6. Testing presentation not behavior**: Testing that a button has class "btn-primary" instead of testing that clicking it does what it should.

---

## Q8: How do you test error boundaries?

**Answer:**
Error boundaries require class components in React, and testing them requires a component that throws. The challenge: React logs the error to console, which pollutes test output.

```js
// Suppress expected console.error for error boundary tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => consoleSpy.mockRestore());

// Component that throws
function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('Bomb exploded');
  return <div>Safe</div>;
}

// Test
it('displays fallback when child throws', () => {
  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Bomb shouldThrow={true} />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  expect(screen.queryByText('Safe')).not.toBeInTheDocument();
  expect(consoleSpy).toHaveBeenCalled(); // React logs the error
});

it('renders normally when no error', () => {
  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Bomb shouldThrow={false} />
    </ErrorBoundary>
  );

  expect(screen.getByText('Safe')).toBeInTheDocument();
  expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
});
```
