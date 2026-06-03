# Day 12 – Advanced Hooks Deep Dive + Linked List

## Overview
Master the advanced React hooks that separate junior from senior developers — useCallback, useMemo, useRef, useLayoutEffect, and the React 18 additions. Pair with foundational linked list problems.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | Advanced Hooks (useCallback, useMemo, useRef, useLayoutEffect) |
| Hands-on | 30 min | Fix re-renders, memoize computation, DOM focus, scroll |
| DSA | 15 min | Reverse Linked List (#206), Detect Cycle (#141) |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problems
**LeetCode #206 – Reverse Linked List**
- Iterative: O(n) time, O(1) space — three-pointer technique
- Recursive: O(n) time, O(n) stack space — good for conceptual clarity

**LeetCode #141 – Linked List Cycle**
- Floyd's Tortoise and Hare algorithm
- Fast pointer moves 2 steps, slow moves 1 — they meet iff cycle exists

## Today's Goals
- [ ] Explain the difference between useCallback and useMemo in one sentence each
- [ ] Identify when useCallback makes things WORSE (over-optimization)
- [ ] Implement useRef for a non-DOM use case (interval ID, previous value)
- [ ] Explain why useLayoutEffect exists and when NOT to use it
- [ ] Solve #206 both iteratively and recursively
- [ ] Detect cycle using Floyd's algorithm

## Key Concepts to Nail
- `useCallback(fn, deps)` = `useMemo(() => fn, deps)` — they're the same primitive
- useMemo is worthless if the consuming component re-renders anyway (no memo)
- useRef does NOT cause re-renders — it's a mutable box, not reactive
- useLayoutEffect blocks paint — use it only for DOM measurements/animations
- React 18's `useSyncExternalStore` is the correct way to subscribe to external stores

## Interview Tip
When asked "when would you use useMemo?", most candidates say "for expensive computations." The complete answer adds: only if (1) the computation is genuinely slow (>1ms), AND (2) the component re-renders frequently, AND (3) the memoized value is passed to a memo'd child or is a stable reference for another hook. Without all three, useMemo adds overhead without benefit.
