# State Management – Interview Q&A

## Q1: When would you choose Zustand over Redux Toolkit?

**Answer:**
Zustand is the better choice when:
- The application is small to medium sized with no complex async workflows
- The team is small and Redux's patterns (actions, reducers, thunks) add friction without benefit
- You need minimal bundle size (~3KB vs ~30KB for Redux Toolkit)
- You don't need Redux DevTools time-travel debugging (though Zustand has basic devtools)
- You want stores without Provider wrappers

Redux Toolkit is better when:
- Large team that benefits from Redux's strict conventions
- Complex async workflows with many interdependent state transitions
- Heavy use of Redux DevTools (time-travel, action replay, import/export state)
- You're already using RTK Query and want an integrated data fetching solution
- Existing Redux codebase that you're modernizing

Neither is "better" — the right answer is context-dependent. For a new project in 2024, Zustand is the more pragmatic default.

---

## Q2: What is RTK Query and how does it differ from TanStack Query?

**Answer:**
Both solve the same problem: managing server state — data fetching, caching, loading/error states, cache invalidation, and background refetching.

**RTK Query**:
- Built into Redux Toolkit — your server state lives alongside your client state in Redux
- Uses a tag-based cache invalidation system (`providesTags`, `invalidatesTags`)
- Integrated with Redux DevTools — see every API call in the action log
- Generates React hooks from endpoint definitions
- Requires the Redux store

**TanStack Query**:
- Framework-agnostic (React, Vue, Solid, Svelte)
- No global store setup needed — just wrap your app in `QueryClientProvider`
- More flexible query key system
- Better support for infinite queries, SSR, and streaming
- Works perfectly with Zustand (different tools for different concerns)

Decision: If you're already using Redux, RTK Query is a natural fit. For greenfield projects or projects using Zustand, TanStack Query is simpler to set up and more powerful.

---

## Q3: Explain the server state vs client state distinction and why it matters.

**Answer:**
**Client state** is owned and controlled by the frontend: form values, modal open/closed, selected tab, filter settings. It's always "fresh" because you control all mutations.

**Server state** is owned by the backend and *cached* by the frontend: users, products, orders. It can:
- Become stale while the user has the app open (another user updated it)
- Be loading, errored, or partially loaded
- Need to be refetched on window focus or network reconnect
- Require cache invalidation when related mutations occur

Storing server state in Redux without a dedicated library means you need to manually implement all of this. You write:
- `FETCH_USERS_PENDING`, `FETCH_USERS_SUCCESS`, `FETCH_USERS_FAILURE` actions
- Stale detection logic
- Background refetch intervals
- Cache invalidation on mutations

TanStack Query and RTK Query provide this out of the box. The correct architecture is:
- Redux/Zustand: UI state, user preferences, shopping cart (transient client state)
- TanStack Query/RTK Query: anything fetched from an API

---

## Q4: How does Redux's `createAsyncThunk` handle errors, and what's the `rejectWithValue` pattern?

**Answer:**
`createAsyncThunk` dispatches three action types for each async operation: `pending`, `fulfilled`, and `rejected`. By default, if the async function throws, the `rejected` action contains `error.message`.

The problem: API errors typically return structured data (error codes, validation messages) that you want in your store. If you throw an error from the thunk, you only get the message string.

`rejectWithValue` lets you return a custom payload for the rejected case:

```js
const updateUser = createAsyncThunk(
  'users/update',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users', userData);
      return response.data;
    } catch (err) {
      // Instead of throwing (which gives a generic message),
      // return the API error details with rejectWithValue
      return rejectWithValue({
        status: err.response.status,
        message: err.response.data.message,
        fields: err.response.data.errors, // validation errors
      });
    }
  }
);

// In the slice:
.addCase(updateUser.rejected, (state, action) => {
  state.error = action.payload; // the structured error from rejectWithValue
  // vs action.error.message if you let it throw
})
```

---

## Q5: How do you prevent Zustand selector functions from causing unnecessary re-renders?

