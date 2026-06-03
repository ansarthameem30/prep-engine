# Day 06 – ES6+ Advanced Features: Interview Q&A

---

**Q1: What is the difference between `??` and `||` for default values?**

`||` (logical OR) returns the right operand if the left is **falsy** — which includes `0`, `""`, `false`, `null`, and `undefined`. This means legitimate values like `0` and empty string trigger the fallback unintentionally. `??` (nullish coalescing) only triggers the fallback if the left operand is specifically `null` or `undefined` — it treats `0`, `""`, and `false` as valid values. For example, `const count = userInput || 10` would incorrectly use `10` when `userInput` is `0`. `const count = userInput ?? 10` correctly uses `0`. Always prefer `??` when the default should only apply for missing/null values, not for all falsy values. The same principle applies to `??=` vs `||=` for logical assignment.

---

**Q2: What is a generator function? What does `yield` do?**

A generator function (declared with `function*`) returns a generator object when called — not the return value directly. The generator object implements the Iterator protocol (`.next()` method). Each call to `.next()` runs the function body until the next `yield` expression, pauses execution, and returns `{ value: yieldedValue, done: false }`. The function's local state (all variables, position in code) is preserved between calls. When the function returns, the next `.next()` returns `{ value: returnValue, done: true }`. Generators enable lazy evaluation (produce values on demand without computing the whole sequence), infinite sequences (fibonacci, ID generators), and custom iterables via `[Symbol.iterator]`. They're also the foundation that `async/await` was originally built on (conceptually).

---

**Q3: Why use WeakMap instead of Map for DOM element metadata?**

When you use a regular `Map` to associate metadata with DOM elements, the Map holds a strong reference to each element as a key. Even if the element is removed from the DOM, it cannot be garbage collected because the Map still references it — a memory leak that grows with every removed element. WeakMap holds its keys weakly: if the DOM element has no other references (it was removed and nothing else holds it), the GC can collect it, and the WeakMap entry is automatically removed. This makes WeakMap the correct choice for any data structure that associates extra data with objects you don't own or whose lifecycle you don't control. The tradeoff: WeakMap is not iterable and has no `.size` — you can only access entries if you have the key object.

---

**Q4: What is the Reflect API and why does it exist alongside Proxy?**

`Reflect` is a built-in object that provides static methods mirroring the internal operations of JavaScript objects: `Reflect.get`, `Reflect.set`, `Reflect.has`, `Reflect.deleteProperty`, etc. It exists for two reasons: (1) When writing a Proxy handler, you need a way to invoke the default behavior for operations you're intercepting. Without `Reflect`, you'd write `target[prop]` or `target[prop] = value` — which is mostly equivalent but subtly wrong for things like inherited setters, `receiver` binding, and return value semantics. `Reflect.set(target, prop, value, receiver)` correctly propagates the receiver (the proxy itself), which matters when setters on the prototype chain need to write to the proxy. (2) `Reflect` provides a cleaner, function-based API for meta-programming versus operators — `Reflect.deleteProperty(obj, key)` returns a boolean and doesn't throw on non-configurable properties (unlike `delete`).

---

**Q5: What well-known symbols have you used and why do they matter?**

Well-known symbols customize fundamental language behaviors: `Symbol.iterator` makes any object work with `for...of`, spread, destructuring, and `Array.from` — essential for custom data structures. `Symbol.toPrimitive` controls how an object is coerced to a number, string, or default type (e.g., when used in arithmetic or template literals). `Symbol.hasInstance` overrides `instanceof` behavior — you can make `x instanceof MyClass` return `true` for objects that weren't created with `new MyClass()`. `Symbol.toStringTag` overrides the value in `Object.prototype.toString.call(obj)` — useful for making custom objects show as `[object MyType]` instead of `[object Object]`. `Symbol.asyncIterator` enables `for await...of` on custom async sequences. These matter in senior interviews because they show understanding of the meta-object protocol and how built-in operators actually work.

---

**Q6: How does optional chaining short-circuit?**

Optional chaining (`?.`) short-circuits the entire expression to `undefined` if the left side is `null` or `undefined` — without evaluating the rest of the chain. `obj?.method()?.property` — if `obj` is null, `method()` is never called and neither is `.property`. If `obj.method` returns null, `.property` is never accessed. This short-circuit is important for side effects: `obj?.save()` will not call `save()` if `obj` is null — the method call is skipped entirely. Important nuance: `?.` only guards the immediate step. `a?.b.c` — if `a` is null, `b.c` is not evaluated. But if `a` is an object and `a.b` is null, `.c` will throw because `?.` only protected the `a → b` step, not `b → c`.

---

**Q7: What is the difference between `for...of` and `for...in`?**

`for...in` iterates over all **enumerable string-keyed properties** of an object, including inherited ones from the prototype chain. It's designed for objects and should not be used on arrays (it iterates index strings like "0", "1" and any custom properties added to `Array.prototype`). `for...of` iterates over **values** of any **iterable** — objects that implement `Symbol.iterator`. Arrays, strings, Maps, Sets, generators, and any custom iterable work with `for...of`. It does not iterate prototype properties. When iterating objects (not Maps), use `Object.keys()`, `Object.values()`, or `Object.entries()` combined with `for...of`. A Map's `for...of` gives `[key, value]` pairs, which is why Maps are often better than plain objects for key-value iteration.

---

**Q8: What are logical assignment operators and when would you use them?**

ES2021 added three logical assignment operators: `&&=` (and-assign), `||=` (or-assign), and `??=` (nullish-assign). They combine the logical operators with assignment and short-circuit: `a ??= defaultValue` only assigns if `a` is null or undefined. `a ||= fallback` only assigns if `a` is falsy. `a &&= newVal` only assigns if `a` is truthy. They're more concise than `a = a ?? default` and importantly they only trigger a setter if the assignment actually happens — `a ??= b` won't call a setter on `a` if `a` is already non-null. Use cases: `config.timeout ??= 5000` (set defaults without overwriting existing values), `this._cache &&= null` (clear cache only if it exists), lazy initialization in object literals. They're equivalent to `a ?? (a = b)` semantically, not `a = a ?? b`.
