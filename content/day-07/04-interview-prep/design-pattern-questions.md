# Day 07 – Design Patterns: Interview Q&A

---

**Q1: What problem does the Observer pattern solve and where does React use it?**

The Observer pattern decouples event producers from event consumers: the subject (emitter) doesn't need to know who is listening, and observers can subscribe and unsubscribe without the subject caring. This enables many-to-one and one-to-many communication. React uses it extensively: `useState` and `useReducer` trigger re-renders by notifying subscribed components (like observers on state change). React Context propagates updates to all consumers. Third-party state managers (Zustand, Redux, Jotai) are explicit Observer implementations — stores emit change events, components re-render on subscription. `useEffect`'s cleanup function is analogous to `unsubscribe`. Node.js's `EventEmitter` (streams, HTTP, child processes) is the canonical Observer implementation.

---

**Q2: How does the Singleton pattern differ from simply exporting a module-level object?**

A module-level export is effectively a Singleton in Node.js because of the module cache — `require("./db")` returns the same cached module object on every call. But the module export approach is implicit and doesn't enforce the constraint. A true Singleton class enforces it explicitly: the constructor checks if an instance already exists and returns it rather than creating a new one. The class approach also supports lazy initialization (instance created on first `getInstance()` call, not at import time), provides a controlled access point, and can be subclassed (though Singletons and inheritance are a bad mix). In practice, for most Node.js use cases, the module cache pattern is sufficient. Use explicit Singleton when you need lifecycle control, configuration injection at first use, or when the codebase is large enough that the intent needs to be unmistakable.

---

**Q3: What is the Decorator pattern and how does it differ from inheritance?**

The Decorator pattern adds behavior to an object at runtime without modifying its class. Instead of subclassing (which statically extends a class), you wrap the object with another object (or function) that intercepts calls and adds behavior. Key differences: (1) Decorators are composable — you can stack multiple decorators (`withAuth(withLogging(withCache(handler)))`), while inheritance forces a fixed hierarchy. (2) Decorators work at the instance level — different instances of the same class can have different behaviors applied. (3) Adding behavior via inheritance requires modifying the class hierarchy; a Decorator wraps without touching the original. Express middleware is the Decorator pattern applied to request handlers. React HOCs (`withRouter`, `connect`) are Decorators applied to components. The Decorator proposal (TC39) enables `@decorator` syntax for class methods.

---

**Q4: When would you choose the Strategy pattern over a `switch` statement?**

A `switch` statement is fine for a small, fixed set of cases. Choose Strategy when: (1) The number of strategies is open-ended or grows frequently — adding a new strategy means adding to a registry, not modifying existing code (Open/Closed Principle). (2) Strategies are complex enough to deserve their own file/class with internal state. (3) The strategy needs to be swapped at runtime based on configuration, user choice, or environment. (4) You want strategies to be testable in isolation. (5) Strategies share the same interface and need to be composable. A real example: payment processing with PayPal, Stripe, Crypto, etc. — the checkout logic is identical, only the payment step varies. With a switch, adding a new payment method means modifying the checkout function. With Strategy, you register a new strategy object and the checkout never changes.

---

**Q5: What is the difference between Factory and Abstract Factory?**

A Factory (factory function or factory method) creates objects of a single type or family, delegating the "which concrete class?" decision to the factory. The caller asks for a product and gets one without knowing the concrete class. An Abstract Factory creates families of related objects. If a Factory creates `Button` objects, an Abstract Factory creates `{ Button, TextField, Modal }` — all styled consistently for a given theme (e.g., MaterialUI vs Windows Classic). The key insight: Abstract Factory groups multiple related factories behind a single interface, ensuring consistency within a family. In React, a theming system is an Abstract Factory — the theme object provides factory functions for all UI primitives, ensuring they're all dark-mode-compatible or all high-contrast. In Node.js, a database adapter could be an Abstract Factory (PostgreSQL adapter provides consistent Connection, Transaction, and QueryBuilder objects).

---

**Q6: How does the Module pattern relate to ES6 native modules?**

The Module pattern (IIFE returning an API object) was a pre-ES6 workaround for JavaScript's lack of native module scope. Variables inside the IIFE are private to it; only the returned object is accessible. ES6 modules achieve the same thing natively: top-level variables in a module are module-scoped (not global), only `export`ed values are accessible externally. ES6 modules are also statically analyzable (tree-shaking works), have a well-defined loading order, support circular references, and integrate with the host environment's module system. The IIFE module pattern is still used in bundled SDK code (a single JS file that doesn't use ES module syntax), but for application code, ES6 modules are strictly better. One behavioral difference: ES6 modules are singletons by definition — the module executes once and its exports are shared across all imports.

---

**Q7: What is the Command pattern and where is it used in modern JS?**

The Command pattern encapsulates an action and its context as an object — separating the initiator from the executor. Each command is a self-contained unit that can be stored, queued, undone, or replayed. Redux is the Command pattern: actions are command objects (`{ type: "INCREMENT", payload: 1 }`), reducers are the executors, and the state history enables undo/redo. Express routing queues handler functions (commands) that process requests in order. The browser's `undo` stack is another example. In a distributed system, an event log (like Kafka) is a sequence of Command objects that can be replayed to rebuild state. The pattern makes operations auditable (you can log every command), reversible (store inverse commands), and serializable (send commands over the wire).

---

**Q8: What design pattern does React Hooks implement?**

React Hooks primarily implement the Observer and Strategy patterns. `useState` and `useReducer` are local Observers — React subscribes the component to state changes and re-renders on notification. `useEffect` is an Observer of dependencies. `useContext` is subscribing to a global Observer (Context). From a Strategy perspective, `useMemo`, `useCallback`, and custom hooks like `useSort(data, strategy)` accept strategy functions that determine behavior. The Composite pattern also appears in React's component tree (components composed of components, each with its own hooks). When discussing hooks in interviews, connect them to the patterns they implement — this demonstrates architectural thinking beyond "I know how to use hooks."
