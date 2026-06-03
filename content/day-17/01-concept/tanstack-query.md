# TanStack Query (React Query) — Complete Guide

## Why TanStack Query Exists

Managing server state manually in React means re-implementing the same logic in every application:
- Loading/error/success states for every fetch
- Deduplicating identical requests made simultaneously
- Showing cached data while refetching in the background
- Invalidating cache when you mutate data
- Refetching when the user focuses the window or reconnects
- Pagination and infinite scroll

TanStack Query solves all of this. The mental model: your server data is a cache — not "state you own" — and TanStack Query manages that cache for you.

---

## Setup

```jsx
// main.jsx or App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — data stays fresh for 5 min
      gcTime: 1000 * 60 * 10,   // 10 minutes — unused data stays in memory for 10 min
      retry: 2,                   // retry failed queries twice
      refetchOnWindowFocus: true, // refetch when user returns to tab
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## useQuery: Keys, Fetcher, and Lifecycle

```jsx
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const {
    data: user,
    isLoading,      // true only on first load (no cached data)
    isFetching,     // true on any fetch (including background refetch)
    isError,
    error,
    isSuccess,
    isPending,      // v5: replaces isLoading
    refetch,        // manually trigger refetch
    dataUpdatedAt,  // timestamp of last successful fetch
  } = useQuery({
    queryKey: ['users', userId],  // array — serialized for cache lookup
    queryFn: () => api.getUser(userId),
    enabled: !!userId,            // don't run if userId is falsy
    staleTime: 1000 * 60 * 2,    // override default — fresh for 2 minutes
    select: (data) => ({          // transform data before returning to component
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
    }),
    placeholderData: previousData => previousData, // show previous while refetching
  });

  if (isLoading) return <Skeleton />;
  if (isError) return <Error message={error.message} onRetry={refetch} />;

  return (
    <div>
      <h1>{user.fullName}</h1>
      {isFetching && <small>Refreshing...</small>} {/* show background refetch */}
    </div>
  );
}
```

### Query Key Design

Query keys are the heart of TanStack Query's cache. They must uniquely identify the data:

```js
// Simple key
useQuery({ queryKey: ['todos'] })

// Key with variable — invalidate/refetch specific user
useQuery({ queryKey: ['users', userId] })

// Key with filters — different cache entry per filter combination
useQuery({ queryKey: ['users', { status: 'active', page: 2 }] })

// Hierarchical keys for selective invalidation
queryClient.invalidateQueries({ queryKey: ['users'] }); // invalidates ALL user queries
queryClient.invalidateQueries({ queryKey: ['users', 5] }); // invalidates only user 5
```

---

## useMutation: Server Write Operations

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateUserForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newUser) => api.createUser(newUser),

    onSuccess: (createdUser) => {
      // Option 1: Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Option 2: Update cache directly (no refetch)
      queryClient.setQueryData(['users', createdUser.id], createdUser);

      // Show success toast
      toast.success('User created!');
    },

    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },

    onSettled: () => {
      // Runs after both success and error — good for cleanup
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate({ name: e.target.name.value, email: e.target.email.value });
    }}>
      <input name="name" />
      <input name="email" type="email" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      {mutation.isError && <p>{mutation.error.message}</p>}
    </form>
  );
}
```

---

## Optimistic Updates

Show the result immediately, revert if the request fails:

