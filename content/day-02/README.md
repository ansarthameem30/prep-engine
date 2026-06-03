# Day 02 – Closures & Scope Chain + Array Patterns

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Lexical scope, scope chain, closures internals, use cases |
| Hands-On | 30 min | 5 practical closure exercises |
| DSA | 15 min | Kadane's Algorithm (#53) + Move Zeroes (#283) |
| Interview Q Review | 5 min | Review 8 Q&As on closures out loud |

---

## Learning Objectives

1. Explain how the scope chain is built at function definition time (not call time)
2. Define a closure precisely: the combination of a function and its lexical environment
3. Implement data privacy, factory functions, memoization, and partial application using closures
4. Diagnose and fix the classic `var` + `setTimeout` closure trap (using 3 different approaches)
5. Explain the memory implications of closures and when they can cause memory leaks

---

## Today's DSA

### Problem 1: Maximum Subarray (LeetCode #53) — Kadane's Algorithm
- **Pattern:** Dynamic programming / greedy running sum
- **Target complexity:** O(n) time, O(1) space
- **File:** `03-dsa/kadane-algorithm.js`

### Problem 2: Move Zeroes (LeetCode #283)
- **Pattern:** Two pointers / in-place array manipulation
- **Target complexity:** O(n) time, O(1) space
- **Note:** Covered as extension in the DSA file

---

## 5 Quick-Fire Interview Questions

1. What is a closure? Give a one-sentence definition.
2. Does a closure capture values or references?
3. What is the module pattern and why does it use closures?
4. How can closures cause memory leaks?
5. What does `once()` (a function that runs only once) look like using closures?

---

## Files in This Folder

```
day-02/
├── README.md
├── 01-concept/
│   └── closures-scope.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── kadane-algorithm.js
└── 04-interview-prep/
    └── closure-questions.md
```

---

## Success Criteria Checklist

- [ ] Can define closure precisely without notes
- [ ] Fixed the setTimeout loop problem using all 3 approaches (let, IIFE, bind)
- [ ] Built a working memoize function from scratch
- [ ] Solved Kadane's algorithm with correct edge case handling (all negatives)
- [ ] Answered all 8 closure interview questions in under 60 seconds each
- [ ] Can explain why closures hold a reference to the variable, not a snapshot of its value
