# Execution Context & JS Engine Internals

## How V8 Executes JavaScript

V8 (used by Node.js and Chrome) does not interpret JavaScript line-by-line. It compiles it. The pipeline:

1. **Parsing** — Source code → AST (Abstract Syntax Tree). The parser identifies syntax, builds the tree. A pre-parser does a quick pass to find function boundaries; the full parser processes the rest.
2. **Ignition (Bytecode Interpreter)** — The AST is compiled to bytecode by Ignition. This is not machine code — it's a compact, platform-agnostic intermediate representation.
3. **TurboFan (Optimizing JIT Compiler)** — Ignition profiles the bytecode as it runs. Hot paths (frequently executed code) get handed to TurboFan, which generates optimized machine code. If the type assumptions TurboFan made turn out to be wrong (a "deoptimization"), it falls back to bytecode.

This is why TypeScript and type-safe patterns genuinely improve runtime performance — TurboFan can keep its optimized machine code longer when types don't change shape mid-execution.

---

## Global Execution Context (GEC)

The GEC is created automatically before any user code runs. It has two phases:

### Phase 1: Memory Creation (Hoisting Phase)
The engine scans the entire script and:
- Allocates memory for all `var` declarations → initializes to `undefined`
- Allocates memory for function declarations → stores the **entire function body**
- Allocates memory for `let` and `const` → places them in the **Temporal Dead Zone (TDZ)**, not `undefined`
- Creates the `this` binding (in non-strict global context: `this === global/window`)
- Creates the `arguments` object (N/A at global level)

### Phase 2: Code Execution
Runs the code line by line. Variable assignments happen here.

```js
// Memory phase: x = undefined, greet = [function body]
// Execution phase: x gets assigned 10, greet() is callable

console.log(x);     // undefined (allocated but not yet assigned)
console.log(greet); // [Function: greet] (full body stored)

var x = 10;
function greet() { return 'hello'; }
```

---

## Function Execution Context (FEC)

Every function call creates a new FEC. It is pushed onto the call stack when the function is invoked, and popped when the function returns (or throws).

Each FEC contains:
- **Variable Environment** — bindings for `var`, function declarations inside this function
- **Lexical Environment** — bindings for `let`, `const`, block scopes + a reference to the outer environment
- **`this` binding** — determined by how the function was called (not where it was defined — except arrow functions)
- **`arguments` object** — array-like object (not available in arrow functions)

```js
function outer() {
  var a = 1;        // in outer's Variable Environment
  let b = 2;        // in outer's Lexical Environment

  function inner() {
    var c = 3;      // inner's Variable Environment
    console.log(a, b, c); // 1, 2, 3 — scope chain lookup
  }

  inner(); // new FEC created, pushed to call stack
}         // inner's FEC popped on return

outer();  // outer's FEC popped on return
// GEC remains until script finishes
```

---

## Call Stack Deep Dive

The call stack is a LIFO (Last In, First Out) data structure. V8 maintains a single call stack (JS is single-threaded).

```js
function c() { console.log('c'); }
function b() { c(); }
function a() { b(); }

a();
// Stack progression:
// [GEC]
// [GEC, a()]
// [GEC, a(), b()]
// [GEC, a(), b(), c()]
// [GEC, a(), b()]   ← c() returned
// [GEC, a()]         ← b() returned
// [GEC]              ← a() returned
```

**Stack overflow** occurs when the stack exceeds its maximum size — typically via infinite recursion or deeply nested synchronous calls.

```js
// Stack overflow example
function recurse() { recurse(); }
recurse(); // RangeError: Maximum call stack size exceeded
```

**Tail call optimization (TCO)** — ES6 specifies TCO for strict-mode tail calls. V8 currently does NOT implement TCO fully. Don't rely on it.

---

## Variable Environment vs Lexical Environment

This distinction matters for understanding how scoping actually works at the spec level:

