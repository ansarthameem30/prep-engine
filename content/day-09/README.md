# Day 09 – JS Performance Optimization + Sliding Window

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Debounce, throttle, memoization, memory leaks, profiling, Web Workers |
| Hands-On | 30 min | Implement debounce, throttle, and memoize from scratch |
| DSA | 15 min | Minimum Window Substring (#76) — hard sliding window |
| Interview Q Review | 5 min | 8 performance Q&As out loud |

---

## Learning Objectives

1. Implement debounce and throttle from scratch with correct `this` binding and leading/trailing options
2. Identify the 4 most common JavaScript memory leak patterns
3. Explain virtual scrolling at an architectural level
4. Describe what Chrome DevTools Performance tab shows and what to look for
5. Know when Web Workers are appropriate and their limitations

---

## Today's DSA

### Problem: Minimum Window Substring (LeetCode #76)
- **Pattern:** Sliding window with two frequency maps
- **Difficulty:** Hard
- **Target complexity:** O(n + m) time where n = len(s), m = len(t)
- **File:** `03-dsa/sliding-window-hard.js`

---

## 5 Quick-Fire Interview Questions

1. What is the difference between debounce and throttle? Give a use case for each.
2. Name 3 common causes of memory leaks in JavaScript.
3. How does virtual scrolling work and why does it improve performance?
4. What is `requestAnimationFrame` and when should you use it over `setTimeout`?
5. What can Web Workers NOT do that main-thread JS can?

---

## Files in This Folder

```
day-09/
├── README.md
├── 01-concept/
│   └── js-performance.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── sliding-window-hard.js
└── 04-interview-prep/
    └── performance-questions.md
```

---

## Success Criteria Checklist

- [ ] Implemented debounce with leading and trailing options
- [ ] Implemented throttle with correct execution on leading edge
- [ ] Named 4 memory leak patterns with concrete examples
- [ ] Solved Minimum Window Substring with the expand-contract window approach
- [ ] Explained virtual scrolling architecture without notes
- [ ] Answered all 8 performance Q&As confidently
