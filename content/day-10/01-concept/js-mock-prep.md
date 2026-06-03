# JavaScript Mock Interview Preparation Guide

## Top 20 JS Concepts — Self-Assessment Checklist

Rate yourself honestly: 0 = can't explain, 1 = shaky, 2 = solid, 3 = can teach it.

| # | Concept | Score (0-3) | Notes |
|---|---------|-------------|-------|
| 1 | V8 execution pipeline (parse → bytecode → JIT) | | |
| 2 | Global vs Function Execution Context | | |
| 3 | Call stack + what causes stack overflow | | |
| 4 | Variable Environment vs Lexical Environment | | |
| 5 | Hoisting: var vs let/const vs function declaration | | |
| 6 | Temporal Dead Zone — definition + proof it's hoisted | | |
| 7 | Closure: definition + what it captures (reference, not value) | | |
| 8 | Scope chain: lexical (definition-time), not dynamic | | |
| 9 | Prototype chain: property lookup, `__proto__` vs `prototype` | | |
| 10 | `this` binding: 4 rules in priority order | | |
| 11 | `new` keyword: 4 steps | | |
| 12 | Promise states + transitions (irreversible) | | |
| 13 | Promise combinators: all / race / allSettled / any | | |
| 14 | Async/await error patterns + sequential vs parallel mistake | | |
| 15 | Event loop: microtask vs macrotask, drain order | | |
| 16 | `process.nextTick` vs Promise.then priority | | |
| 17 | Debounce vs throttle: definition + implementation idea | | |
| 18 | Memory leak: 4 patterns | | |
| 19 | Pure functions + immutability + compose/pipe | | |
| 20 | WeakMap use case + Proxy/Reflect purpose | | |

**Score interpretation:**
- 50–60: Strong week — focus on edge cases
- 35–49: Good foundation — review flagged topics before Day 11
- Below 35: Revisit marked days before continuing to Week 2

---

## Common Trick Questions + Direct Answers

**Trick 1:** `typeof null === "object"` — Why?
> Historical bug in JS spec from 1995. null's type tag in V8 is 0, same as objects. It's intentionally kept for backward compatibility. Use `value === null` to check for null.

**Trick 2:** `0.1 + 0.2 !== 0.3` — Why?
> IEEE 754 floating-point representation. 0.1 and 0.2 have no exact binary representation; they're approximated. The sum is 0.30000000000000004. Fix: `Math.abs(a - b) < Number.EPSILON` for equality comparison.

**Trick 3:** `[] == ![]` is `true` — Explain.
> Abstract equality coercion: `![]` is `false`. So `[] == false`. Both sides coerce to numbers: `[]` → `""` → `0`, `false` → `0`. `0 == 0` → `true`. Use `===` always.

**Trick 4:** `typeof function(){}` is `"function"` not `"object"` — Why?
> Functions are objects in JS but the spec defines a special `[[Call]]` internal method. `typeof` special-cases callable objects to return `"function"`. Under the hood, functions inherit from `Function.prototype` which inherits from `Object.prototype`.

**Trick 5:** Why can you add properties to a function?
> Functions are objects. `function foo() {} foo.bar = 42;` — this works. The function object just has additional special behavior (it's callable). `Function.length` gives the number of declared parameters. `Function.name` gives the function's name.

**Trick 6:** `NaN === NaN` is `false` — How do you check for NaN?
> NaN is the only value not equal to itself (IEEE 754 spec). Use `Number.isNaN(value)` — not the legacy `isNaN()` which coerces: `isNaN("hello")` is `true`. `Number.isNaN("hello")` is `false`.

---

## Live Coding Tips for JS Interviews

### Before Writing Any Code
1. **Restate the problem** in your own words — confirms understanding and catches edge cases
2. **Clarify constraints** — input size, data types, can the array be empty? sorted?
3. **Walk through 2-3 examples** mentally or on paper/screen
4. **State your approach** before coding — "I'll use a HashMap to..."
5. **State the complexity target** — "I want O(n) time and O(1) space"

### While Coding
- Write clean, readable code — variable names matter (`complement` not `c`)
- Comment at the start of complex sections — "// Two pointers, move shorter side"
- Narrate your thought process — interviewers want to hear you think
- When stuck, don't freeze — say "I know the brute force is O(n²), let me think about optimizing"
- Handle edge cases explicitly (empty array, single element, all negatives)

### After Writing the First Version
- Walk through a test case by hand
- Check edge cases: empty input, single element, all same elements, negatives
- State time and space complexity with reasoning (not just "O(n)")
- Ask if you should optimize further or handle more cases

### How to Explain Your Thought Process

**For a DS problem:**
> "Looking at this problem — I need to find X. The brute force would be [describe]. But notice that [insight] — this lets us use [data structure/algorithm] to reduce it to [complexity]. The key insight is [one sentence]. Let me implement it..."

**For a concept question:**
> "Let me start with the definition: [definition]. The reason this matters is [why]. A concrete example is [code example]. One gotcha is [edge case or interview trap]."

---

## Weak Areas Identification Matrix

After completing the mock interview, categorize questions:
- ✅ Answered confidently and correctly
- ⚠️ Answered but hesitated or was partially wrong
- ❌ Couldn't answer or answered incorrectly

For each ❌ or ⚠️, write the specific sub-topic in your notes and schedule a review slot in Days 11-15 before moving to the next major topic (React internals).
