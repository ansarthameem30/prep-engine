# JavaScript Mock Interview — Full Simulation

> **Instructions:** Set a 90-minute timer. Answer questions 1-15 as if speaking to an interviewer. Cover the model answer and respond aloud first. Grade yourself: ✅ solid, ⚠️ partial, ❌ missed.

---

## Section 1: Core JS Concepts (15 min — 5 quick-fire questions)

**Q1: What is the difference between `==` and `===`?**

`===` (strict equality) checks both value and type — no coercion. `==` (abstract equality) uses the Abstract Equality Comparison algorithm: if types differ, it coerces both operands before comparing. This produces surprising results: `"" == false` is `true`, `null == undefined` is `true`, `0 == ""` is `true`. The coercion rules are complex enough that memorizing them is impractical. In production code, always use `===`. The only intentional use of `==` is `value == null` to check for both `null` and `undefined` simultaneously — though many style guides prefer explicit `value === null || value === undefined`.

---

**Q2: Explain `var`, `let`, and `const` hoisting differences.**

All three are hoisted but differently. `var`: hoisted and initialized to `undefined` — accessible but valueless before assignment line. `let`/`const`: hoisted into the TDZ (Temporal Dead Zone) — the binding exists in the scope but accessing it before declaration throws `ReferenceError`. `const` additionally requires initialization at declaration and cannot be reassigned (though the value it holds can be mutated if it's an object). Function declarations are fully hoisted (name + body). Function expressions follow the rules of their `var`/`let`/`const` assignment.

---

**Q3: What does `this` refer to in an arrow function?**

Arrow functions don't have their own `this` binding. They inherit `this` from their enclosing lexical scope at definition time — not call time. You cannot override arrow function `this` with `call`, `apply`, or `bind` (those arguments are ignored for `this`). This makes arrow functions ideal for class method callbacks where you want the class instance as `this` regardless of how the callback is invoked. The classic use case: `setTimeout(() => this.update(), 100)` inside a class method — the arrow function captures the class instance's `this`, while a regular function would lose it.

---

**Q4: What is the output and why?**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

Output: `3, 3, 3`. `var` is function-scoped (or global-scoped here) — there is one `i` binding shared by all three closure functions. The `setTimeout` callbacks are macrotasks; they run after the synchronous for loop completes. By that time, `i` has been incremented to 3 (the value that stopped the loop). All three callbacks close over the same `i` and all see 3. Fix: use `let` (creates a new binding per iteration) or wrap in an IIFE.

---

**Q5: What is `Promise.allSettled` and when would you use it over `Promise.all`?**

`Promise.all` rejects immediately when any Promise rejects and discards the rest. `Promise.allSettled` waits for every Promise to settle (fulfilled or rejected) and returns an array of result objects: `{ status: "fulfilled", value }` or `{ status: "rejected", reason }`. Use `allSettled` when: you need to know the outcome of every operation regardless of failures (batch operations, parallel API calls where you want a report of all results), partial success is acceptable, or you're aggregating results and want to distinguish successes from failures after all complete. Example: sending notifications to 1000 users — you want to know which ones succeeded and which failed, not just stop at the first failure.

---

## Section 2: Intermediate Concepts (20 min — 5 medium questions)

**Q6: Trace the output of this code and explain why:**
```js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => {
  console.log("C");
  setTimeout(() => console.log("D"), 0);
});
console.log("E");
```

Output: `A → E → C → B → D`

Trace:
- `A` and `E` are synchronous — they run first.
- `setTimeout B` is registered as a macrotask.
- `Promise.resolve().then` callback ("C") is a microtask — queued before any macrotask.
- After sync code: drain microtask queue → run "C" callback.
- "C" runs, registers `setTimeout D` as a new macrotask.
- Microtask queue empty. Pick first macrotask: `B`.
- Pick next macrotask: `D`.

The key: microtasks (including "C") always run before macrotasks ("B"), even if the setTimeout was registered first. `D` is registered AFTER the microtask runs, so it appears after `B`.

---

**Q7: Implement `Promise.all` from scratch.**

```js
function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([]);

    const results = new Array(promises.length);
    let settled = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise) // handle non-Promise values
        .then(value => {
          results[index] = value;
          settled++;
          if (settled === promises.length) resolve(results);
        })
        .catch(reject); // first rejection propagates immediately
    });
  });
}
```

Key considerations: (1) Use `Promise.resolve(promise)` to handle non-Promise values in the array. (2) Results must be in the same order as input, not completion order — use index, not push. (3) One rejection causes immediate reject — the other Promises continue running but their results are discarded.

---

**Q8: What is the prototype chain for an instance of this class?**
```js
class Animal {}
class Dog extends Animal {}
const rex = new Dog();
```

Chain:
```
rex → Dog.prototype → Animal.prototype → Object.prototype → null
```
Also: `Dog.__proto__ === Animal` (static methods are inherited too). `Dog.prototype.__proto__ === Animal.prototype`. `rex instanceof Dog` → true, `rex instanceof Animal` → true, `rex instanceof Object` → true. `Object.getPrototypeOf(rex) === Dog.prototype` → true.

---

**Q9: How would you implement `memoize` that works correctly with recursive functions?**

A naive memoize wrapping a recursive function won't work if the function calls itself by name — the inner calls bypass the memoized wrapper. Solution: the function must reference the memoized version, not itself.

```js
function memoize(fn) {
  const cache = new Map();
  function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }
  return memoized;
}

// Wrong: fib calls itself, not the memoized version
const fib = memoize(function fib(n) {
  if (n <= 1) return n;
  return fib(n-1) + fib(n-2); // 'fib' here refers to the original, not memoized
});

// Correct: reassign so internal calls use memoized version
let fib2;
fib2 = memoize(function(n) {
  if (n <= 1) return n;
  return fib2(n-1) + fib2(n-2); // refers to the memoized function
});
```

---

**Q10: Explain how `async/await` handles errors and what happens without `try/catch`.**

An `async` function that `throw`s returns a rejected Promise. If you `await` a rejected Promise without `try/catch`, the rejection propagates up the async call chain. If no caller catches it, it becomes an unhandled rejection — which in Node.js 15+ crashes the process. Without `try/catch`, you can add `.catch()` to the returned Promise of the async function call: `asyncFn().catch(handleError)`. Inside the async function, multiple `await` calls in one `try` block catch any of them. For granular per-operation error handling, wrap each `await` in its own `try/catch`. One common pattern: `const [err, result] = await asyncFn().then(v => [null, v]).catch(e => [e, null])` — Go-style error tuples.

---

## Section 3: Coding Challenge (30 min)

**Q11: Live Coding — Implement `debounce` from scratch.**

Requirements:
1. Function must wait `delay` ms after the last call before executing
2. `this` context must be preserved
3. All arguments from the last call must be passed
4. Add a `.cancel()` method that prevents the pending call

```js
function debounce(fn, delay) {
  let timerId = null;

  function debounced(...args) {
    clearTimeout(timerId); // cancel any pending execution
    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(this, args); // preserve this context and pass args
    }, delay);
  }

  debounced.cancel = function() {
    clearTimeout(timerId);
    timerId = null;
  };

  return debounced;
}

// Test
const log = debounce((msg) => console.log("called:", msg), 100);
log("a"); log("b"); log("c"); // only "called: c" fires after 100ms
log.cancel(); // prevents the "c" call if invoked before 100ms
```

Walk through your solution: explain why `clearTimeout` is called first, why `this` matters (if the debounced function is used as a method), and what `.cancel()` enables (aborting a pending call when a component unmounts).

---

## Section 4: System Design Mini (10 min)

**Q12: System Design — How would you build a debounce library as an npm package?**

Key design considerations:

**API Design:**
```js
import { debounce, throttle, memoize } from "perf-utils";
const debouncedSearch = debounce(search, 300, { leading: false, trailing: true });
```

**Feature scope:**
- `debounce(fn, delay, options)` — leading, trailing, maxWait options
- `throttle(fn, interval)` — leading edge, trailing edge
- `memoize(fn, options)` — TTL, LRU maxSize, custom resolver
- TypeScript types out of the box

**Architecture:**
- Zero dependencies — pure JS
- Tree-shakeable ES module exports (not CommonJS only)
- Each function in its own file, barrel export
- `debounced.cancel()` and `debounced.flush()` methods
- Test suite: Jest, 100% coverage

**Edge cases to handle:**
- `this` binding (use regular functions internally, not arrows)
- Arguments from most recent call (not first call)
- Zero delay (still async via microtask/setTimeout)
- Multiple rapid flush() calls
- Garbage collection (don't hold references longer than needed)

**Distribution:**
- `package.json` main/module/types fields for CJS/ESM/TypeScript
- Semantic versioning, CHANGELOG
- CI with GitHub Actions (test on Node 18+, 20+)

---

## Section 5: Behavioral Question (5 min)

**Q13: Tell me about a time you identified and fixed a performance issue in a production JavaScript application.**

Structure your answer using STAR (Situation, Task, Action, Result):

**Situation:** Describe the specific symptom — slow page load, UI jank, memory growing over time.

**Task:** Your role — were you the one who found it, or were you assigned to fix it?

**Action (the important part — be technical):**
- How you diagnosed it (DevTools Performance tab, Lighthouse, profiler, user reports)
- What you found (e.g., "the search input fired an API call on every keystroke with no debouncing — 10+ calls per word typed")
- What you changed and why ("added 300ms debounce, reducing API calls by ~90%")
- How you verified the fix (before/after metrics)

**Result:** Quantify the improvement: "p95 search response time dropped from 2.4s to 0.6s."

If you don't have a production example yet, use a project example — the technical depth matters more than whether it was production.

---

**Q14: Reverse the order of words in a string without using `.split().reverse().join()`.**

```js
function reverseWords(s) {
  const trimmed = s.trim();
  let result = "";
  let wordStart = -1;

  for (let i = 0; i <= trimmed.length; i++) {
    if (i === trimmed.length || trimmed[i] === " ") {
      if (wordStart !== -1) {
        const word = trimmed.slice(wordStart, i);
        result = result ? word + " " + result : word;
        wordStart = -1;
      }
    } else if (trimmed[i] !== " " && wordStart === -1) {
      wordStart = i;
    }
  }

  return result;
}

console.log(reverseWords("the sky is blue"));  // "blue is sky the"
console.log(reverseWords("  hello world  "));  // "world hello"
console.log(reverseWords("a good   example")); // "example good a"
```

---

**Q15: Given an array of integers, find the length of the longest consecutive sequence. O(n) required.**

```js
// LeetCode #128 — Longest Consecutive Sequence
function longestConsecutive(nums) {
  const numSet = new Set(nums);
  let maxLen = 0;

  for (const num of numSet) {
    // Only start counting from the beginning of a sequence
    if (!numSet.has(num - 1)) {
      let current = num;
      let length = 1;

      while (numSet.has(current + 1)) {
        current++;
        length++;
      }

      maxLen = Math.max(maxLen, length);
    }
  }

  return maxLen;
}

// Key insight: only start counting from the smallest element in a sequence.
// If num-1 exists in set, then num is not the start — skip it.
// This ensures each element is visited at most twice across all sequences → O(n).

console.log(longestConsecutive([100, 4, 200, 1, 3, 2])); // 4 (1,2,3,4)
console.log(longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])); // 9
```

---

## Mock Interview Self-Grading

| Q# | Topic | Score (✅/⚠️/❌) | Notes |
|----|-------|------------------|-------|
| 1 | == vs === | | |
| 2 | Hoisting | | |
| 3 | this in arrow function | | |
| 4 | var loop closure | | |
| 5 | Promise.allSettled | | |
| 6 | Event loop output | | |
| 7 | Implement Promise.all | | |
| 8 | Prototype chain | | |
| 9 | Memoize + recursion | | |
| 10 | async/await errors | | |
| 11 | Implement debounce | | |
| 12 | System design (debounce lib) | | |
| 13 | Behavioral | | |
| 14 | Reverse words | | |
| 15 | Longest consecutive | | |

**Target:** 12+ ✅ before moving to Week 2 (React Internals + Backend fundamentals)
