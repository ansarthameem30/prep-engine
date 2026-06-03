# State Management Mastery

## When to Use Local State vs Context vs Redux vs Zustand

The decision matrix depends on three factors: **scope**, **update frequency**, and **complexity**:

| Use Case | Tool |
|----------|------|
| Form input, toggle, UI state | `useState` — keep it local |
| Shared between 2-3 nearby components | Lift state to common parent |
| Shared across the app, changes rarely (theme, user, locale) | Context API |
| Complex async flows, large teams, DevTools requirement | Redux Toolkit |
| Simple global state, small-medium app, minimal boilerplate | Zustand |
| Server-fetched data (users, products, orders) | TanStack Query |
| Highly derived/computed state | Jotai or Recoil |

**The most common mistake**: using Redux for everything including local form state and server-fetched data. Redux is optimized for *synchronized, client-owned* state. Server data has its own lifecycle (stale, loading, refetch) that Redux doesn't handle elegantly without RTK Query.

---

## Redux Toolkit: createSlice, createAsyncThunk, RTK Query

### createSlice

RTK's `createSlice` eliminates action type constants, action creators, and switch statements in one call:

```js
// features/users/usersSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { usersAPI } from '../../api/users';

// Async action: handles loading/success/error lifecycle automatically
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await usersAPI.getAll();
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await usersAPI.update(id, data);
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    entities: {},   // Normalized: { id: user }
    ids: [],        // Array of IDs for ordering
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    // Synchronous actions
    userRemoved(state, action) {
      delete state.entities[action.payload];
      state.ids = state.ids.filter(id => id !== action.payload);
    },
    userSelected(state, action) {
      state.selectedId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Normalize: convert array to entities object
        action.payload.forEach(user => {
          state.entities[user.id] = user;
        });
        state.ids = action.payload.map(u => u.id);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const user = action.payload;
        state.entities[user.id] = user;
      });
  },
});

export const { userRemoved, userSelected } = usersSlice.actions;
export default usersSlice.reducer;

// Selectors (can use reselect for memoization)
export const selectAllUsers = (state) =>
  state.users.ids.map(id => state.users.entities[id]);

export const selectUserById = (state, id) => state.users.entities[id];
export const selectUsersStatus = (state) => state.users.status;
```

### RTK Query — Data Fetching on Steroids

RTK Query is a full data-fetching and caching solution built into Redux Toolkit. It's comparable to TanStack Query but integrated with Redux.

```js
// services/api.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Post'],
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/users',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'User', id })), 'User']
          : ['User'],
    }),
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'], // refetch all user queries after creation
    }),
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
} = apiSlice;

// Usage in component:
function UserList() {
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  // ...
}
```

---

## Zustand: Minimal, Flexible Global State

Zustand uses a hook-based API with no Provider required. The store is created outside React and shared via a hook.

```js
// stores/useUserStore.js
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

// Slice pattern: separate concerns within one store
const createUserSlice = (set, get) => ({
  users: [],
  selectedUserId: null,

  // Actions
  setUsers: (users) => set({ users }),
  selectUser: (id) => set({ selectedUserId: id }),
  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

  // Async action
  fetchUsers: async () => {
    const users = await api.getUsers();
    set({ users });
  },
});

const createUISlice = (set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
});

// Combine slices
export const useStore = create(
  devtools(
    persist(
      (set, get) => ({
        ...createUserSlice(set, get),
        ...createUISlice(set),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({ selectedUserId: state.selectedUserId }), // only persist this
      }
    ),
    { name: 'AppStore' }
  )
);

// Selectors — components only re-render when selected slice changes
export const useUsers = () => useStore((state) => state.users);
export const useSelectedUser = () =>
  useStore((state) => state.users.find((u) => u.id === state.selectedUserId));
export const useSidebarOpen = () => useStore((state) => state.sidebarOpen);

// Usage — no Provider wrapper needed
function UserList() {
  const users = useUsers(); // only re-renders when users array changes
  const fetchUsers = useStore((s) => s.fetchUsers);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## Jotai/Recoil: Atom-Based State

Atom-based libraries treat global state as a collection of independent atoms (like useState but global). Components subscribe only to the atoms they use.

```js
// Jotai example
import { atom, useAtom, useAtomValue } from 'jotai';

