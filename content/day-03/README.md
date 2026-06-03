# Day 03 – Prototypes, OOP & `this` + Strings

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | Prototype chain, `new` keyword, `this` binding rules, ES6 classes |
| Hands-On | 30 min | 5 exercises on `this` binding and prototype manipulation |
| DSA | 15 min | Valid Anagram (#242) + Palindrome Check (#125) |
| Interview Q Review | 5 min | Review 8 OOP Q&As out loud |

---

## Learning Objectives

1. Traverse any prototype chain mentally and predict what `Object.getPrototypeOf(x)` returns at each step
2. Explain the 4 `this` binding rules in priority order (new > explicit > implicit > default)
3. Describe exactly what the `new` keyword does in 4 steps
4. Distinguish `__proto__` (instance property) from `prototype` (constructor property)
5. Implement inheritance using both `Object.create` and `class extends`, knowing the internal difference

---

## Today's DSA

### Problem 1: Valid Anagram (LeetCode #242)
- **Pattern:** Character frequency count with HashMap
- **Target complexity:** O(n) time, O(1) space (26-letter alphabet → constant)
- **File:** `03-dsa/string-patterns.js`

### Problem 2: Valid Palindrome (LeetCode #125)
- **Pattern:** Two pointers, character filtering
- **Target complexity:** O(n) time, O(1) space
- **Note:** Also covered in Day 7 as two-pointer pattern review

---

## 5 Quick-Fire Interview Questions

1. What is the prototype chain? When does it end?
2. What are the 4 rules that determine `this` binding, in priority order?
3. What does the `new` keyword actually do?
4. How does `class` syntax differ from prototype-based syntax under the hood?
5. Why does `this` inside an arrow function refer to the enclosing lexical scope?

---

## Files in This Folder

```
day-03/
├── README.md
├── 01-concept/
│   └── prototypes-oop.md
├── 02-hands-on/
│   └── exercises.js
├── 03-dsa/
│   └── string-patterns.js
└── 04-interview-prep/
    └── oop-questions.md
```

---

## Success Criteria Checklist

- [ ] Drew the prototype chain for a class instance on paper without help
- [ ] Correctly predicted `this` value in all 5 exercises
- [ ] Explained all 4 steps of `new` from memory
- [ ] Solved Valid Anagram in O(n) time and O(1) space
- [ ] Explained the difference between `__proto__` and `prototype` without hesitation
- [ ] Answered all 8 interview questions confidently
