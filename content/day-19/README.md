# Day 19 – Advanced React Patterns + Recursion

## Overview
Advanced patterns separate mid-level from senior React developers. Compound Components, Portals, Error Boundaries, and headless UI design are all high-signal interview topics. Generate Parentheses is a classic backtracking problem.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | Compound Components, HOCs, Error Boundaries, Portals, Suspense |
| Hands-on | 30 min | Implement Tabs (Compound Component) + withAuth HOC |
| DSA | 15 min | Generate Parentheses (#22) — backtracking |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problem
**LeetCode #22 – Generate Parentheses**
- Backtracking: build the string character by character
- Constraints: open count ≤ n, close count ≤ open count
- Time: O(4^n / sqrt(n)) — Catalan number, Space: O(n) recursion depth
- This is the canonical backtracking template

## Today's Goals
- [ ] Implement a Tabs compound component using Context
- [ ] Explain why HOCs mostly gave way to hooks
- [ ] Use a Portal for a modal that renders outside the root
- [ ] Explain why Error Boundaries must be class components
- [ ] Implement Generate Parentheses with backtracking
- [ ] Identify the backtracking decision tree structure

## Key Concepts to Nail
- Compound Components use Context to share state between sibling components
- The key advantage: consumers use a compositional API, not a props API
- Error Boundaries can only be class components (no functional equivalent)
- Portals escape the CSS stacking context — critical for modals and tooltips
- Suspense for data fetching requires throwing a Promise (the "suspend" mechanism)

## Interview Tip
When asked about component design, demonstrate the compound component pattern for any stateful UI primitive (Tabs, Accordion, Select, Modal). Show both the internal Context usage and the public API. Then mention that Radix UI and Headless UI are production implementations of this exact pattern.