const userAtom = atom(null);
const themeAtom = atom('light');

// Derived atom (computed value)
const isAdminAtom = atom((get) => get(userAtom)?.role === 'admin');

function Header() {
  const user = useAtomValue(userAtom);  // read-only
  const [theme, setTheme] = useAtom(themeAtom); // read + write
  const isAdmin = useAtomValue(isAdminAtom); // computed
}
```

Use Jotai when: you have many independent pieces of state and components that need very specific slices. The automatic dependency tracking avoids the manual selector pattern of Zustand.

---

## Server State vs Client State

This distinction is critical and often missing from junior-level answers:

**Client state**: UI state owned by the frontend — modal open/closed, selected tab, form input values, filter settings. Lives in React state, Context, or Zustand.

**Server state**: Data fetched from an API — users, products, orders. Has its own lifecycle: it can be stale, loading, or errored. It can be updated by other users without your knowledge. It needs background refetching, caching, and invalidation.

```
Client State                Server State
─────────────────────       ────────────────────────────
useState/Zustand/Redux      TanStack Query / RTK Query
You own it                  Server owns it (you cache it)
Always "fresh"              Can be stale
Sync updates                Async, with loading/error states
No caching needed           Cache + invalidate + background refetch
```

**The mistake**: Storing server data in Redux manually:
```js
// Anti-pattern: manually managing server data in Redux
dispatch(fetchUsersStart());
const users = await api.getUsers();
dispatch(fetchUsersSuccess(users));
// Now you also need to handle: caching, refetching, pagination, optimistic updates...
```

**The better approach**: TanStack Query or RTK Query handles all of this:
```js
const { data: users, isLoading } = useQuery(['users'], api.getUsers, {
  staleTime: 60_000, // consider fresh for 1 minute
  refetchOnWindowFocus: true,
});
```

---

## State Machine with XState (Brief Introduction)

For complex UI state with many possible transitions (wizard flows, drag-and-drop, authentication flows), finite state machines prevent impossible states:

```js
import { createMachine } from 'xstate';

const authMachine = createMachine({
  id: 'auth',
  initial: 'idle',
  states: {
    idle: { on: { SUBMIT: 'loading' } },
    loading: {
      on: {
        SUCCESS: 'authenticated',
        FAILURE: 'error',
      },
    },
    authenticated: { on: { LOGOUT: 'idle' } },
    error: { on: { RETRY: 'loading', CANCEL: 'idle' } },
  },
});

// Key benefit: you cannot be in 'loading' and 'authenticated' simultaneously
// Invalid state transitions are ignored, not bugs
```

---

## Decision Matrix

| Criteria | Redux Toolkit | Zustand | Context API | TanStack Query |
|----------|--------------|---------|-------------|----------------|
| Team size | Large | Any | Small-medium | Any |
| Complexity | High | Medium | Low | N/A |
| DevTools | Excellent | Good | Basic | Excellent |
| Boilerplate | Medium (RTK) | Very low | Low | Low |
| Async handling | RTK Query | Manual | Manual | Built-in |
| Server state | RTK Query | Manual | Poor | Excellent |
| Bundle size | ~30KB | ~3KB | 0 | ~12KB |
| Learning curve | Medium | Low | Very low | Medium |
| Best for | Enterprise, complex apps | Modern apps | Theme/auth | All server data |

---

## Migration from Redux to Zustand

Common pattern for incremental migration:

```js
// Step 1: Create Zustand store that mirrors Redux state shape
const useStore = create(set => ({
  users: [],
  setUsers: (users) => set({ users }),
}));

// Step 2: Add a compatibility layer if needed
// Components reading from Redux can temporarily read from Zustand too

// Step 3: Migrate feature by feature — one slice at a time
// Run both Redux and Zustand in parallel during migration

// Step 4: Remove Redux when all slices are migrated
```
