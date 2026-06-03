# Day 01 – JS Engine & Execution Context + Arrays

## Time Breakdown

| Block | Duration | Topic |
|-------|----------|-------|
| Concept | 40 min | JS Engine internals, Execution Context, Hoisting, TDZ |
| Hands-On | 30 min | 5 practical exercises on hoisting & execution order |
| DSA | 15 min | Two Sum (#1) + Best Time to Buy/Sell Stock (#121) |
| Interview Q Review | 5 min | Review 8 Q&As, say answers out loud |

---

## Learning Objectives

1. Explain precisely what happens when the V8 engine runs a JavaScript file — parsing, compilation, execution phases
2. Distinguish Global Execution Context from Function Execution Context and articulate what each contains
3. Trace the call stack for any given code snippet, predicting push/pop order
4. Explain hoisting behavior for `var`, `let`, `const`, and function declarations — including TDZ mechanics
5. Predict output of any hoisting-related code in a live coding interview without hesitation

---

## Today's DSA

### Problem 1: Two Sum (LeetCode #1)
- **Pattern:** HashMap / Complement lookup
- **Target complexity:** O(n) time, O(n) space
- **File:** `03-dsa/two-sum.js`

### Problem 2: Best Time to Buy and Sell Stock (LeetCode #121)
- **Pattern:** Single-pass greedy / sliding min
- **Target complexity:** O(n) time, O(1) space
- **Note:** Covered as follow-up inside the DSA file

---

## 5 Quick-Fire Interview Questions

1. What is the difference between the compilation phase and execution phase in V8?
2. When does the JS engine create a new execution context?
3. What is hoisted — the declaration or the initialization?
4. What error do you get when you access a `let` variable before its declaration line?
5. Why does `typeof undeclaredVar` return `"undefined"` instead of throwing a ReferenceError?

---

## Files in This Folder

```
day-01/
├── README.md                           ← You are here
├── 01-concept/
│   └── execution-context.md            ← Deep-dive notes (40 min)
├── 02-hands-on/
│   └── exercises.js                    ← 5 practical exercises (30 min)
├── 03-dsa/
│   └── two-sum.js                      ← Two Sum + Stock problem (15 min)
└── 04-interview-prep/
    └── js-engine-questions.md          ← 8 Q&As (5 min review)
```

---

## Success Criteria Checklist

- [ ] Can explain execution context without referencing notes
- [ ] Correctly predicted output of all 5 exercises before running them
- [ ] Solved Two Sum in O(n) using HashMap approach
- [ ] Articulated the TDZ clearly in own words
- [ ] Answered all 8 interview questions confidently (timed: 30 sec each)
- [ ] Knows the difference between `undefined` (declared, not assigned) and `not defined` (never declared)
