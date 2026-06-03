# Day 17 – TanStack Query (React Query) + Graph

## Overview
TanStack Query is arguably the most impactful library in the React ecosystem for server state management. Master query invalidation, optimistic updates, and infinite scroll. Course Schedule brings topological sort — a critical graph algorithm.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | TanStack Query (queries, mutations, caching, infinite scroll) |
| Hands-on | 30 min | Full CRUD with optimistic updates |
| DSA | 15 min | Course Schedule (#207) — cycle detection + topological sort |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problems
**LeetCode #207 – Course Schedule**
- Detect cycle in a directed graph
- BFS (Kahn's Algorithm): topological sort using in-degree
- DFS: coloring approach (white/gray/black for unvisited/in-progress/done)
- Time: O(V + E), Space: O(V + E)

## Today's Goals
- [ ] Explain query keys and why they're an array, not a string
- [ ] Implement optimistic update with rollback on error
- [ ] Set up infinite scroll with useInfiniteQuery
- [ ] Explain staleTime vs cacheTime (gcTime in v5)
- [ ] Detect cycle in directed graph using DFS
- [ ] Implement topological sort with Kahn's algorithm

## Key Concepts to Nail
- Query keys are arrays — React Query serializes them for cache lookup
- Stale time: how long data is "fresh" before being considered stale (eligible for refetch)
- Cache time: how long inactive query data stays in memory before garbage collection
- Background refetch: stale data is shown while fresh data is fetched silently
- Invalidation: mark queries as stale to trigger refetch after mutations

## Interview Tip
For Course Schedule, clarify the problem to the interviewer: "I'm detecting if there's a cycle in the directed prerequisite graph. If there is, the courses can't all be completed." Then walk through the in-degree approach (Kahn's): add all nodes with in-degree 0 to the queue, process them, reduce neighbors' in-degree. If you process all nodes, no cycle. Clean and systematic.
