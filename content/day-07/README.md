# Day 07 – JS Design Patterns + Two Pointers

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Module, Singleton, Observer, Factory, Decorator, Strategy patterns |
| Hands-On | 30 min | Implement 4 design patterns from scratch |
| DSA | 15 min | 3Sum (#15) with two-pointer approach |
| Interview Q Review | 5 min | 8 design pattern Q&As out loud |

---

## Learning Objectives

1. Implement all 6 patterns from memory with real-world context (not toy examples)
2. Explain when each pattern solves a problem and what problem it solves
3. Identify which patterns are already in use in React (Observer, Strategy, Decorator) and Node.js (Module, Factory)
4. Solve 3Sum using the two-pointer technique after sorting — know the duplicate-skipping logic
5. Articulate trade-offs of each pattern (complexity vs. flexibility)

---

## Today's DSA

### Problem: 3Sum (LeetCode #15)
- **Pattern:** Sort + Two Pointers
- **Target complexity:** O(n²) time, O(1) extra space (sort in-place)
- **Key challenge:** Avoid duplicate triplets
- **File:** `03-dsa/two-pointers.js`

---

## 5 Quick-Fire Interview Questions

1. What problem does the Observer pattern solve? Name a React hook that uses it.
2. How does the Singleton pattern differ from a module export?
3. What is the Decorator pattern and how does it differ from inheritance?
4. When would you choose the Strategy pattern over a switch statement?
5. What is the difference between Factory and Abstract Factory?

---

## Files in This Folder

```
day-07/
├── README.md
├── 01-concept/
│   └── design-patterns.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── two-pointers.js
└── 04-interview-prep/
    └── design-pattern-questions.md
```

---

## Success Criteria Checklist

- [ ] Implemented Observer (EventEmitter) from scratch
- [ ] Implemented Strategy pattern with a real-world analogy
- [ ] 3Sum solved with duplicate-skipping logic without looking at notes
- [ ] Can explain how React's Context API uses the Observer pattern
- [ ] Answered all 8 Q&As with concrete examples (not just definitions)
