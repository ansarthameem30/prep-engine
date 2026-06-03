# Day 16 – React Router v6 + Graph Introduction

## Overview
React Router v6 introduced a paradigm shift in how routing works. Master the v6 API, protected routes, and data routing. Graphs underpin many real-world problems — Number of Islands is the gateway.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | React Router v6 (Outlet, loaders, actions, protected routes) |
| Hands-on | 30 min | Protected routes + nested routing setup |
| DSA | 15 min | Number of Islands (#200) — BFS and DFS |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problem
**LeetCode #200 – Number of Islands**
- DFS: recursively "sink" connected land cells
- BFS: queue-based flood fill
- Both: O(m*n) time, O(m*n) space
- Key: modify grid in-place to mark visited cells (or use separate visited set)

## Today's Goals
- [ ] Explain the key differences between React Router v5 and v6
- [ ] Implement a protected route component using v6 patterns
- [ ] Set up nested routes with Outlet
- [ ] Use a loader function (data routing pattern)
- [ ] Solve Number of Islands with both BFS and DFS

## Key Concepts to Nail
- v6 uses `<Routes>` (not `<Switch>`), `element` prop (not `component`)
- Nested routes: parent renders `<Outlet />` where children should appear
- `useNavigate` replaces `useHistory` — `navigate(-1)` goes back
- Route loaders run before the component renders — data is ready on mount
- `useSearchParams` is the v6 way to read/write URL query strings

## Interview Tip
When asked about protected routes, show the v6 idiomatic pattern: a `<ProtectedRoute>` component that renders `<Navigate to="/login" />` if unauthenticated, or `<Outlet />` if authenticated. This is cleaner than wrapping components in HOCs. Mentioning that loaders can also check auth and redirect before the component even loads shows senior-level knowledge.
