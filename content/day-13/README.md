# Day 13 – Custom Hooks Patterns + Linked List

## Overview
Custom hooks are the primary reuse mechanism in modern React. Today you'll build production-quality custom hooks from scratch and implement the LRU Cache — one of the most common system design + DSA crossover problems.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | Custom hooks patterns (useDebounce, useFetch, useLocalStorage, etc.) |
| Hands-on | 30 min | Implement 4 custom hooks from scratch |
| DSA | 15 min | Merge Two Sorted Lists (#21) + LRU Cache (#146) |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problems
**LeetCode #21 – Merge Two Sorted Lists**
- Dummy node pattern to simplify head tracking
- Time: O(m+n), Space: O(1)

**LeetCode #146 – LRU Cache**
- Combination of HashMap + Doubly Linked List
- HashMap: O(1) key lookup → linked list node
- DLL: O(1) insert/delete from any position
- Both `get` and `put` must be O(1)

## Today's Goals
- [ ] Implement useDebounce from scratch (no library)
- [ ] Implement useFetch with AbortController for cleanup
- [ ] Implement useLocalStorage with SSR safety check
- [ ] Design a custom hook API from requirements
- [ ] Implement LRU Cache with O(1) get and put
- [ ] Explain why we need both HashMap and DLL for LRU

## Key Concepts to Nail
- A custom hook is just a function that calls other hooks — that's the only rule
- The name must start with `use` for lint rules and React's own rules to apply
- AbortController is essential for fetch cleanup to avoid state-setting on unmounted components
- LRU Cache is a design question disguised as a DSA problem — the HashMap+DLL insight is the key

## Interview Tip
For the LRU Cache, draw the data structure before coding. Show the interviewer: a HashMap where keys point to DLL nodes, with a head (most recent) and tail (least recent). The "recently used" update is just: remove from current position, insert at head. Most candidates try to use a sorted map or array — that's O(n). The HashMap+DLL is the O(1) insight.
