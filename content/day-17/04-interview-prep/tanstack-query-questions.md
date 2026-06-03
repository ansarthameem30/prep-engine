# TanStack Query – Interview Q&A

## Q1: What problem does TanStack Query solve, and why is storing server data in Redux suboptimal?

**Answer:**
Server data has fundamentally different characteristics from client state: it can be stale, it can be loading, it can fail, it can be updated by other users without your knowledge, and it needs to be refetched periodically. Managing these characteristics in Redux requires implementing caching, staleness, background refetch, and cache invalidation from scratch for every data type.

TanStack Query treats server data as a cache — you describe what data you want and how to fetch it, and TQ handles:
- Deduplication of simultaneous identical requests
- Caching with configurable staleness and garbage collection
- Background refetching (stale-while-revalidate pattern)
- Cache invalidation after mutations
- Loading/error/success states
- Retry with exponential backoff
- Window focus and network reconnect refetching

Redux is designed for *synchronous, client-owned* state. Fitting server data into Redux means fighting against these differences rather than working with them.

---

## Q2: Explain the difference between `isLoading` and `isFetching`.

**Answer:**
- **`isLoading`** (v4) / **`isPending`** (v5): True only on the **initial load** when there is no cached data for this query key. The component has never seen this data before.

- **`isFetching`**: True whenever a request is in-flight — including the initial load AND background refetches when cached data is stale.

```
Scenario:              isLoading  isFetching
─────────────────────────────────────────────
First load (no cache):   true       true
Background refetch:      false      true
Data served from cache:  false      false
```

Practical use:
- Show a full skeleton/spinner on `isPending` (no data to show)
- Show a subtle "Syncing..." indicator on `isFetching && !isPending` (stale data visible while refreshing)

---

## Q3: How does the query key design affect cache behavior?

**Answer:**
Query keys are serialized arrays used as cache keys. The design determines what data shares a cache entry and what can be selectively invalidated.

```js
// All of these are DIFFERENT cache entries:
useQuery({ queryKey: ['users'] })
useQuery({ queryKey: ['users', 5] })
useQuery({ queryKey: ['users', { status: 'active' }] })
useQuery({ queryKey: ['users', { status: 'active', page: 2 }] })

// Invalidation is hierarchical — prefix matching:
queryClient.invalidateQueries({ queryKey: ['users'] });
// Invalidates ALL of the above — any key starting with 'users'

queryClient.invalidateQueries({ queryKey: ['users', 5] });
// Only invalidates ['users', 5]
```

Best practices:
- Start with the entity type: `['users', ...]`
- Add identifiers: `['users', userId]`
- Add filters/pagination as objects: `['users', { filter, page }]`
- Objects in keys are compared structurally, not by reference — `{a: 1}` equals `{a: 1}`

---

## Q4: Walk through the optimistic update pattern with rollback.

**Answer:**
Five steps:

1. **Cancel outgoing queries**: Prevent a completing background refetch from overwriting our optimistic update
2. **Snapshot current cache**: Save it so we can roll back on error
3. **Apply optimistic update**: Immediately update the cache to reflect the expected result
4. **Return snapshot in context**: `onMutate` returns the context passed to `onError`/`onSettled`
5. **Rollback on error OR invalidate on settle**: Revert the optimistic update if the request fails; always resync with server on settle

```js
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] }); // step 1
    const prev = queryClient.getQueryData(['todos']); // step 2
    queryClient.setQueryData(['todos'], old => ...); // step 3
    return { prev }; // step 4
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['todos'], context.prev); // rollback
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] }); // always sync
  },
});
```

The `onSettled` invalidation ensures that even on success, the data is eventually synced with the server — the optimistic update might not perfectly match what the server returns.

---

## Q5: What is `staleTime` vs `gcTime` (cacheTime)?

**Answer:**

**`staleTime`**: Duration (ms) that data is considered "fresh." During this window, repeated queries for the same key are served from cache instantly with no network request.
- Default: 0 (data is stale immediately after being fetched)
- For rarely-changing data: `Infinity` or a long duration like `1000 * 60 * 60` (1 hour)

**`gcTime`** (called `cacheTime` in v4): Duration (ms) that *inactive* query data stays in the cache before being garbage collected. "Inactive" means no component is currently subscribed to that query.
- Default: `1000 * 60 * 5` (5 minutes)
- When a component unmounts, its query becomes inactive. If no other component uses the same key within gcTime, the data is removed.

```
staleTime expired → data is stale but still in cache
gcTime expired → data is removed from cache entirely

Timeline for staleTime=2min, gcTime=5min:
0:00 → fetch, data fresh
2:00 → data stale (will refetch when component remounts or window focuses)
Component unmounts at 3:00 → inactive
8:00 → data removed from cache (3:00 + gcTime)
```

---

## Q6: How do you implement infinite scroll with useInfiniteQuery?

**Answer:**
Three key pieces:
1. `queryFn` receives `{ pageParam }` — use it to fetch the specific page
2. `getNextPageParam` determines what `pageParam` to use for the next page — return `undefined` when there are no more pages
3. `fetchNextPage()` triggers the next page load; `hasNextPage` tells you if there's more

```js
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam = 1 }) =>
    api.getPosts({ page: pageParam, limit: 10 }),
  getNextPageParam: (lastPage, allPages) => {
    // Return next page number if there are more items
    return lastPage.items.length === 10 ? allPages.length + 1 : undefined;
  },
  initialPageParam: 1,
});

const items = data?.pages.flatMap(page => page.items) ?? [];
```

For cursor-based pagination (more common in modern APIs):
```js
getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
queryFn: ({ pageParam }) => api.getPosts({ cursor: pageParam, limit: 10 }),
```

Trigger next page with IntersectionObserver on a sentinel element at the bottom of the list.

---

## Q7: How do you handle query invalidation across related entities?

**Answer:**
After mutating data, you need to invalidate any queries that might be affected. TanStack Query's prefix-based invalidation makes this powerful:

```js
// After updating a user:
queryClient.invalidateQueries({ queryKey: ['users'] });
// Invalidates: ['users'], ['users', 5], ['users', {filter: 'active'}]

// After a mutation that affects multiple entity types:
const onSuccess = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    queryClient.invalidateQueries({ queryKey: ['users', userId] }),
  ]);
};
```

For complex apps, create helper functions for related invalidations:
```js
function invalidateUserData(userId) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['users', userId] }),
    queryClient.invalidateQueries({ queryKey: ['orders', { userId }] }),
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  ]);
}
```

---

## Q8: How does TanStack Query handle request deduplication?

**Answer:**
If multiple components call `useQuery` with the same key simultaneously, TanStack Query sends only **one** network request and shares the result with all subscribers.

```jsx
// Three components mount at the same time, all calling useQuery(['user', 1])
// TanStack Query: ONE network request, three components updated simultaneously

function Header() {
  const { data } = useQuery({ queryKey: ['user', 1], queryFn: fetchUser });
}
function Sidebar() {
  const { data } = useQuery({ queryKey: ['user', 1], queryFn: fetchUser });
}
function Profile() {
  const { data } = useQuery({ queryKey: ['user', 1], queryFn: fetchUser });
}
```

This is called **request coalescing**. Without it, you'd need to carefully coordinate which component "owns" the data fetching and passes it down — TQ makes this a non-problem.

Similarly, if a query refetches in the background (stale data), all subscribers are updated simultaneously when the new data arrives. No component is left showing stale data while another shows fresh data.
