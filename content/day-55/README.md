# Day 55 – JavaScript Deep Mock Interview: Full 90-Minute Simulation | DSA: Timed JS Coding Challenge

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:05 | No new concept — simulation day. Quick review of your JS weak areas only. |
| Hands-On | 00:05–01:00 | Full JS interview simulation: event loop trace + closure Q + prototype chain + async patterns + system design |
| DSA | 01:00–01:20 | Timed JS coding challenge — EventEmitter implementation under 20 min |
| Interview Q | 01:20–01:30 | Self-grade all rounds, log weak areas |

---

## Today's Objectives

> **Note:** `01-concept/` contains only a `.gitkeep` — this is a simulation day with no new concept files. All study material is in `04-interview-prep/`.

- [ ] Complete full JavaScript interview simulation under realistic conditions
- [ ] Score yourself honestly on each round (1–5 rubric)
- [ ] Identify your top 2 JavaScript weak areas and log them
- [ ] Implement a complete EventEmitter from scratch in < 20 minutes
- [ ] Re-do any round you scored < 3 after the session

---

## Concept: Simulation Day

> No new learning today. This is a deliberate practice day under interview conditions. The value comes from doing, not reading.

If you feel you must review, spend the 5 minutes scanning:
- Your Day 02 notes on closure and scope
- Your Day 03 notes on event loop, microtask queue, and Promise internals
- Your Day 05 notes on prototype chain and `this` binding

---

## Full Mock Interview Simulation

### Ground Rules
- Timer must be running for each section. No pausing.
- No reference materials, no MDN, no Stack Overflow.
- For coding challenges: write in a code file, run it, see if it works.
- After the simulation: grade yourself, then look up anything you missed.

---

### Round 1: Event Loop Trace (10 min)
Trace the exact output order for these two snippets — write your answer before running:

**Snippet A:**
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');
```

**Snippet B:**
```javascript
async function main() {
  console.log('A');
  await Promise.resolve();
  console.log('B');
  await new Promise(r => setTimeout(r, 0));
  console.log('C');
}
main();
console.log('D');
```

**Score yourself:** Did you get both correct? Explain the microtask queue vs macrotask queue vs call stack behavior out loud.

---

### Round 2: Closure Questions (10 min)
Answer out loud without writing code first:
1. What is a closure? Give a practical use case beyond the textbook example.
2. What is the classic `var` in a loop closure bug? How do you fix it with `let` and with `IIFE`?
3. Implement a `counter` factory function with `increment`, `decrement`, and `getCount` methods using closure.
4. What is a partial function application? Implement `partial(fn, ...args)` using closures.
5. Explain the memory implications of closures — when can they cause memory leaks?

---

### Round 3: Prototype Chain (10 min)
Answer precisely:
1. What does `Object.create(proto)` do? How does it differ from `new Constructor()`?
2. Implement classical inheritance without `class` syntax using only prototype chain manipulation.
3. `Object.create(null)` — what does this produce and when is it useful?
4. How does `instanceof` work? Trace what it checks step by step for `[] instanceof Array`.
5. What is `hasOwnProperty` and why do you sometimes need it?

---

### Round 4: Async Patterns (10 min)
Live code these (write them, run them):
1. Implement `promiseAll(promises)` — same behavior as `Promise.all`.
2. Implement `promiseRace(promises)` — same behavior as `Promise.race`.
3. Implement a `retry(fn, maxAttempts, delayMs)` function that retries an async function on failure.
4. Implement `asyncMap(array, asyncFn, concurrencyLimit)` — processes array with limited parallelism.

---

### Round 5: Performance Optimization Coding Challenge (10 min)
```javascript
// Given this slow function that is called 10,000 times with the same arguments:
function expensiveCalc(n) {
  // simulates expensive computation
  let result = 0;
  for (let i = 0; i < n * 1000; i++) result += Math.sqrt(i);
  return result;
}

// Task: Memoize it. Then implement a version with:
// 1. Cache size limit (LRU, max 100 entries)
// 2. TTL expiry (entries expire after 5 seconds)
// 3. Cache hit/miss statistics
```

---

### Round 6: System Design — Design an Event Emitter (15 min)
Design and implement a production-quality `EventEmitter` class with:
- `on(event, listener)` — subscribe
- `off(event, listener)` — unsubscribe
- `emit(event, ...args)` — trigger all listeners
- `once(event, listener)` — subscribe once, auto-unsubscribe after first emit
- `removeAllListeners(event?)` — clear all listeners for event, or all events
- Memory leak protection: warn if listener count for an event exceeds 10 (Node.js behavior)
- Return `this` for chaining on `on`/`off`/`once`

---

## DSA Focus: Timed JS Coding Challenge

- **Problem:** Implement a complete, tested EventEmitter (from Round 6 above)
- **Difficulty:** Medium (implementation challenge)
- **Pattern:** OOP + Map data structure + WeakRef concepts
- **Time Target:** < 20 minutes
- **Key Insight:** Use `Map<string, Set<Function>>` for listeners; `once` wraps the listener in a closure that calls `off` after first invocation; `emit` iterates a copy of the listener set (in case a listener calls `off` during emit)

---

## Today's 5 Interview Questions

> These are your self-assessment questions — answer them after the simulation, not before.

1. Can you explain the JavaScript event loop including the microtask queue without hesitation?
2. Can you trace async execution order for any given mix of Promises, setTimeout, and async/await?
3. Can you implement `Promise.all`, `Promise.race`, and `Promise.allSettled` from scratch?
4. Can you explain prototype-based inheritance and implement it without `class` syntax?
5. Can you implement an LRU cache and a memoize function with TTL from memory?

---

## Files

> `01-concept/` — Simulation day: no concept notes. See your Phase 1 notes (Days 01-10) for reference.

- `01-concept/` → `.gitkeep` only — simulation day, no new concept files
- `02-hands-on/` → js-mock-solutions.js — your answers from all 6 rounds (write them during the simulation)
- `03-dsa/` → event-emitter.js — your EventEmitter implementation from Round 6
- `04-interview-prep/` → js-mock-scorecard.md — self-graded rubric (1–5 per round) + weak areas identified

---

## Success Criteria
- [ ] Completed all 6 simulation rounds without pausing or using references
- [ ] Scored yourself honestly — did not skip a round because it was hard
- [ ] EventEmitter implementation runs correctly with all methods
- [ ] Logged top 2 weak areas from this simulation for targeted review before Day 60
- [ ] Scored 4+ on at least 4 of the 6 rounds