```jsx
function TodoList() {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => api.updateTodo(id, { completed }),

    onMutate: async ({ id, completed }) => {
      // 1. Cancel any outgoing refetches (prevent overwriting optimistic update)
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // 2. Snapshot current state for rollback
      const previousTodos = queryClient.getQueryData(['todos']);

      // 3. Apply optimistic update
      queryClient.setQueryData(['todos'], (old) =>
        old.map(todo => todo.id === id ? { ...todo, completed } : todo)
      );

      // 4. Return context for potential rollback
      return { previousTodos };
    },

    onError: (err, variables, context) => {
      // 5. Rollback to snapshot if error
      queryClient.setQueryData(['todos'], context.previousTodos);
      toast.error('Update failed. Changes reverted.');
    },

    onSettled: () => {
      // 6. Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

---

## Infinite Queries for Pagination/Infinite Scroll

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function PostFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['posts', 'feed'],
    queryFn: ({ pageParam = 1 }) => api.getPosts({ page: pageParam, limit: 10 }),

    // How to get the next page's param from the last page's response
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? lastPage.nextPage : undefined;
    },

    // Cursor-based pagination variant:
    // getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });

  // data.pages is an array of pages; flatten to get all items
  const posts = data?.pages.flatMap(page => page.items) ?? [];

  // Intersection observer to trigger next page
  const { ref: sentinelRef } = useIntersectionObserver({
    onChange: (isVisible) => {
      if (isVisible && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  return (
    <>
      {posts.map(post => <PostCard key={post.id} post={post} />)}
      <div ref={sentinelRef}>
        {isFetchingNextPage ? <Spinner /> : hasNextPage ? 'Load more...' : 'No more posts'}
      </div>
    </>
  );
}
```

---

## Query Invalidation and Refetch Strategies

```jsx
const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['users', userId] });

// Invalidate all queries matching a prefix
queryClient.invalidateQueries({ queryKey: ['users'] }); // invalidates ['users'], ['users', 5], ['users', {filter}], etc.

// Refetch immediately (don't just mark stale)
queryClient.refetchQueries({ queryKey: ['users'] });

// Remove query from cache completely
queryClient.removeQueries({ queryKey: ['users', oldUserId] });

// Set data manually (avoid refetch for simple mutations)
queryClient.setQueryData(['users', userId], updatedUser);

// Update with a function (for list updates)
queryClient.setQueryData(['users'], (old) => [...old, newUser]);
```

---

## Prefetching

```jsx
// Prefetch on hover (router link pre-warming)
function UserLink({ userId }) {
  const queryClient = useQueryClient();

  function handleMouseEnter() {
    queryClient.prefetchQuery({
      queryKey: ['users', userId],
      queryFn: () => api.getUser(userId),
      staleTime: 1000 * 60, // only prefetch if data is stale
    });
  }

  return <Link to={`/users/${userId}`} onMouseEnter={handleMouseEnter}>View User</Link>;
}

// Prefetch in route loader (before component mounts)
async function dashboardLoader({ params }) {
  await queryClient.prefetchQuery({
    queryKey: ['dashboard', params.userId],
    queryFn: () => api.getDashboard(params.userId),
  });
  return {}; // Loader return value (can be empty — data is in query cache)
}
```

---

## Parallel and Dependent Queries

```jsx
// Parallel: run both simultaneously
function Dashboard({ userId }) {
  const userQuery = useQuery({ queryKey: ['users', userId], queryFn: ... });
  const postsQuery = useQuery({ queryKey: ['posts', userId], queryFn: ... });
  // Both start at the same time
}

// Parallel with useQueries (dynamic number of queries)
const results = useQueries({
  queries: userIds.map(id => ({
    queryKey: ['users', id],
    queryFn: () => api.getUser(id),
  })),
});

// Dependent: only run second when first succeeds
function UserPosts({ username }) {
  const userQuery = useQuery({
    queryKey: ['users', username],
    queryFn: () => api.getUserByUsername(username),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', userQuery.data?.id],
    queryFn: () => api.getUserPosts(userQuery.data.id),
    enabled: !!userQuery.data?.id, // only runs when userId is available
  });
}
```

---

## Background Refetching and Stale-While-Revalidate

TanStack Query implements the stale-while-revalidate (SWR) pattern:

1. Query is made — data is fetched and stored with `staleTime` countdown
2. Second component mounts using same query key — **served from cache instantly**
3. If data is stale: **show cached data immediately** while fetching fresh data in background
4. When fresh data arrives: update the UI

```
User navigates away → navigates back → query is stale
→ Cached data shown instantly (no flash) → background refetch → update if data changed
```

This is why TanStack Query creates such smooth UX — users never see spinners for data they've seen before.

**staleTime**: How long data is considered fresh (default: 0 — immediately stale)
**gcTime** (was cacheTime in v4): How long inactive data stays in memory after all consumers unmount (default: 5 minutes)
