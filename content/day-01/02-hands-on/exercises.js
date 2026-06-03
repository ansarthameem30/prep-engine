/**
 * Day 01 – Hands-On Exercises
 * Topic: Hoisting, Execution Context, var/let/const
 *
 * Instructions:
 * - For each exercise, write your answer BEFORE running the code.
 * - Run with: node exercises.js
 * - Compare your prediction to the actual output.
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Predict the Output (Hoisting Quiz)
// ─────────────────────────────────────────────────────────────
// What does this log? Write your answer before running.

console.log("=== Exercise 1 ===");

console.log(a); // Your answer: ?
var a = 5;
console.log(a); // Your answer: ?

console.log(b()); // Your answer: ?
function b() { return "I am b"; }

console.log(typeof c); // Your answer: ?
console.log(typeof d); // Your answer: ?
var c = 10;
// d is never declared

/*
Expected:
  undefined
  5
  "I am b"
  "undefined"   ← var c hoisted but uninitialized
  "undefined"   ← typeof on undeclared variable does NOT throw
*/


// ─────────────────────────────────────────────────────────────
// Exercise 2: Fix the Broken Hoisting Code
// ─────────────────────────────────────────────────────────────
// The code below throws errors. Fix EACH issue using the
// appropriate declaration (var / let / const / function).
// Do NOT move the console.log lines.

console.log("\n=== Exercise 2 ===");

// Bug 1: should print function result before declaration
// console.log(multiply(3, 4)); // currently broken if multiply is an expression
// FIX: convert to function declaration
// const multiply = (x, y) => x * y;  // ← original (broken for pre-call)

function multiply(x, y) { return x * y; }  // FIXED
console.log(multiply(3, 4)); // 12

// Bug 2: TDZ error
// console.log(score); // ReferenceError with let
// let score = 100;

// FIX: either move console.log below declaration, or use var
var score = 100; // or: move console.log after 'let score'
console.log(score); // 100

// Bug 3: const reassignment
// const MAX = 50;
// MAX = 100; // TypeError: Assignment to constant variable

const MAX = 50;
// MAX = 100; // removed — const cannot be reassigned
console.log(MAX); // 50


// ─────────────────────────────────────────────────────────────
// Exercise 3: Execution Context Trace
// ─────────────────────────────────────────────────────────────
// Trace what gets logged, in what order, and WHY.
// Draw the call stack mentally before running.

console.log("\n=== Exercise 3 ===");

var x = "global";

function first() {
  var x = "first";     // shadows global x in this FEC
  console.log(x);      // ?
  second();
  console.log(x);      // ?
}

function second() {
  console.log(x);      // ? which x?
  // 'second' has no local x — looks up scope chain
  // second() is defined in global scope → sees global x, not first's x
}

first();
console.log(x);        // ?

/*
Expected output:
  "first"    ← first()'s own x
  "global"   ← second() closes over global scope, not first()'s scope
  "first"    ← back in first(), after second() returned
  "global"   ← global scope x unchanged

KEY INSIGHT: Scope is LEXICAL (where defined), not DYNAMIC (where called).
second() is defined at global level → its scope chain points to global, not to first().
*/


// ─────────────────────────────────────────────────────────────
// Exercise 4: var vs let in Loops
// ─────────────────────────────────────────────────────────────
// Classic interview trap. Predict, then run.

console.log("\n=== Exercise 4 ===");

// Part A: var in loop
console.log("-- var loop --");
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var:", i), 0);
}
// Predicted output: ?
// Actual: var: 3  var: 3  var: 3
// Reason: var is function-scoped. All callbacks share the SAME i.
// By the time callbacks run, the loop has finished: i === 3.

// Part B: let in loop
console.log("-- let loop --");
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let:", j), 0);
}
// Predicted output: ?
// Actual: let: 0  let: 1  let: 2
// Reason: let creates a NEW binding per iteration.
// Each callback closes over its own j.

// Part C: Fix var version WITHOUT using let
console.log("-- var fixed with IIFE --");
for (var k = 0; k < 3; k++) {
  ((capturedK) => {
    setTimeout(() => console.log("iife:", capturedK), 0);
  })(k); // immediately invoked, capturing current k
}
// Actual: iife: 0  iife: 1  iife: 2


// ─────────────────────────────────────────────────────────────
// Exercise 5: Function Declaration vs Expression Hoisting
// ─────────────────────────────────────────────────────────────
// Predict which calls succeed and which throw, and WHY.

console.log("\n=== Exercise 5 ===");

// Attempt 1: call before declaration
try {
  console.log(declaredFn()); // ?
} catch (e) {
  console.log("Error:", e.message);
}
function declaredFn() { return "declared function works!"; }

// Attempt 2: call before expression
try {
  console.log(expressionFn()); // ?
} catch (e) {
  console.log("Error:", e.message);
}
var expressionFn = function() { return "expression fn"; };

// Attempt 3: call before arrow function (let)
try {
  console.log(arrowFn()); // ?
} catch (e) {
  console.log("Error:", e.message);
}
const arrowFn = () => "arrow fn";

// Attempt 4: named function expression — name is local to function body only
var namedExpr = function myName() { return myName.name; };
console.log(namedExpr());   // "myName"
try {
  console.log(myName()); // ?
} catch(e) {
  console.log("Error:", e.message); // ReferenceError: myName is not defined
}

/*
Expected:
  "declared function works!"         ← function declaration fully hoisted
  Error: expressionFn is not a function  ← var hoisted as undefined
  Error: Cannot access 'arrowFn' before initialization  ← const TDZ
  "myName"
  Error: myName is not defined       ← function name is scoped to function body
*/
