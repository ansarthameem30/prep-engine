# Day 06 – ES6+ Advanced Features + HashMap

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Destructuring, spread/rest, optional chaining, generators, WeakMap, Proxy, Symbol |
| Hands-On | 30 min | 5 ES6+ exercises |
| DSA | 15 min | Top K Frequent Elements (#347) — bucket sort approach |
| Interview Q Review | 5 min | 8 ES6+ Q&As out loud |

---

## Learning Objectives

1. Use all forms of destructuring (array, object, nested, defaults, renaming, rest) fluently
2. Explain the difference between WeakMap and Map and articulate when WeakMap is the right choice
3. Implement a basic Proxy with get/set traps — understand the Reflect API
4. Use generators to implement lazy evaluation and custom iterables
5. Know at least 2 practical use cases for Symbol (property key collision avoidance, well-known symbols)

---

## Today's DSA

### Problem: Top K Frequent Elements (LeetCode #347)
- **Pattern:** Bucket sort / Min-heap
- **Target complexity:** O(n) time with bucket sort approach
- **File:** `03-dsa/heap-intro.js`

---

## 5 Quick-Fire Interview Questions

1. What is the difference between `?.` (optional chaining) and `||` for default values?
2. What is a generator function and what does `yield` do?
3. Why would you use WeakMap over Map for caching DOM element metadata?
4. What is the Reflect API and why does it exist alongside Proxy?
5. What does `Symbol.iterator` enable?

---

## Files in This Folder

```
day-06/
├── README.md
├── 01-concept/
│   └── es6-advanced.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── heap-intro.js
└── 04-interview-prep/
    └── es6-questions.md
```

---

## Success Criteria Checklist

- [ ] Wrote a custom iterable using Symbol.iterator from memory
- [ ] Implemented a Proxy-based observable object
- [ ] Explained WeakMap use case for DOM metadata caching
- [ ] Solved Top K Frequent Elements using bucket sort (O(n))
- [ ] Answered all 8 Q&As confidently
- [ ] Can explain optional chaining edge cases (`?.()`, `?.[]`, short-circuit)
