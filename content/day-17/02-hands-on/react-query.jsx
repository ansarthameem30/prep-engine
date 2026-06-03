/**
 * Day 17 Hands-On: TanStack Query — Full CRUD with Optimistic Updates
 *
 * npm install @tanstack/react-query @tanstack/react-query-devtools
 *
 * Uses JSONPlaceholder as a mock API.
 */

import React, { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30 seconds fresh
      gcTime: 1000 * 60 * 5,      // 5 minutes in cache
      retry: 1,
      refetchOnWindowFocus: false, // disable for demo clarity
    },
  },
});

// API layer
const api = {
  getTodos: () =>
    fetch('https://jsonplaceholder.typicode.com/todos?_limit=10').then(r => r.json()),

  getTodo: (id) =>
    fetch(`https://jsonplaceholder.typicode.com/todos/${id}`).then(r => r.json()),

  createTodo: (todo) =>
    fetch('https://jsonplaceholder.typicode.com/todos', {
      method: 'POST',
      body: JSON.stringify(todo),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json()),

  updateTodo: (id, data) =>
    fetch(`https://jsonplaceholder.typicode.com/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json()),

  deleteTodo: (id) =>
    fetch(`https://jsonplaceholder.typicode.com/todos/${id}`, {
      method: 'DELETE',
    }).then(r => r.json()),
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1: useQuery — List with Loading/Error States
// ─────────────────────────────────────────────────────────────────────────────

function TodoList() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);

  const {
    data: todos,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['todos'],
    queryFn: api.getTodos,
    select: (data) => data.slice(0, 10), // transform: only show first 10
  });

  // Prefetch todo detail on hover
  function handleMouseEnter(id) {
    queryClient.prefetchQuery({
      queryKey: ['todos', id],
      queryFn: () => api.getTodo(id),
      staleTime: 1000 * 60,
    });
  }

  if (isLoading) {
    return <div>Loading todos...</div>;
  }

  if (isError) {
    return (
      <div>
        <p style={{ color: 'red' }}>Error: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h3>
        Todos List
        {isFetching && <small style={{ color: 'gray', marginLeft: 8 }}>Syncing...</small>}
      </h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            onMouseEnter={() => handleMouseEnter(todo.id)}
            onClick={() => setSelectedId(todo.id === selectedId ? null : todo.id)}
            style={{
              padding: 8,
              cursor: 'pointer',
              background: selectedId === todo.id ? '#e3f2fd' : 'transparent',
              display: 'flex',
              gap: 8,
            }}
          >
            <span>{todo.completed ? '✓' : '○'}</span>
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
          </li>
        ))}
      </ul>
      {selectedId && <TodoDetail id={selectedId} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: Dependent Query — Detail fetches after list selection
// ─────────────────────────────────────────────────────────────────────────────

function TodoDetail({ id }) {
  const { data: todo, isLoading, isFetching } = useQuery({
    queryKey: ['todos', id],
    queryFn: () => api.getTodo(id),
    enabled: !!id, // won't run if id is falsy
    // placeholderData: keepPreviousData — show old data while fetching new
    placeholderData: (previousData) => previousData,
  });

  if (isLoading) return <p>Loading detail...</p>;

  return (
    <div style={{ border: '1px solid #90caf9', padding: 12, marginTop: 8, borderRadius: 4 }}>
      <h4>Todo #{todo.id} {isFetching && '(refreshing)'}</h4>
      <p>{todo.title}</p>
      <p>Status: {todo.completed ? 'Completed' : 'Pending'}</p>
      <p>User: {todo.userId}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: useMutation with Optimistic Update
// ─────────────────────────────────────────────────────────────────────────────

function OptimisticTodoToggle() {
  const queryClient = useQueryClient();

  // Fetch local todos (we'll manage them in memory for this demo)
  const [localTodos, setLocalTodos] = useState([
    { id: 'a', title: 'Review PR #42', completed: false },
    { id: 'b', title: 'Update documentation', completed: false },
    { id: 'c', title: 'Deploy to staging', completed: true },
  ]);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      // Simulate API call with potential failure
      await new Promise(r => setTimeout(r, 800));
      if (Math.random() < 0.3) throw new Error('Network error (simulated)'); // 30% failure rate
      return { id, completed };
    },

    onMutate: async ({ id, completed }) => {
      // Snapshot for rollback
      const previousTodos = [...localTodos];

      // Optimistically update
      setLocalTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));

      return { previousTodos };
    },

    onError: (err, variables, context) => {
      // Rollback
      setLocalTodos(context.previousTodos);
      alert(`Failed: ${err.message}. Changes reverted.`);
    },

    onSuccess: () => {
      // In real app: queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      <h3>Optimistic Updates (30% simulated failure rate)</h3>
      <p>Toggle a todo — it updates immediately, rolls back on failure.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {localTodos.map((todo) => (
          <li
            key={todo.id}
            style={{ display: 'flex', gap: 8, padding: 8, alignItems: 'center' }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleMutation.mutate({ id: todo.id, completed: !todo.completed })}
              disabled={toggleMutation.isPending}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
          </li>
        ))}
      </ul>
      {toggleMutation.isPending && <p style={{ color: 'orange' }}>Saving...</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 4: Create + Delete with cache updates
// ─────────────────────────────────────────────────────────────────────────────

function TodoCRUD() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');

  const createMutation = useMutation({
    mutationFn: (title) => api.createTodo({ title, completed: false, userId: 1 }),
    onSuccess: (newTodo) => {
      // Add to cache directly (JSONPlaceholder always returns id=201 for new items)
      queryClient.setQueryData(['todos'], (old) => {
        if (!old) return [newTodo];
        return [{ ...newTodo, id: Date.now(), title: newTodo.title }, ...old];
      });
      setNewTitle('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTodo,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData(['todos']);
      queryClient.setQueryData(['todos'], (old) => old?.filter(t => t.id !== id) ?? []);
      return { previousTodos };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['todos'], context.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      <h3>CRUD Operations</h3>
      <form onSubmit={(e) => { e.preventDefault(); if (newTitle) createMutation.mutate(newTitle); }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New todo title..."
          style={{ padding: 8, width: 300 }}
        />
        <button type="submit" disabled={createMutation.isPending || !newTitle}>
          {createMutation.isPending ? 'Adding...' : 'Add Todo'}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 5: useInfiniteQuery — Infinite Scroll
// ─────────────────────────────────────────────────────────────────────────────

function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      fetch(`https://jsonplaceholder.typicode.com/posts?_page=${pageParam}&_limit=5`)
        .then(r => r.json())
        .then(posts => ({ posts, nextPage: posts.length === 5 ? pageParam + 1 : undefined })),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });

  const allPosts = data?.pages.flatMap(p => p.posts) ?? [];

  return (
    <div>
      <h3>Infinite Scroll Posts</h3>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {allPosts.map(post => (
              <li key={post.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <strong>{post.title}</strong>
              </li>
            ))}
          </ul>
          <button
            onClick={() => fetchNextPage()}
            disabled={!hasNextPage || isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading more...' : hasNextPage ? 'Load More' : 'No more posts'}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 700 }}>
        <h1>Day 17: TanStack Query</h1>
        <hr /><TodoCRUD />
        <hr /><TodoList />
        <hr /><OptimisticTodoToggle />
        <hr /><InfinitePostList />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
