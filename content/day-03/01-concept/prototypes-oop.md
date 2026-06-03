# Prototypes, OOP, and `this` Binding

## The Prototype Chain

Every JavaScript object has an internal `[[Prototype]]` link pointing to another object (or `null`). When you access a property on an object, the engine first looks at the object itself. If not found, it follows `[[Prototype]]` to the next object, and continues up the chain until the property is found or the chain ends at `null`.

```js
const obj = { a: 1 };
// obj → Object.prototype → null

console.log(obj.a);            // 1   (own property)
console.log(obj.toString);     // [Function] (found on Object.prototype)
console.log(obj.nonExistent);  // undefined (reached end of chain, not found)
```

The chain for a typical class instance:
```
instance → ClassName.prototype → Object.prototype → null
```

---

## `__proto__` vs `prototype`

| Property | Lives on | Points to | Purpose |
|---|---|---|---|
| `__proto__` | Every object instance | The object's actual prototype | The live `[[Prototype]]` link (accessor property on Object.prototype) |
| `prototype` | Function objects only | The object that will become `[[Prototype]]` of instances created with `new` | Blueprint for instances |

```js
function Dog(name) { this.name = name; }
Dog.prototype.bark = function() { return `${this.name} barks!`; };

const rex = new Dog("Rex");

console.log(rex.__proto__ === Dog.prototype);       // true
console.log(Dog.prototype.__proto__ === Object.prototype); // true
console.log(rex.constructor === Dog);               // true (via Dog.prototype.constructor)

// Don't mutate __proto__ directly — use Object.create or Object.setPrototypeOf
```

---

## The `new` Keyword: 4 Steps

When you call `new Constructor(args)`:

1. **Create** — A new empty object `{}` is created
2. **Link** — The new object's `[[Prototype]]` is set to `Constructor.prototype`
3. **Bind** — `this` inside the constructor refers to the new object
4. **Return** — The constructor's return value is used IF it's an object; otherwise the new object is returned automatically

```js
// Manual implementation of new:
function myNew(Constructor, ...args) {
  // Step 1 + 2: create object and set prototype
  const instance = Object.create(Constructor.prototype);
  // Step 3 + 4: run constructor with this = instance
  const result = Constructor.apply(instance, args);
  // If constructor explicitly returned an object, use it; otherwise use instance
  return result && typeof result === 'object' ? result : instance;
}

function Person(name, age) {
  this.name = name;
  this.age = age;
}

const p1 = new Person("Alice", 30);
const p2 = myNew(Person, "Bob", 25);
console.log(p1.name, p2.name); // Alice Bob
```

---

## ES6 Class Syntax vs Prototype Syntax

ES6 `class` is syntactic sugar over prototypal inheritance. Internally it sets up the same prototype chain.

```js
// Prototype approach
function AnimalProto(name) {
  this.name = name;
}
AnimalProto.prototype.speak = function() {
  return `${this.name} makes a sound.`;
};

// ES6 class (identical under the hood)
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() { // added to Animal.prototype, NOT the instance
    return `${this.name} makes a sound.`;
  }
  static create(name) { return new Animal(name); } // on Animal itself, not prototype
}

const a = new Animal("Cat");
console.log(a.hasOwnProperty("speak")); // false — speak is on prototype, not instance
console.log(a.hasOwnProperty("name"));  // true — name is on instance
```

Key differences that `class` enforces that plain functions don't:
- `class` constructors **must** be called with `new` — calling without `new` throws `TypeError`
- Methods defined in a class body are non-enumerable (won't show up in `for...in`)
- Class bodies are always in strict mode

---

## Inheritance with `Object.create` vs `class extends`

```js
// Object.create approach
function Shape(color) { this.color = color; }
Shape.prototype.getColor = function() { return this.color; };

function Circle(color, radius) {
  Shape.call(this, color);   // "super" — borrow parent constructor
  this.radius = radius;
}
Circle.prototype = Object.create(Shape.prototype); // set up prototype chain
Circle.prototype.constructor = Circle;             // fix constructor reference
Circle.prototype.area = function() { return Math.PI * this.radius ** 2; };

// class extends approach
class ShapeClass {
  constructor(color) { this.color = color; }
  getColor() { return this.color; }
}

class CircleClass extends ShapeClass {
  constructor(color, radius) {
    super(color); // must call super before accessing this
    this.radius = radius;
  }
  area() { return Math.PI * this.radius ** 2; }
}

const c = new CircleClass("red", 5);
console.log(c instanceof CircleClass); // true
console.log(c instanceof ShapeClass);  // true — prototype chain
console.log(c.getColor());             // "red"
```

With `Object.create(Shape.prototype)`, `Circle.prototype` gets an object whose `[[Prototype]]` is `Shape.prototype` — establishing the chain. The critical `Circle.prototype.constructor = Circle` line fixes the constructor property that `Object.create` doesn't automatically set.

---

## `this` Binding: 4 Rules in Priority Order

### Rule 1: `new` Binding (highest priority)
When a function is called with `new`, `this` is the newly created object.

### Rule 2: Explicit Binding — `call`, `apply`, `bind`
Explicitly set `this` to any object.

```js
function greet(greeting) { return `${greeting}, ${this.name}`; }
const user = { name: "Alice" };

greet.call(user, "Hello");          // "Hello, Alice"
greet.apply(user, ["Hello"]);       // "Hello, Alice"
const boundGreet = greet.bind(user);
boundGreet("Hello");                // "Hello, Alice"

// bind creates a new function permanently bound to user
// call/apply invoke immediately
```

### Rule 3: Implicit Binding
When a function is called as a method of an object, `this` is that object.

```js
const person = {
  name: "Bob",
  greet() { return this.name; }
};
person.greet(); // "Bob" — this = person

// Gotcha: method extracted from object loses implicit binding
const fn = person.greet;
fn(); // undefined (or error in strict mode) — this = global/undefined
```

### Rule 4: Default Binding (lowest priority)
In non-strict mode: `this === globalThis` (window in browsers, global in Node).
In strict mode: `this === undefined`.

```js
function standalone() { return this; }
standalone(); // globalThis (non-strict) or undefined (strict)
```

### Arrow Functions: Lexical `this`
Arrow functions do **not** have their own `this`. They inherit `this` from the surrounding lexical scope at definition time. They cannot be bound with `call/apply/bind` (the `this` argument is ignored).

```js
class Timer {
  constructor() { this.count = 0; }

  start() {
    // Regular function: this would be undefined (strict) or global
    // Arrow function: this is the Timer instance (lexical)
    setInterval(() => {
      this.count++;
      console.log(this.count);
    }, 1000);
  }
}
```

---

## Common `this` Gotchas

```js
// Gotcha 1: Method called via callback loses context
const obj = {
  value: 42,
  getValue() { return this.value; }
};
[1].forEach(obj.getValue); // undefined — getValue called without obj as receiver

// Fix: bind or arrow wrapper
[1].forEach(obj.getValue.bind(obj));
[1].forEach(() => obj.getValue());

// Gotcha 2: this in nested regular function
class MyClass {
  constructor() { this.data = [1, 2, 3]; }
  process() {
    this.data.forEach(function(item) {
      console.log(this); // undefined (strict) — NOT the class instance
    });
  }
}

// Gotcha 3: call/apply don't override new binding
function Foo() { this.x = 1; }
const obj2 = { x: 99 };
const instance = new Foo.call(obj2); // TypeError: Foo.call is not a constructor
// new always wins over explicit binding (you'd call new Foo() and .call won't affect it)
```
