# Day 01 – JS Engine & Execution Context: Interview Q&A

> Practice: Cover the answer, say your response out loud in 30–60 seconds, then check.

---

**Q1: What happens when you run a JavaScript file?**

The engine (V8 in Node/Chrome) first parses the source code into an Abstract Syntax Tree. Then Ignition compiles the AST into bytecode. Before any code executes, the engine creates the Global Execution Context and goes through the memory creation phase — allocating memory for all `var` declarations (initialized to `undefined`) and function declarations (stored in full). `let` and `const` bindings are allocated but placed in the Temporal Dead Zone. Once the memory phase completes, the engine enters the execution phase and runs the code line by line. Hot code paths get JIT-compiled to optimized machine code by TurboFan.

---

**Q2: Explain the call stack with an example.**

The call stack is a LIFO data structure that tracks active execution contexts. When a function is called, a new execution context is created and pushed onto the stack. When the function returns, that context is popped. At any point, the top of the stack is the currently running function. For example: calling `a()` which calls `b()` which calls `c()` builds a stack of `[GEC, a, b, c]`. When `c` returns, it's popped; when `b` returns, it's popped; and so on. A stack overflow occurs when the maximum stack depth is exceeded — typically via unbounded recursion. Since JavaScript is single-threaded, there is only one call stack per thread.

---

**Q3: What is hoisting and how does it work for var vs let/const?**

Hoisting is the engine behavior where variable and function declarations are processed during the memory creation phase before code executes. For `var`, the declaration is hoisted and initialized to `undefined` — so accessing a `var` before its assignment returns `undefined`, not a `ReferenceError`. For `let` and `const`, the declaration IS hoisted (the binding exists in the scope), but it is placed in the Temporal Dead Zone — accessing it before the declaration line throws a `ReferenceError: Cannot access 'x' before initialization`. Function declarations are fully hoisted — both declaration and body — so they can be called before they appear in source. Function expressions and arrow functions assigned to `let/const` are in TDZ; those assigned to `var` are hoisted as `undefined`.

---

**Q4: Why does `var` in a loop cause closure issues?**

`var` is function-scoped, not block-scoped. In a `for` loop, there is only one `var i` binding shared across all iterations — the loop body doesn't create a new `i` per iteration. If you capture `i` inside a callback (e.g., `setTimeout`), all callbacks close over the same binding. By the time those callbacks execute, the loop has already finished and `i` has its final value. With `let`, the engine creates a new binding per iteration, so each callback captures a distinct `i`. The fix without `let` is an IIFE that creates a new scope per iteration, capturing the current value as a parameter.

---

**Q5: What is the Temporal Dead Zone?**

The TDZ is the region in a scope between the start of the scope and the `let`/`const` declaration line. During this zone, the binding exists (it was hoisted during the memory phase) but is uninitialized. Any read or write to it throws `ReferenceError: Cannot access 'x' before initialization`. This is a deliberate design decision — unlike `var`'s silent `undefined`, the TDZ makes bugs visible immediately. A subtle gotcha: `typeof` on a `var` or undeclared variable returns `"undefined"`, but `typeof` on a TDZ variable still throws a `ReferenceError`.

---

**Q6: What is the difference between function declaration and function expression?**

A function declaration uses the `function` keyword as a statement and is fully hoisted — both the name and body are available anywhere in the enclosing scope, even before the line where it appears. A function expression assigns a function to a variable; only the variable declaration is hoisted (to `undefined` for `var`, or into TDZ for `let/const`). Named function expressions have their name as a read-only binding scoped to the function body only — the name is not available in the outer scope. Arrow functions are always expressions. In strict mode, function declarations inside blocks (`if`, `for`) are block-scoped; in sloppy mode the behavior is implementation-defined.

---

**Q7: How does JavaScript handle memory allocation for primitives vs objects?**

Primitives (number, string, boolean, null, undefined, symbol, bigint) are stored by value, typically on the call stack (in the variable environment of the current execution context). They are immutable — operations on primitives produce new values rather than mutating the original. Objects (including arrays and functions) are allocated on the heap. A variable holding an object stores a reference (a memory address) to the heap location, not the object itself. This is why `const obj = {}; obj.key = 1` works — `const` prevents reassigning the reference, not mutating the object. V8's garbage collector (Orinoco, using generational GC with young and old generations) reclaims heap memory when objects are no longer reachable via any reference chain from root (GEC, active stack frames).

---

**Q8: What is the difference between `undefined` and `not defined`?**

`undefined` is a value — it means a variable has been declared but not yet assigned a value. `not defined` is a condition — it means no binding for that identifier exists anywhere in the scope chain, causing a `ReferenceError` at runtime. `var x;` → `x` is `undefined`. Accessing `y` where `y` was never declared → `ReferenceError: y is not defined`. The one exception is `typeof`: `typeof y` returns the string `"undefined"` even if `y` is completely undeclared — this is a legacy safety hatch. Importantly, `null` is different from both: it is an intentional absence of value, explicitly assigned by the developer, and its `typeof` returns `"object"` (a historical bug in the spec).
