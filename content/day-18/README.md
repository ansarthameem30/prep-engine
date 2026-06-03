# Day 18 – Testing React + Binary Search

## Overview
Testing is a senior-level differentiator. Master the testing philosophy, React Testing Library best practices, and MSW for API mocking. Binary search in a rotated array is a common FAANG problem.

## Time Blocks
| Block | Duration | Focus |
|-------|----------|-------|
| Concept | 40 min | Jest + RTL + MSW testing strategy |
| Hands-on | 30 min | Test suite with 5 test cases |
| DSA | 15 min | Search in Rotated Sorted Array (#33) |
| Interview Prep | 5 min | Review 8 Q&As |

## DSA Problem
**LeetCode #33 – Search in Rotated Sorted Array**
- Key insight: at least one half of the array is always sorted
- Determine which half is sorted, check if target is in it, search accordingly
- Time: O(log n), Space: O(1)
- Follow-up: #81 with duplicates (amortized O(n) in worst case)

## Today's Goals
- [ ] Explain the testing trophy and why unit tests alone aren't enough
- [ ] Write an RTL test that tests behavior, not implementation
- [ ] Set up MSW to intercept API calls in tests
- [ ] Test a component with loading, success, and error states
- [ ] Solve binary search in rotated array in under 10 minutes
- [ ] Explain the "find sorted half" insight clearly

## Key Concepts to Nail
- "Test behavior, not implementation" — find elements by role/text, not class names
- `userEvent` > `fireEvent` — userEvent simulates real browser events more accurately
- MSW intercepts at the network level — no mocking of fetch or axios needed
- `waitFor` is for async state updates; `findBy` queries build in the wait
- Coverage metrics lie — 100% coverage doesn't mean well-tested code

## Interview Tip
For the rotated array problem, the standard explanation is: "One half is always sorted. Use the midpoint to determine which half. If the target is in the sorted half, recurse there. Otherwise, recurse to the other half." Draw the two cases: mid in left sorted portion vs mid in right sorted portion.
