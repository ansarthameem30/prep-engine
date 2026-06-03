# Day 05 – Event Loop & Microtasks + HashMap

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Event loop internals, microtask vs macrotask queue, output prediction |
| Hands-On | 30 min | 5 output prediction exercises (critical interview skill) |
| DSA | 15 min | Group Anagrams (#49) with HashMap pattern |
| Interview Q Review | 5 min | 8 event loop Q&As out loud |

---

## Learning Objectives

1. Describe the JavaScript runtime components: heap, call stack, Web APIs, callback queue, microtask queue
2. Explain the event loop algorithm in precise steps — what it checks and in what order
3. Predict output of any `Promise.then` / `setTimeout` interleaving scenario
4. Explain why microtasks always run before the next macrotask
5. Describe Node.js-specific additions: `process.nextTick`, `setImmediate`, and their priorities

---

## Today's DSA

### Problem: Group Anagrams (LeetCode #49)
- **Pattern:** HashMap with sorted-string keys (or character frequency keys)
- **Target complexity:** O(n * k log k) time where k = max string length
- **File:** `03-dsa/hashmap-patterns.js`

---

## 5 Quick-Fire Interview Questions

1. What is the microtask queue? What goes into it?
2. Does `Promise.then` run before or after `setTimeout(fn, 0)`?
3. What is `process.nextTick` and why does it have higher priority than Promise microtasks?
4. Can the event loop ever be blocked? How?
5. Why does a long synchronous computation block UI rendering in the browser?

---

## Files in This Folder

```
day-05/
├── README.md
├── 01-concept/
│   └── event-loop.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── hashmap-patterns.js
└── 04-interview-prep/
    └── event-loop-questions.md
```

---

## Success Criteria Checklist

- [ ] Drew the event loop diagram from memory (call stack, Web APIs, queues)
- [ ] Correctly predicted output of all 5 exercises before running
- [ ] Explained microtask vs macrotask priority with a concrete example
- [ ] Solved Group Anagrams in optimal time
- [ ] Answered all 8 interview Q&As with confidence
- [ ] Can explain why `process.nextTick` fires before Promise microtasks in Node.js
