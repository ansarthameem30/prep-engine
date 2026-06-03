# Day 03 – Prototypes, OOP & `this`: Interview Q&A

---

**Q1: What is the prototype chain and when does it end?**

The prototype chain is the series of `[[Prototype]]` links that JavaScript follows when looking up a property on an object. When you access `obj.prop`, the engine looks at `obj` itself first. If not found, it follows `obj.[[Prototype]]` to the next object, continuing up the chain. The chain ends when `[[Prototype]]` is `null` — which is the case for `Object.prototype`. So the standard chain for a plain object is: `obj → Object.prototype → null`. For class instances: `instance → ClassName.prototype → Object.prototype → null`. If the property is not found anywhere in the chain, the result is `undefined` for property access (or `TypeError` if you try to call `undefined` as a function).

---

**Q2: What is the difference between `__proto__` and `prototype`?**

`prototype` is a property that exists only on function objects. When you use `new FunctionName()`, the newly created object's `[[Prototype]]` is set to `FunctionName.prototype`. It's the blueprint object. `__proto__` is an accessor property defined on `Object.prototype` that exposes the internal `[[Prototype]]` link of any object instance. So `instance.__proto__ === Constructor.prototype` is true for any instance created by that constructor. You should use `Object.getPrototypeOf(obj)` instead of `obj.__proto__` in production code — `__proto__` is a legacy feature. `Object.create(proto)` creates a new object with `[[Prototype]]` set to `proto` without needing a constructor.

---

**Q3: What does the `new` keyword do step by step?**

Four steps: (1) A new empty object is created. (2) That object's `[[Prototype]]` is set to `Constructor.prototype`, establishing the prototype chain for property lookup. (3) The constructor function is called with `this` bound to the new object — so `this.name = name` adds `name` as an own property on the new object. (4) The return value is determined: if the constructor returns an object explicitly, that object is used as the result of `new`; if it returns a primitive or returns nothing, the newly created object from step 1 is returned. This is why you can override what `new` returns by explicitly `return { ... }` from a constructor — a useful technique for enforcing singletons.

---

**Q4: What are the four rules for `this` binding?**

In priority order from highest to lowest: (1) `new` binding — when called with `new`, `this` is the new object being created. (2) Explicit binding — `call`, `apply`, or `bind` sets `this` to the specified object; `bind` creates a permanently bound function that cannot be overridden. (3) Implicit binding — when a function is called as a method (`obj.method()`), `this` is `obj`. (4) Default binding — standalone function call; in strict mode `this` is `undefined`, in non-strict mode it's the global object. Arrow functions are a special case: they don't have their own `this` and instead inherit `this` from their enclosing lexical scope, ignoring all four rules above.

---

**Q5: Why does arrow function `this` work differently from regular function `this`?**

Arrow functions do not have their own `[[ThisBinding]]` in their execution context. When an arrow function is created, the engine captures the `this` value of the enclosing regular function or the global context — this capture happens at definition time, not call time. The `this` value is stored in the arrow function's `[[Environment]]` (its closure), making it immutable. Calling `call`, `apply`, or `bind` on an arrow function has no effect on `this` (the arguments still pass through, but `this` doesn't change). This makes arrow functions ideal for callbacks in class methods, where you want `this` to remain the class instance regardless of how the callback is invoked.

---

**Q6: What is the difference between `Object.create(proto)` and using `class extends`?**

Both set up prototype-based inheritance but at different abstraction levels. `Object.create(proto)` creates a new object with its `[[Prototype]]` set to `proto`. You use this to manually set up inheritance chains without constructors, or as the core building block in the pre-ES6 inheritance pattern (where you also need to call the parent constructor with `.call(this)`). `class extends` does several things automatically: it calls `super()` to chain constructors, it sets up the prototype chain for both instances (`Child.prototype.__proto__ === Parent.prototype`) and for static methods (`Child.__proto__ === Parent`), and it enforces rules (must call `super` before `this`, class constructor must be called with `new`). `class extends` also enables `super.method()` calls, which `Object.create` alone doesn't provide.

---

**Q7: How do you implement method sharing without duplicating memory?**

Methods should be defined on the prototype, not the constructor body. If you define methods inside the constructor (`this.greet = function() {...}`), every instance gets its own copy of the function object — multiplied by the number of instances. Defining methods on `prototype` means all instances share one copy via the prototype chain. In ES6 class syntax, methods in the class body are automatically added to `ClassName.prototype` rather than instances. The only exception is if you genuinely need per-instance methods that close over instance-specific state, or when using class fields with arrow functions for bound methods (`onClick = () => this.handle()` creates a per-instance bound function — useful for event handlers but costs memory per instance).

---

**Q8: What is the difference between classical inheritance and prototypal inheritance?**

Classical inheritance (Java, C++) creates instances by copying the class definition — the instance is an independent object with all properties and methods copied in. Prototypal inheritance (JavaScript) creates instances that delegate to prototype objects at runtime — if the property isn't on the instance, the engine looks it up on the prototype chain dynamically. This means: you can modify `Constructor.prototype` after instances are created, and all existing instances immediately see the change (because they look up properties on the live prototype object). In classical inheritance, changing a class definition doesn't affect existing instances. ES6 `class` syntax looks like classical inheritance but is purely syntactic sugar over prototypal inheritance — there is no copying, only delegation chains.
