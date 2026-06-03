# Day 14 – React Performance Optimization + Binary Tree BFS

## Overview
Performance is a recurring senior interview topic. Master the full toolkit: code splitting, virtualization, bundle analysis, and profiling. Pair with BFS tree traversal — a pattern used in component tree analysis and rendering order.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | React performance optimization techniques |
| Hands-on | 30 min | Code examples for each optimization |
| DSA | 15 min | Binary Tree Level Order Traversal (#102) |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problem
**LeetCode #102 – Binary Tree Level Order Traversal**
- BFS using a queue (array or deque)
- Time: O(n), Space: O(n) for the output + O(w) for the queue (w = max width)
- Return format: `[[root], [level1...], [level2...]]`

## Today's Goals
- [ ] Explain the difference between React.lazy + Suspense and manual dynamic imports
- [ ] Set up webpack-bundle-analyzer and interpret the treemap
- [ ] Implement a virtualized list with react-window
- [ ] Use the React Profiler to find the slowest component
- [ ] Implement BFS level order traversal iteratively

## Key Concepts to Nail
- `React.lazy` only works with default exports and Suspense boundary
- Code splitting at the route level gives the best bang per unit of complexity
- `react-window` renders only visible items — 10,000 row list renders ~20 DOM nodes
- The React Profiler shows "why did this component render?" (requires Profiler API or DevTools)
- Context optimization: splitting contexts prevents unrelated consumers from re-rendering

## Interview Tip
Performance optimization questions often come with a scenario: "Our list of 50,000 items is slow." Walk through a decision tree: (1) Is it a render count issue? → React.memo + useCallback. (2) Is it a list rendering issue? → Virtualization. (3) Is it a bundle size issue? → Code splitting. (4) Is it network? → Caching, prefetching. Never jump to solutions — diagnose first with Profiler.