| | Variable Environment | Lexical Environment |
|---|---|---|
| Stores | `var` declarations, function declarations | `let`, `const`, block scopes, formal parameters |
| Scope | Function-scoped | Block-scoped |
| Hoisting init | `undefined` | TDZ (uninitialized) |
| Outer ref | Points to outer VE | Points to outer LE |

In practice, modern engines unify these into a single environment record per scope with different binding types, but the mental model matters for interviews.

---

## Hoisting — The Full Picture

### `var` hoisting
```js
console.log(x); // undefined — declaration hoisted, init is not
var x = 5;
console.log(x); // 5

// What the engine "sees":
var x;           // hoisted to top of function/global scope
console.log(x);  // undefined
x = 5;
console.log(x);  // 5
```

### `let` and `const` hoisting (TDZ)
`let` and `const` ARE hoisted — but into the Temporal Dead Zone. The binding exists but is uninitialized. Accessing it before the declaration line throws a `ReferenceError`.

```js
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;

// 'y' exists in the scope from the start of the block (it was hoisted)
// but it's in TDZ until line: let y = 10;
```

```js
// Proof that let is hoisted (not just "not hoisted"):
let x = 'global';
{
  // If let were not hoisted, this would log 'global'
  // But it throws ReferenceError — 'x' is hoisted to block scope
  // and is in TDZ, shadowing the outer 'x'
  console.log(x); // ReferenceError
  let x = 'block';
}
```

### `const` hoisting
Same as `let` — TDZ applies. Additionally, `const` must be initialized at declaration.

```js
const z; // SyntaxError: Missing initializer in const declaration
```

### Function declaration hoisting
The entire function body is hoisted. This is why you can call a function declared with `function` keyword before it appears in code.

```js
greet(); // "Hello" — works fine
function greet() { console.log("Hello"); }
```

### Function expression hoisting
Only the variable declaration is hoisted, not the function body.

```js
greet(); // TypeError: greet is not a function
var greet = function() { console.log("Hello"); };

// With let/const:
greet(); // ReferenceError: Cannot access 'greet' before initialization
const greet = () => console.log("Hello");
```

### Class hoisting
Classes are also hoisted into TDZ — same behavior as `let/const`.

```js
const obj = new MyClass(); // ReferenceError
class MyClass {}
```

---

## Temporal Dead Zone (TDZ) — Interview Deep Dive

The TDZ is the time between entering a scope and the point where a variable's declaration is evaluated. During TDZ:
- The binding exists (memory allocated)
- It is uninitialized
- Any access throws `ReferenceError`

```js
function example() {
  // TDZ for 'a' begins here (function scope start)
  console.log(typeof a); // ReferenceError! (not 'undefined' like with var)
  let a = 1;
  // TDZ for 'a' ends here
}

// BUT typeof on a truly undeclared variable works:
console.log(typeof notDeclaredAtAll); // 'undefined' — legacy behavior
```

Key TDZ gotcha with default parameters:

```js
function f(a = b, b = 1) {
  // When 'a' is evaluated, 'b' is still in TDZ
  return [a, b];
}
f(); // ReferenceError: Cannot access 'b' before initialization
f(1); // [1, 1] — 'b' evaluated after 'a'
```

---

## Common Interview Gotchas

```js
// Gotcha 1: var in block scope leaks
{
  var leaked = true;
}
console.log(leaked); // true — var ignores block scope

// Gotcha 2: function declaration in block (sloppy mode)
if (true) {
  function foo() { return 1; }
}
// Behavior is implementation-defined in sloppy mode. In strict mode: block-scoped.

// Gotcha 3: Hoisting order — function declarations beat var
console.log(typeof foo); // 'function', not 'undefined'
var foo = 1;
function foo() {}
// Functions are hoisted first, then var (but var won't overwrite function)

// Gotcha 4: Variable shadowing in closures
var x = 1;
function outer() {
  console.log(x); // undefined, not 1 — var x is hoisted within outer
  var x = 2;
}
outer();
```
