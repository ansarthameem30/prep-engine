/**
 * Day 10 — JS Mock Day: Hands-On Exercises
 * These 5 exercises are drawn from Days 1–9 topics.
 * Attempt each WITHOUT looking at your notes. Time yourself.
 * Target: complete all 5 in under 45 minutes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Closure + Higher-Order Functions (Day 1/2)
// Write a `makeCounter` factory that supports increment, decrement, reset,
// and getCount. Each counter instance is independent.
// ─────────────────────────────────────────────────────────────────────────────

function makeCounter(initialValue = 0) {
  let count = initialValue;

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    reset()     { count = initialValue; return count; },
    getCount()  { return count; },
  };
}

const c1 = makeCounter(10);
const c2 = makeCounter();

console.log('=== Exercise 1: makeCounter ===');
console.log(c1.increment()); // 11
console.log(c1.increment()); // 12
console.log(c1.decrement()); // 11
console.log(c1.reset());     // 10 (resets to initialValue, not 0)
console.log(c2.getCount());  // 0  (independent from c1)


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Prototype Chain + `this` binding (Day 2/3)
// Implement an Animal base class (with `speak`) and a Dog subclass
// (overrides `speak`) using BOTH the old-style prototype approach
// AND the ES6 class syntax. Both must produce identical output.
// ─────────────────────────────────────────────────────────────────────────────

// Old-style prototype
function AnimalOld(name) {
  this.name = name;
}
AnimalOld.prototype.speak = function () {
  return `${this.name} makes a sound.`;
};

function DogOld(name, breed) {
  AnimalOld.call(this, name); // call super constructor
  this.breed = breed;
}
DogOld.prototype = Object.create(AnimalOld.prototype);
DogOld.prototype.constructor = DogOld;
DogOld.prototype.speak = function () {
  return `${this.name} barks.`;
};

// ES6 class syntax
class AnimalClass {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound.`; }
}

class DogClass extends AnimalClass {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
  speak() { return `${this.name} barks.`; }
}

console.log('\n=== Exercise 2: Prototype vs Class ===');
const oldDog = new DogOld('Rex', 'Labrador');
const newDog = new DogClass('Rex', 'Labrador');
console.log(oldDog.speak()); // Rex barks.
console.log(newDog.speak()); // Rex barks.
console.log(oldDog instanceof AnimalOld); // true
console.log(newDog instanceof AnimalClass); // true


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Async/Await + Error Handling (Day 4/5)
// Simulate fetching a user and their posts in two ways:
//   a) Sequential (waits for user before fetching posts)
//   b) Parallel (fetches both at the same time with Promise.all)
// Show that parallel is faster, and handle errors gracefully.
// ─────────────────────────────────────────────────────────────────────────────

function fakeDelay(ms, value, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error(`Failed to fetch: ${value}`));
      else resolve(value);
    }, ms);
  });
}

async function fetchUser(id)        { return fakeDelay(50, { id, name: 'Alice' }); }
async function fetchPosts(userId)   { return fakeDelay(50, [{ title: 'Post 1' }, { title: 'Post 2' }]); }
async function fetchProfile(userId) { return fakeDelay(100, null, true); } // always fails

async function sequentialFetch(userId) {
  const start = Date.now();
  const user  = await fetchUser(userId);
  const posts = await fetchPosts(userId);
  console.log(`Sequential: ${Date.now() - start}ms`); // ~100ms
  return { user, posts };
}

async function parallelFetch(userId) {
  const start = Date.now();
  const [user, posts] = await Promise.all([fetchUser(userId), fetchPosts(userId)]);
  console.log(`Parallel: ${Date.now() - start}ms`); // ~50ms
  return { user, posts };
}

async function fetchWithFallback(userId) {
  try {
    const profile = await fetchProfile(userId);
    return profile;
  } catch (err) {
    console.log(`Profile fetch failed (${err.message}), using default`);
    return { userId, avatar: 'default.png' }; // graceful fallback
  }
}

console.log('\n=== Exercise 3: Async/Await ===');
(async () => {
  await sequentialFetch(1);  // ~100ms
  await parallelFetch(1);    // ~50ms
  const profile = await fetchWithFallback(1); // logs fallback
  console.log('Profile:', profile);
})();


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Event Loop Mental Model (Day 5)
// Predict the exact output order. No running allowed — reason it out first.
// Then verify.
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Exercise 4: Event Loop Order (predict before running) ===');

// Prediction required:
// What order does this print?
//
// console.log('1');
// setTimeout(() => console.log('2'), 0);
// Promise.resolve().then(() => console.log('3'));
// queueMicrotask(() => console.log('4'));
// process.nextTick(() => console.log('5'));
// console.log('6');
//
// Answer: 1 → 6 → 5 → 3 → 4 → 2
// Why:
//   Sync:         1, 6
//   nextTick:     5  (nextTick queue drains before Promise microtasks)
//   Promise then: 3  (microtask queue)
//   queueMicrotask: 4 (microtask queue, after 3 because 3 was queued first)
//   setTimeout:   2  (macrotask — runs after all microtasks are drained)

console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
process.nextTick(() => console.log('5'));
console.log('6');
// Expected output: 1, 6, 5, 3, 4, 2


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: WeakMap Memoization + Memory Leak Prevention (Day 7/8)
// Implement a memoize function that uses a WeakMap so cached results
// for objects are automatically GC'd when the object is GC'd.
// Also implement a version with a regular Map (and explain the leak risk).
// ─────────────────────────────────────────────────────────────────────────────

// Regular Map version — leaks if keys are objects
function memoizeMap(fn) {
  const cache = new Map();
  return function (key) {
    if (cache.has(key)) {
      console.log('[Map cache] HIT');
      return cache.get(key);
    }
    const result = fn(key);
    cache.set(key, result);
    console.log('[Map cache] MISS — computed and stored');
    return result;
  };
}

// WeakMap version — keys must be objects; GC-friendly
function memoizeWeakMap(fn) {
  const cache = new WeakMap();
  return function (key) {
    if (cache.has(key)) {
      console.log('[WeakMap cache] HIT');
      return cache.get(key);
    }
    const result = fn(key);
    cache.set(key, result);
    console.log('[WeakMap cache] MISS — computed and stored');
    return result;
  };
}

function expensiveCompute(obj) {
  return Object.keys(obj).length * 42;
}

console.log('\n=== Exercise 5: WeakMap Memoization ===');
const memoizedMap = memoizeMap(expensiveCompute);
const memoizedWeak = memoizeWeakMap(expensiveCompute);

const config = { a: 1, b: 2, c: 3 }; // 3 keys → 126

console.log(memoizedMap(config));   // MISS → 126
console.log(memoizedMap(config));   // HIT  → 126
console.log(memoizedWeak(config));  // MISS → 126
console.log(memoizedWeak(config));  // HIT  → 126

// Memory leak risk with Map:
//   If `config` goes out of scope, the Map still holds a reference → never GC'd.
// WeakMap benefit:
//   If `config` goes out of scope and nothing else references it,
//   the WeakMap entry is eligible for GC automatically.

/**
 * SELF-ASSESSMENT CHECKLIST
 * ─────────────────────────
 * After completing all 5 exercises, rate each topic:
 *
 * Exercise 1 (Closures):    Red / Yellow / Green
 * Exercise 2 (Prototype):   Red / Yellow / Green
 * Exercise 3 (Async/Await): Red / Yellow / Green
 * Exercise 4 (Event Loop):  Red / Yellow / Green
 * Exercise 5 (WeakMap):     Red / Yellow / Green
 *
 * Any Red → schedule a 30-minute deep-dive review session before Day 20 mock.
 * Any Yellow → re-read the concept file and write one more example.
 */
