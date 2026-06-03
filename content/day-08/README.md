# Day 08 – Functional JS + Two Pointers

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Pure functions, immutability, HOFs, currying, composition, transducers |
| Hands-On | 30 min | 5 functional programming exercises |
| DSA | 15 min | Container With Most Water (#11) |
| Interview Q Review | 5 min | 8 functional JS Q&As out loud |

---

## Learning Objectives

1. Define pure function precisely and identify side effects in code
2. Implement `compose` and `pipe` from scratch, know when each is appropriate
3. Write a fully curried function and partially apply it
4. Understand why immutability matters in React and Redux contexts
5. Implement `map`, `filter`, `reduce` from scratch (the `Array.prototype` versions)

---

## Today's DSA

### Problem: Container With Most Water (LeetCode #11)
- **Pattern:** Two pointers — greedy move the shorter side
- **Target complexity:** O(n) time, O(1) space
- **Key insight:** Moving the pointer with the greater height can only decrease area
- **File:** `03-dsa/two-pointers-medium.js`

---

## 5 Quick-Fire Interview Questions

1. What is a pure function? Can `Math.random()` be inside one?
2. What is the difference between `compose` and `pipe`?
3. What does currying enable that normal functions don't?
4. Why does React encourage immutability for state updates?
5. What is a transducer? (Senior-level bonus)

---

## Files in This Folder

```
day-08/
├── README.md
├── 01-concept/
│   └── functional-js.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── two-pointers-medium.js
└── 04-interview-prep/
    └── functional-js-questions.md
```

---

## Success Criteria Checklist

- [ ] Implemented `compose` and `pipe` from scratch
- [ ] Built a curried function that works with partial application
- [ ] Implemented `reduce` from scratch and used it to implement `map` and `filter`
- [ ] Solved Container With Most Water with correct greedy reasoning
- [ ] Explained why mutation is problematic in React state in concrete terms
- [ ] Answered all 8 Q&As confidently
