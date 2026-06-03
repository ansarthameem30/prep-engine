# Day 02 – Closures & Scope Chain: Interview Q&A

> Practice: Cover the answer, say your response out loud in 30–60 seconds, then check.

---

**Q1: What is a closure? Give a precise definition.**

A closure is the combination of a function and the lexical environment within which that function was declared. When a function is created, the JavaScript engine attaches a hidden `[[Environment]]` reference to the function object pointing to the current scope chain. This means the function retains access to all variables in its enclosing scopes even after those outer functions have returned and their execution contexts have been removed from the call stack. In V8, the outer environment's variable bindings are kept alive by the garbage collector because the inner function holds a reference to them.

---

**Q2: Does a closure capture values or references? Why does it matter?**

A closure captures a live reference to the variable binding, not a snapshot of its value at creation time. This is the root of the classic `var` loop bug: all callbacks in a `for (var i...)` loop share the same `i` binding, so when they execute asynchronously, they all see `i`'s final value after the loop ends. With `let`, each iteration creates a new binding, giving each callback its own `i`. This distinction also means that if the outer function mutates a variable after creating the inner function, the inner function will see the updated value — which is both useful (for shared mutable state like counters) and dangerous (for unintended sharing).

---

**Q3: What are practical use cases for closures?**

Closures enable several essential patterns: (1) Data privacy — variables inside a function are inaccessible from outside, creating private state (the module pattern and factory functions rely on this). (2) Memoization — caching results by storing a Map in the closure, so repeated calls with the same args skip re-computation. (3) Partial application and currying — capturing some arguments and returning a function expecting the rest. (4) Event handlers that need to remember context — e.g., a click handler that references the element or configuration it was set up with. (5) once(), debounce(), and throttle() implementations all rely on closures to persist state between calls.

---

**Q4: How can closures cause memory leaks?**

When a closure holds a reference to a large object or a DOM element, the garbage collector cannot reclaim that memory as long as the closure itself is reachable. Common pitfalls: (1) Event listeners attached to elements that are later removed from the DOM — the listener closure keeps the element (and anything it references) alive. (2) `setInterval` callbacks that are never cleared, keeping their closure's variables alive indefinitely. (3) Accidentally capturing large arrays or buffers in long-lived closures (global event handlers, singletons). The fix is to explicitly remove event listeners, clear intervals/timeouts, and null out references when they're no longer needed.

---

**Q5: Explain the module pattern and why it was important before ES6.**

The module pattern uses an IIFE (Immediately Invoked Function Expression) to create a private scope, then returns an object exposing only the public API. Before ES6 modules, JavaScript had no native module system — everything ran in the global scope. The module pattern solved namespace pollution and encapsulation by keeping implementation details private inside the IIFE and only exposing what callers needed through the returned object. The `counter` and `balance` variables in the IIFE are inaccessible from outside — they're only reachable via the returned methods, which form closures over that private scope. ES6 `import/export` achieves the same privacy through module scope, making the IIFE approach largely obsolete for new code.

---

**Q6: What is the difference between a closure and a higher-order function?**

A higher-order function is any function that takes a function as an argument or returns a function. A closure is a mechanism — the bundling of a function with its lexical environment. The two concepts frequently overlap: when a higher-order function returns an inner function, that inner function is a closure because it captures the outer function's scope. But not all closures come from higher-order functions (any nested function that references an outer variable is a closure), and not all higher-order functions produce meaningful closures (e.g., `Array.prototype.map` is HOF but the callback doesn't necessarily close over local state). The distinction matters in interviews: HOF is about function shape, closure is about scope capture.

---

**Q7: How do you implement debounce using closures?**

```js
function debounce(fn, delay) {
  let timerId; // persists between calls via closure
  return function(...args) {
    clearTimeout(timerId);          // cancel any pending call
    timerId = setTimeout(() => {
      fn.apply(this, args);         // call with correct context
    }, delay);
  };
}
```
The closure over `timerId` is essential — each call to the debounced function needs to be able to cancel the previous timer. Without closure, `timerId` would be lost between calls. The closure keeps it alive for the lifetime of the debounced function. This is also why you must return the debounced function and keep a reference to it — if you recreate it on every event, you get a fresh closure with a fresh `timerId` and debouncing breaks.

---

**Q8: What happens to closures when a function is called recursively?**

Each recursive call creates a new execution context (new function execution context pushed to the call stack) with its own copy of local variables. However, all these contexts can close over the same outer scope. This means closures over outer-scope variables are shared across all recursive frames — modifying an outer-scope variable in one frame affects what all other frames see. Local variables (declared inside the recursive function) are frame-specific. This distinction matters for memoized recursion: if you use a closure-based cache, all recursive calls share the same cache, which is the desired behavior for memoized Fibonacci. If you mistakenly think each frame has its own cache, you'll be confused about when hits occur.
