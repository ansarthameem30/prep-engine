# Day 22 – Node.js Streams: Readable, Writable, Duplex & Transform | DSA: Recursion

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Stream types, backpressure, pipeline() vs pipe(), stream events |
| Hands-On | 00:40–01:10 | Build a CSV reader with Transform stream + HTTP proxy demo |
| DSA | 01:10–01:25 | Generate Parentheses (#22) + Subsets (#78) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain all 4 stream types with concrete use cases
- [ ] Understand and reproduce the backpressure problem and its fix
- [ ] Use `stream.pipeline()` instead of `pipe()` for production code
- [ ] Solve: Generate Parentheses (#22) using recursion/backtracking
- [ ] Review 5 interview questions for Node.js streams

---

## Concept: Node.js Streams

### What to Study
- **Stream types:** Readable (source — fs.createReadStream, HTTP req), Writable (sink — fs.createWriteStream, HTTP res), Duplex (both — net.Socket, TCP connection), Transform (duplex that transforms data — zlib.createGzip, crypto.createCipher)
- **Backpressure:** When a Writable's internal buffer fills up, `writable.write()` returns `false` — the Readable must pause via `readable.pause()` until the Writable emits `'drain'`; failure to handle this causes unbounded memory growth
- **`pipeline()` vs `pipe()`:** `stream.pipeline(src, ...transforms, dest, callback)` automatically handles cleanup/destroy on error for all streams in the chain; `pipe()` does NOT propagate errors and leaks streams on failure — always use `pipeline()` in production
- **Stream events:** Readable: `data`, `end`, `error`, `readable`; Writable: `drain`, `finish`, `error`; Transform: inherits both; use `async/await` with `stream.promises.pipeline()` for cleaner async code

### Key Mental Models
- Streams are about processing data in chunks rather than loading everything into memory — the key mental model is a conveyor belt, not a bucket
- Backpressure is the stream equivalent of TCP flow control — the consumer signals the producer to slow down, preventing memory overflow
- Always compose streams with `pipeline()` — think of it as a managed chain where any link breaking destroys the whole chain gracefully

### Why This Matters in Interviews
Streaming is essential for backend work with large files, real-time data, and HTTP proxies. Senior engineers are expected to know why a naive file-copy with `readFileSync` is wrong for production and how to implement efficient stream composition. Backpressure questions distinguish candidates who've hit real memory issues in production from those who've only read tutorials.

---

## DSA Focus: Recursion – Generate Parentheses & Subsets

- **Problem:** Generate Parentheses (LeetCode #22)
- **Difficulty:** Medium
- **Pattern:** Recursion / Backtracking
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** At each step, you can add `(` if open count < n, and `)` if close count < open count — this constraint prunes all invalid branches without needing to validate afterward

---

## Today's 5 Interview Questions (Flash Review)
1. What is backpressure in Node.js streams and how do you handle it correctly?
2. What is the difference between a Duplex stream and a Transform stream?
3. Why should you use `stream.pipeline()` instead of `pipe()` in production?
4. How would you implement a streaming HTTP proxy that transforms response data?
5. What happens to memory if you ignore the return value of `writable.write()`?

---

## Files in This Folder
- `01-concept/` → Read: Node.js streams docs, backpressure guide, stream.pipeline() API reference
- `02-hands-on/` → Code: csv-transform-stream.js, http-proxy-stream.js, backpressure-demo.js
- `03-dsa/` → DSA: generate-parentheses.js (backtracking), subsets.js (recursion with/without current element)
- `04-interview-prep/` → Full Q&A: 5 questions with detailed answers on streams and backpressure

---

## Success Criteria
- [ ] Can explain backpressure without notes and show the `drain` event pattern
- [ ] Solved Generate Parentheses in < 20 minutes using recursive constraint tracking
- [ ] Confident answering all 5 interview questions
- [ ] Bonus: Implement a streaming gzip compression middleware using Transform streams