**Answer:**
By default, Zustand uses `===` (reference equality) to determine if a component should re-render. If a selector returns a new object or array reference on every call, the component re-renders on every state change — even unrelated ones.

```js
// BAD: new array reference on every call → re-renders on every state change
const users = useStore(state => state.users.filter(u => u.active));

// BAD: new object reference on every call
const { name, email } = useStore(state => ({ name: state.name, email: state.email }));
```

Solutions:

**1. Select primitives** (most common):
```js
const userName = useStore(state => state.user.name); // string → reference equal
const userCount = useStore(state => state.users.length); // number → value equal
```

**2. `shallow` equality from Zustand**:
```js
import { shallow } from 'zustand/shallow';
const { name, email } = useStore(
  state => ({ name: state.name, email: state.email }),
  shallow // do a shallow comparison of the returned object
);
```

**3. Selector with `useMemo` in the component**:
```js
const allUsers = useStore(state => state.users);
const activeUsers = useMemo(() => allUsers.filter(u => u.active), [allUsers]);
```

---

## Q6: What is the Context API's re-render problem, and when is Context appropriate?

**Answer:**
Every component that calls `useContext(MyContext)` re-renders whenever the context value changes — even if the specific data the component uses didn't change.

This is fine for:
- Values that rarely change: authentication, theme, locale
- Small apps where the overhead doesn't matter
- Values consumed by a small number of components

This becomes a problem when:
- Context value is an object with many properties
- Many components consume the context
- The context updates frequently (e.g., cursor position, scroll position)

**Rule of thumb**: If the context updates more often than its consumers need to re-render, don't use Context. Use Zustand with selectors instead.

```jsx
// Fine: rarely changes, only 2-3 consumers
const AuthContext = createContext();

// Problematic: updates every keystroke, 50+ consumers
const FormContext = createContext(); // DON'T put form state in context
```

---

## Q7: Describe an approach for structuring a large Redux store.

**Answer:**
The standard pattern is the **feature-based slice architecture** (also called "ducks" pattern):

```
src/
  features/
    auth/
      authSlice.js      ← createSlice + selectors + thunks
      authAPI.js        ← API calls used by thunks
      Auth.jsx          ← components
    users/
      usersSlice.js
      usersAPI.js
      UserList.jsx
    products/
      productsSlice.js
      ...
  app/
    store.js            ← configureStore combining all reducers
    rootReducer.js      ← optional: combineReducers
```

Key principles:
1. **Colocate**: slice, API, and components in the same feature folder
2. **Normalize** entities to avoid duplication: `{ ids: [], entities: {} }` pattern
3. **Memoize selectors** with `createSelector` (Reselect) for derived state
4. **Keep slices independent**: slices shouldn't import from each other; use the store to combine

For cross-slice logic:
```js
// Listen to another slice's action in extraReducers
authSlice.extraReducers(builder => {
  builder.addCase(userLoggedOut, (state) => {
    // Reset auth state when users/logout action fires
    return initialState;
  });
});
```

---

## Q8: How do you handle optimistic updates with RTK Query or TanStack Query?

**Answer:**
Optimistic updates immediately apply the expected mutation result to the UI, then revert if the request fails.

**TanStack Query:**
```js
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update
    queryClient.setQueryData(['todos'], (old) =>
      old.map(t => t.id === newTodo.id ? { ...t, ...newTodo } : t)
    );

    return { previousTodos }; // context for rollback
  },
  onError: (err, newTodo, context) => {
    // Rollback
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] }); // refetch
  },
});
```

**RTK Query:**
```js
updateTodo: builder.mutation({
  query: ({ id, ...patch }) => ({ url: `/todos/${id}`, method: 'PATCH', body: patch }),
  async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
    // Optimistic update
    const patchResult = dispatch(
      apiSlice.util.updateQueryData('getTodos', undefined, (draft) => {
        const todo = draft.find(t => t.id === id);
        if (todo) Object.assign(todo, patch);
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo(); // auto-rollback
    }
  },
}),
```

Key insight: cancel any in-flight queries before optimistically updating to prevent race conditions between the optimistic update and a completing stale query.
