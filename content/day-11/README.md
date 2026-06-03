# Day 11 – React Internals + Sliding Window

## Overview
Deep dive into how React actually works under the hood — Virtual DOM, Fiber architecture, reconciliation, and React 18 concurrent features. Pair this with the sliding window technique for string problems.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | React Internals (Virtual DOM, Fiber, Reconciliation) |
| Hands-on | 30 min | Re-render debugging + optimization exercises |
| DSA | 15 min | Permutation in String (#567) |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problem
**LeetCode #567 – Permutation in String**
- Pattern: Sliding Window (fixed-size)
- Key insight: Character frequency matching with a window of size `s1.length`
- Time: O(26 * n) = O(n), Space: O(26) = O(1)

## Today's Goals
- [ ] Explain Virtual DOM and why it exists without saying "it's faster"
- [ ] Explain Fiber's scheduler and why it enabled Concurrent Mode
- [ ] Trace through reconciliation for a keyed list update
- [ ] Implement useTransition for a heavy UI update
- [ ] Solve #567 sliding window in under 15 min

## Key Concepts to Nail
- The difference between **render phase** and **commit phase** — interviewers love this
- Why `key` prop matters beyond "just for lists" — it's the identity signal to the reconciler
- Automatic batching in React 18 catches even setTimeout/Promise updates
- `startTransition` marks updates as non-urgent — it does NOT debounce

## Interview Tip
When asked "what is the Virtual DOM," most candidates say "it's a copy of the DOM that's faster." That's incomplete. The real answer: it's a lightweight JS object tree that enables diffing, batching, and platform-agnostic rendering (React Native, server rendering). The speed comes from minimizing expensive DOM operations, not from the VDOM itself being fast.
