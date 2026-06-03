/**
 * Day 03 – Hands-On Exercises
 * Topic: Prototypes, OOP, `this` binding
 * Run with: node exercises.js
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Prototype Chain Traversal
// ─────────────────────────────────────────────────────────────
// Build a class hierarchy and manually verify the prototype chain.

class Vehicle {
  constructor(make) { this.make = make; }
  type() { return "vehicle"; }
}

class Car extends Vehicle {
  constructor(make, model) {
    super(make);
    this.model = model;
  }
  type() { return "car"; }
}

const myCar = new Car("Toyota", "Camry");

console.log("=== Exercise 1: Prototype Chain ===");
console.log(myCar.hasOwnProperty("make"));   // true — own property
console.log(myCar.hasOwnProperty("type"));   // false — on prototype

// Walk the chain manually
let proto = Object.getPrototypeOf(myCar);
while (proto) {
  console.log(proto.constructor.name || "anonymous", "→");
  proto = Object.getPrototypeOf(proto);
}
// Car → Vehicle → Object → (null exits loop)

// instanceof checks the prototype chain
console.log(myCar instanceof Car);     // true
console.log(myCar instanceof Vehicle); // true
console.log(myCar instanceof Object);  // true


// ─────────────────────────────────────────────────────────────
// Exercise 2: this Binding Prediction
// ─────────────────────────────────────────────────────────────
// Predict the value of 'this' in each case before running.

console.log("\n=== Exercise 2: this Binding ===");

const user = {
  name: "Alice",
  getName: function() { return this.name; },
  getNameArrow: () => "arrow: " + (typeof this === 'undefined' ? 'undefined' : (this.name || 'no name'))
};

// Case 1: Method call (implicit binding)
console.log(user.getName()); // "Alice"

// Case 2: Extracted method (lost binding)
const extractedFn = user.getName;
try {
  console.log(extractedFn()); // undefined (strict) or global name
} catch (e) {
  console.log("Error:", e.message);
}

// Case 3: explicit binding
console.log(user.getName.call({ name: "Bob" })); // "Bob"

// Case 4: Arrow function — lexical this (this = module context in Node)
console.log(user.getNameArrow()); // depends on outer context

// Case 5: bind
const boundFn = user.getName.bind({ name: "Charlie" });
console.log(boundFn()); // "Charlie"
console.log(boundFn.call({ name: "Dave" })); // "Charlie" — bind wins over call


// ─────────────────────────────────────────────────────────────
// Exercise 3: Implement `new` from Scratch
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 3: Custom new ===");

function myNew(Constructor, ...args) {
  const instance = Object.create(Constructor.prototype);
  const result = Constructor.apply(instance, args);
  return (result !== null && typeof result === 'object') ? result : instance;
}

function Point(x, y) {
  this.x = x;
  this.y = y;
}
Point.prototype.toString = function() {
  return `(${this.x}, ${this.y})`;
};

const p1 = new Point(3, 4);
const p2 = myNew(Point, 3, 4);

console.log(p1.toString()); // (3, 4)
console.log(p2.toString()); // (3, 4)
console.log(p1 instanceof Point); // true
console.log(p2 instanceof Point); // true — Object.create sets up the chain


// ─────────────────────────────────────────────────────────────
// Exercise 4: Fix this in Async Context
// ─────────────────────────────────────────────────────────────
// The broken version loses 'this' inside setTimeout.
// Fix it using 3 approaches.

console.log("\n=== Exercise 4: Fix this in Async ===");

class Clock {
  constructor() {
    this.ticks = 0;
  }

  // Approach 1: Arrow function (lexical this)
  startArrow() {
    const id = setInterval(() => {
      this.ticks++;
      if (this.ticks >= 3) {
        clearInterval(id);
        console.log("Arrow approach ticks:", this.ticks);
      }
    }, 10);
  }

  // Approach 2: bind
  startBind() {
    const tick = function() {
      this.ticks++;
      if (this.ticks >= 3) {
        clearInterval(id);
        console.log("Bind approach ticks:", this.ticks);
      }
    }.bind(this);
    const id = setInterval(tick, 10);
  }

  // Approach 3: capture this in closure variable
  startClosure() {
    const self = this; // old-school pre-arrow approach
    const id = setInterval(function() {
      self.ticks++;
      if (self.ticks >= 3) {
        clearInterval(id);
        console.log("Closure approach ticks:", self.ticks);
      }
    }, 10);
  }
}

const clock1 = new Clock();
const clock2 = new Clock();
const clock3 = new Clock();
clock1.startArrow();
setTimeout(() => clock2.startBind(), 100);
setTimeout(() => clock3.startClosure(), 200);


// ─────────────────────────────────────────────────────────────
// Exercise 5: Mixin Pattern (Composition over Inheritance)
// ─────────────────────────────────────────────────────────────
// Implement a mixin-based approach to share behavior across
// classes that don't share a class hierarchy.

console.log("\n=== Exercise 5: Mixins ===");

const Serializable = (Base) => class extends Base {
  serialize() {
    return JSON.stringify(this);
  }
  static deserialize(json) {
    return Object.assign(new this(), JSON.parse(json));
  }
};

const Validatable = (Base) => class extends Base {
  validate() {
    // Override in concrete class
    return Object.values(this).every(v => v !== null && v !== undefined);
  }
};

class BaseModel {
  constructor(data) {
    Object.assign(this, data);
  }
}

class UserModel extends Serializable(Validatable(BaseModel)) {
  constructor(data) { super(data); }
}

const u = new UserModel({ name: "Alice", age: 30 });
console.log(u.serialize());  // '{"name":"Alice","age":30}'
console.log(u.validate());   // true

const u2 = new UserModel({ name: null, age: 30 });
console.log(u2.validate());  // false
