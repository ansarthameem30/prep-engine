# Day 15 – State Management Mastery + BST

## Overview
State management is one of the most opinionated areas of React development and a common senior interview topic. Master Redux Toolkit, Zustand, and the decision framework for choosing between them. BST validation is a classic recursion problem with subtle gotchas.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | State management: Redux Toolkit, Zustand, Context, decision matrix |
| Hands-on | 30 min | RTK + Zustand side-by-side examples |
| DSA | 15 min | Validate BST (#98) + BST insert/delete |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problems
**LeetCode #98 – Validate Binary Search Tree**
- BST property: every node in left subtree < node, every node in right subtree > node
- Common mistake: only checking immediate children instead of the full range constraint
- Correct approach: pass min/max bounds through recursion

**BST Insert/Delete**
- Insert: O(h) time — traverse down to find the correct leaf position
- Delete: Three cases — leaf, one child, two children (in-order successor)

## Today's Goals
- [ ] Explain when to NOT use Redux (and not sound like you're anti-Redux)
- [ ] Create a Redux Toolkit slice with an async thunk
- [ ] Create a Zustand store with a selector and persist middleware
- [ ] Explain the difference between server state and client state
- [ ] Validate a BST with the bounds approach (not just parent comparison)
- [ ] Implement BST delete with the in-order successor case

## Key Concepts to Nail
- Redux Toolkit eliminated 90% of Redux boilerplate — interviewers who say "Redux is too verbose" are thinking of legacy Redux
- RTK Query is a full data-fetching/caching solution built on Redux — comparable to TanStack Query
- Zustand: one store, multiple slices via `slice pattern`, no Provider needed
- Server state (TanStack Query) vs client state (Zustand/Redux) is a critical distinction
- BST validation trap: `5 → 3 → 6` looks valid locally but fails the full range test

## Interview Tip
When asked "which state management library do you prefer?", don't just pick one. The strong answer: "It depends on the scale and team. For large teams with complex async flows and DevTools requirements, Redux Toolkit. For smaller apps that need global state without the ceremony, Zustand. For server-fetched data, neither — TanStack Query handles that better than both."
