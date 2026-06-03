# Day 04 – Async JS Deep Dive + Strings

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Callbacks, Promises, Async/Await, error handling, parallel patterns |
| Hands-On | 30 min | 5 async exercises with real-world patterns |
| DSA | 15 min | Longest Substring Without Repeating Characters (#3) |
| Interview Q Review | 5 min | 8 async Q&As out loud |

---

## Learning Objectives

1. Explain Promise states and transitions — pending, fulfilled, rejected (and why they're irreversible)
2. Chain Promises correctly and explain what each `.then` returns
3. Use `Promise.all`, `Promise.race`, `Promise.allSettled`, and `Promise.any` — know when each is appropriate
4. Implement proper error handling with async/await using try/catch and unhandled rejection handlers
5. Identify and fix callback hell by converting to Promise chains or async/await

---

## Today's DSA

### Problem: Longest Substring Without Repeating Characters (LeetCode #3)
- **Pattern:** Sliding window with HashMap
- **Target complexity:** O(n) time, O(min(m,n)) space where m = charset size
- **File:** `03-dsa/sliding-window-intro.js`

---

## 5 Quick-Fire Interview Questions

1. What are the three states of a Promise? Can a Promise go from fulfilled back to pending?
2. What does `Promise.all` do if one promise rejects?
3. What is the difference between `async function` and a function that returns a Promise manually?
4. What happens if you `await` a non-Promise value?
5. How do you handle errors in `Promise.all` where some should be allowed to fail?

---

## Files in This Folder

```
day-04/
├── README.md
├── 01-concept/
│   └── async-javascript.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── sliding-window-intro.js
└── 04-interview-prep/
    └── async-questions.md
```

---

## Success Criteria Checklist

- [ ] Explained Promise states and transitions without notes
- [ ] Correctly identified when to use `.allSettled` vs `.all`
- [ ] Wrote proper async/await error handling with multiple failure modes
- [ ] Solved Longest Substring with optimal sliding window approach
- [ ] Converted a callback-based function to Promise-based in the exercises
- [ ] Answered all 8 interview questions confidently
