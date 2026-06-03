/**
 * Day 15 Hands-On: Redux Toolkit vs Zustand — Side by Side
 *
 * Install dependencies to run:
 * npm install @reduxjs/toolkit react-redux zustand
 *
 * This file shows both approaches solving the same problem:
 * A counter + todo list with async operations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PART A: REDUX TOOLKIT IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import React, { useEffect, useState } from 'react';

// ── RTK: Todos Slice ─────────────────────────────────────────────────────────

const fetchTodosThunk = createAsyncThunk(
  'todos/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
      if (!res.ok) throw new Error('Network error');
      return res.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const todosSliceRTK = createSlice({
  name: 'todos',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    filter: 'all', // 'all' | 'active' | 'completed'
  },
  reducers: {
    todoAdded(state, action) {
      state.items.push({
        id: Date.now(),
        title: action.payload,
        completed: false,
      });
    },
    todoToggled(state, action) {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.completed = !todo.completed;
    },
    todoRemoved(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    filterChanged(state, action) {
      state.filter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodosThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTodosThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTodosThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// ── RTK: Counter Slice ───────────────────────────────────────────────────────

const counterSliceRTK = createSlice({
  name: 'counter',
  initialState: { value: 0, step: 1 },
  reducers: {
    incremented(state) { state.value += state.step; },
    decremented(state) { state.value -= state.step; },
    reset(state) { state.value = 0; },
    stepChanged(state, action) { state.step = action.payload; },
  },
});

// ── RTK: Store Setup ─────────────────────────────────────────────────────────

const reduxStore = configureStore({
  reducer: {
    todos: todosSliceRTK.reducer,
    counter: counterSliceRTK.reducer,
  },
});

// Memoized selectors
const selectFilteredTodos = (state) => {
  const { items, filter } = state.todos;
  if (filter === 'active') return items.filter((t) => !t.completed);
  if (filter === 'completed') return items.filter((t) => t.completed);
  return items;
};

// ── RTK: React Components ────────────────────────────────────────────────────

const { todoAdded, todoToggled, todoRemoved, filterChanged } = todosSliceRTK.actions;
const { incremented, decremented, reset, stepChanged } = counterSliceRTK.actions;

function RTKCounter() {
  const { value, step } = useSelector((s) => s.counter);
  const dispatch = useDispatch();

  return (
    <div style={{ marginBottom: 16 }}>
      <strong>RTK Counter:</strong> {value}
      <button onClick={() => dispatch(decremented())}>-</button>
      <button onClick={() => dispatch(incremented())}>+</button>
      <button onClick={() => dispatch(reset())}>Reset</button>
      <label>
        Step:
        <input
          type="number"
          value={step}
          min={1}
          onChange={(e) => dispatch(stepChanged(Number(e.target.value)))}
          style={{ width: 40, marginLeft: 4 }}
        />
      </label>
    </div>
  );
}

function RTKTodoList() {
  const dispatch = useDispatch();
  const todos = useSelector(selectFilteredTodos);
  const status = useSelector((s) => s.todos.status);
  const filter = useSelector((s) => s.todos.filter);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    dispatch(fetchTodosThunk());
  }, [dispatch]);

  function handleAdd(e) {
    e.preventDefault();
    if (!newTodo.trim()) return;
    dispatch(todoAdded(newTodo.trim()));
    setNewTodo('');
  }

  return (
    <div>
      <strong>RTK Todos ({status}):</strong>
      <form onSubmit={handleAdd}>
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add todo..."
        />
        <button type="submit">Add</button>
      </form>
      <div>
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => dispatch(filterChanged(f))}
            style={{ fontWeight: filter === f ? 'bold' : 'normal', marginRight: 4 }}
          >
            {f}
          </button>
        ))}
      </div>
      {status === 'loading' && <p>Loading...</p>}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} style={{ listStyle: 'none', display: 'flex', gap: 8 }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => dispatch(todoToggled(todo.id))}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => dispatch(todoRemoved(todo.id))}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RTKApp() {
  return (
    <Provider store={reduxStore}>
      <div style={{ border: '2px solid #7986cb', padding: 16, borderRadius: 8 }}>
        <h3>Redux Toolkit Implementation</h3>
        <RTKCounter />
        <RTKTodoList />
      </div>
    </Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PART B: ZUSTAND IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        // Counter slice
        counter: { value: 0, step: 1 },
        increment: () =>
          set((s) => ({ counter: { ...s.counter, value: s.counter.value + s.counter.step } })),
        decrement: () =>
          set((s) => ({ counter: { ...s.counter, value: s.counter.value - s.counter.step } })),
        resetCounter: () => set((s) => ({ counter: { ...s.counter, value: 0 } })),
        setStep: (step) => set((s) => ({ counter: { ...s.counter, step } })),

        // Todos slice
        todos: [],
        todoFilter: 'all',
        todosStatus: 'idle',

        fetchTodos: async () => {
          set({ todosStatus: 'loading' });
          try {
            const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
            const data = await res.json();
            set({ todos: data, todosStatus: 'succeeded' });
          } catch {
            set({ todosStatus: 'failed' });
          }
        },

        addTodo: (title) =>
          set((s) => ({
            todos: [...s.todos, { id: Date.now(), title, completed: false }],
          })),

        toggleTodo: (id) =>
          set((s) => ({
            todos: s.todos.map((t) =>
              t.id === id ? { ...t, completed: !t.completed } : t
            ),
          })),

        removeTodo: (id) =>
          set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

        setTodoFilter: (filter) => set({ todoFilter: filter }),
      }),
      {
        name: 'day15-store',
        partialize: (s) => ({ counter: s.counter, todoFilter: s.todoFilter }),
      }
    ),
    { name: 'Day15Store' }
  )
);

// Selectors — granular to prevent unnecessary re-renders
const useCounter = () => useAppStore((s) => s.counter);
const useCounterActions = () =>
  useAppStore((s) => ({ increment: s.increment, decrement: s.decrement, reset: s.resetCounter, setStep: s.setStep }));

const useFilteredTodos = () =>
  useAppStore((s) => {
    if (s.todoFilter === 'active') return s.todos.filter((t) => !t.completed);
    if (s.todoFilter === 'completed') return s.todos.filter((t) => t.completed);
    return s.todos;
  });

function ZustandCounter() {
  const { value, step } = useCounter();
  const { increment, decrement, reset, setStep } = useCounterActions();

  return (
    <div style={{ marginBottom: 16 }}>
      <strong>Zustand Counter:</strong> {value}
      <button onClick={decrement}>-</button>
      <button onClick={increment}>+</button>
      <button onClick={reset}>Reset</button>
      <label>
        Step:
        <input
          type="number"
          value={step}
          min={1}
          onChange={(e) => setStep(Number(e.target.value))}
          style={{ width: 40, marginLeft: 4 }}
        />
      </label>
    </div>
  );
}

function ZustandTodoList() {
  const todos = useFilteredTodos();
  const status = useAppStore((s) => s.todosStatus);
  const filter = useAppStore((s) => s.todoFilter);
  const { fetchTodos, addTodo, toggleTodo, removeTodo, setTodoFilter } = useAppStore.getState();
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => { fetchTodos(); }, []);

  function handleAdd(e) {
    e.preventDefault();
    if (!newTodo.trim()) return;
    addTodo(newTodo.trim());
    setNewTodo('');
  }

  return (
    <div>
      <strong>Zustand Todos ({status}):</strong>
      <form onSubmit={handleAdd}>
        <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Add todo..." />
        <button type="submit">Add</button>
      </form>
      <div>
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setTodoFilter(f)}
            style={{ fontWeight: filter === f ? 'bold' : 'normal', marginRight: 4 }}
          >
            {f}
          </button>
        ))}
      </div>
      {status === 'loading' && <p>Loading...</p>}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} style={{ listStyle: 'none', display: 'flex', gap: 8 }}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.title}</span>
            <button onClick={() => removeTodo(todo.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZustandApp() {
  return (
    <div style={{ border: '2px solid #66bb6a', padding: 16, borderRadius: 8 }}>
      <h3>Zustand Implementation</h3>
      <ZustandCounter />
      <ZustandTodoList />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Show both side by side
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <h1>Day 15: State Management — RTK vs Zustand</h1>
      <p>Both solve the same problem. Notice the differences in setup, boilerplate, and API ergonomics.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <RTKApp />
        <ZustandApp />
      </div>
    </div>
  );
}
