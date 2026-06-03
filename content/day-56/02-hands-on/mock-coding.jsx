/**
 * Day 56 — React Mock Coding Challenges
 * Note: This file contains JSX — run with a React/Babel setup or view as reference.
 */

import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';

// ─────────────────────────────────────────────────────────────
// 1. useInfiniteScroll Hook
// ─────────────────────────────────────────────────────────────
/**
 * Detects when the user scrolls near the bottom of a scrollable container
 * and calls a load function to fetch more data.
 * Uses IntersectionObserver for efficiency (no scroll event listeners).
 */
function useInfiniteScroll(loadMore, { threshold = 0.1, hasMore = true } = {}) {
  const sentinelRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          setIsLoading(true);
          try {
            await loadMore();
          } finally {
            setIsLoading(false);
          }
        }
      },
      { threshold }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isLoading, hasMore, threshold]);

  return { sentinelRef, isLoading };
}

// Usage example
function InfiniteList() {
  const [items, setItems] = useState(Array.from({ length: 20 }, (_, i) => i + 1));
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    await new Promise(r => setTimeout(r, 800)); // simulate API
    const nextPage = page + 1;
    if (nextPage > 5) { setHasMore(false); return; }
    const newItems = Array.from({ length: 20 }, (_, i) => page * 20 + i + 1);
    setItems(prev => [...prev, ...newItems]);
    setPage(nextPage);
  }, [page]);

  const { sentinelRef, isLoading } = useInfiniteScroll(loadMore, { hasMore });

  return (
    <div style={{ height: '400px', overflow: 'auto' }}>
      {items.map(item => <div key={item} style={{ padding: '8px' }}>Item {item}</div>)}
      <div ref={sentinelRef} style={{ height: '1px' }} />
      {isLoading && <div>Loading...</div>}
      {!hasMore && <div>End of list</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Toast Notification System (Compound Component)
// ─────────────────────────────────────────────────────────────
const ToastContext = React.createContext(null);

function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  let nextId = useRef(0);

  const toast = {
    success: (message, options = {}) => addToast({ message, type: 'success', ...options }),
    error:   (message, options = {}) => addToast({ message, type: 'error', ...options }),
    info:    (message, options = {}) => addToast({ message, type: 'info', ...options }),
  };

  function addToast({ message, type = 'info', duration = 3000 }) {
    const id = ++nextId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const colors = { success: '#4CAF50', error: '#f44336', info: '#2196F3' };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container — fixed position overlay */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(({ id, message, type }) => (
          <div
            key={id}
            style={{
              background: colors[type],
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              minWidth: '250px',
            }}
          >
            <span style={{ flex: 1 }}>{message}</span>
            <button onClick={() => dismiss(id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Order placed!')}>Success</button>
      <button onClick={() => toast.error('Payment failed')}>Error</button>
      <button onClick={() => toast.info('3 new messages')}>Info</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Searchable, Sortable, Paginated Data Table (compact)
// ─────────────────────────────────────────────────────────────
function DataTable({ data, columns, pageSize = 10 }) {
  const [query, setQuery]     = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(0);

  const filtered = data.filter(row =>
    columns.some(col => String(row[col.key]).toLowerCase().includes(query.toLowerCase()))
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      })
    : filtered;

  const pageCount = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  return (
    <div>
      <input
        placeholder="Search..."
        value={query}
        onChange={e => { setQuery(e.target.value); setPage(0); }}
        style={{ marginBottom: '8px', padding: '6px', width: '100%' }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((row, i) => (
            <tr key={i}>
              {columns.map(col => <td key={col.key} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
        <span>Page {page + 1} of {pageCount || 1}</span>
        <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Optimize a Component with 5 Performance Issues
// ─────────────────────────────────────────────────────────────

// --- BEFORE: 5 Performance Issues ---
/*
function SlowList({ items, onItemClick }) {
  // Issue 1: new object created on every render — breaks React.memo on children
  const styles = { color: 'red', padding: '8px' };

  // Issue 2: inline function creates new reference every render
  const handleClick = (id) => onItemClick(id);

  // Issue 3: heavy computation on every render, not memoized
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div>
      {items.map((item, index) => (
        // Issue 4: array index as key — breaks reconciliation on reorder/delete
        <div key={index} style={styles} onClick={() => handleClick(item.id)}>
          {item.name}
          {/* Issue 5: components not memoized — all re-render when parent does */}
          <ExpensiveItemDetails item={item} />
        </div>
      ))}
      <div>Total: ${total}</div>
    </div>
  );
}
*/

// --- AFTER: Fixed ---
const itemStyles = { color: 'red', padding: '8px' }; // Issue 1: moved outside component

const ExpensiveItemDetails = React.memo(({ item }) => {                // Issue 5: memoized
  return <span>{item.description}</span>;
});

const ListItem = React.memo(({ item, onClick }) => {                   // Issue 5: memoized
  return (
    <div style={itemStyles} onClick={() => onClick(item.id)}>          {/* styles from outside */}
      {item.name}
      <ExpensiveItemDetails item={item} />
    </div>
  );
});

function FastList({ items, onItemClick }) {
  const handleClick = useCallback((id) => onItemClick(id), [onItemClick]); // Issue 2: memoized
  const total = React.useMemo(                                             // Issue 3: memoized
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );

  return (
    <div>
      {items.map(item => (
        <ListItem key={item.id} item={item} onClick={handleClick} />    // Issue 4: stable key
      ))}
      <div>Total: ${total}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Drag and Drop Between Two Lists (no library)
// ─────────────────────────────────────────────────────────────
function DragDropLists() {
  const [lists, setLists] = useState({
    todo:  [{ id: '1', text: 'Task 1' }, { id: '2', text: 'Task 2' }, { id: '3', text: 'Task 3' }],
    done:  [{ id: '4', text: 'Task 4' }],
  });

  const dragItem = useRef(null); // { listId, itemId }

  const handleDragStart = (listId, itemId) => {
    dragItem.current = { listId, itemId };
  };

  const handleDrop = (targetListId) => {
    if (!dragItem.current) return;
    const { listId: sourceListId, itemId } = dragItem.current;
    if (sourceListId === targetListId) return;

    setLists(prev => {
      const item = prev[sourceListId].find(i => i.id === itemId);
      return {
        ...prev,
        [sourceListId]: prev[sourceListId].filter(i => i.id !== itemId),
        [targetListId]: [...prev[targetListId], item],
      };
    });

    dragItem.current = null;
  };

  const listStyle = (isOver) => ({
    minHeight: '200px', border: '2px dashed #ccc', padding: '8px', borderRadius: '4px',
    background: isOver ? '#f0f7ff' : '#fafafa', flex: 1,
  });

  const [overList, setOverList] = useState(null);

  const renderList = (listId, title) => (
    <div
      style={listStyle(overList === listId)}
      onDragOver={e => { e.preventDefault(); setOverList(listId); }}
      onDragLeave={() => setOverList(null)}
      onDrop={() => { handleDrop(listId); setOverList(null); }}
    >
      <h3>{title}</h3>
      {lists[listId].map(item => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(listId, item.id)}
          style={{ padding: '8px', marginBottom: '4px', background: '#fff', border: '1px solid #ddd', borderRadius: '3px', cursor: 'grab' }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
      {renderList('todo', 'To Do')}
      {renderList('done', 'Done')}
    </div>
  );
}

export { useInfiniteScroll, ToastProvider, useToast, DataTable, FastList, DragDropLists };
