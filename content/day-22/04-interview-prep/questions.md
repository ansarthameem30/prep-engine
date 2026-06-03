# Day 22 — Node.js Streams + Buffers: Interview Q&A

---

**Q1. Why would you use streams instead of reading a file with `fs.readFile`?**

`fs.readFile` loads the entire file into memory before your callback fires — a 1GB file means 1GB RAM. Streams process data in chunks (typically 64KB), so memory usage is bounded regardless of file size. Beyond memory: streams enable **time-to-first-byte** improvement because you start processing the first chunk before the last chunk arrives from disk or network. For HTTP responses, you can start sending bytes to the client before you've finished reading the file. In high-throughput systems (log processors, file converters, API proxies), not using streams is the primary cause of OOM crashes under load.

---

**Q2. What is backpressure in Node.js streams, and how is it handled?**

Backpressure is the feedback mechanism from a slow consumer to a fast producer. When a writable stream's internal buffer exceeds `highWaterMark`, `writable.write()` returns `false`. A well-behaved producer pauses itself and listens for the `drain` event, then resumes. Without proper backpressure handling, the producer keeps pushing data into the writable's in-memory buffer — memory grows unbounded and the process eventually OOMs. `pipe()` and `pipeline()` implement backpressure automatically. When implementing custom producers that call `writable.write()` directly, you must check the return value and handle `drain`. The `highWaterMark` for binary streams defaults to 16KB, for object mode streams defaults to 16 objects.

---

**Q3. What is the difference between `pipe()` and `pipeline()`?**

Both connect streams in a chain, but they differ critically in error handling. `pipe()` does NOT propagate errors — if the destination stream errors or is destroyed, the source stream keeps running and leaks memory. Each stream in a `pipe()` chain needs its own `.on('error', ...)` handler. `pipeline()` (from `require('stream/promises')`) destroys **all** streams in the chain if any one of them errors, then rejects the returned Promise. It also accepts async generators as stages. Since Node 10, `pipeline` is the correct choice for any production stream chain. The only case to prefer `pipe()` is when you're manually managing stream lifecycles, which is rare.

---

**Q4. What is the difference between a Duplex and a Transform stream?**

A **Duplex** stream is both readable and writable, but the two sides are **independent** — what you write in has no inherent relationship to what you read out. A TCP socket is duplex: you write request data and read response data, but the two streams are separate channels. A **Transform** stream is a special duplex where the output is derived from the input — data written into it is transformed and becomes available to read. The `_transform(chunk, encoding, callback)` method defines this transformation. Examples: `zlib.createGzip()` compresses input → compressed output; a CSV parser converts raw bytes → JSON objects. The key distinction: in Transform, `_transform` must eventually call `this.push()` to move data to the readable side.

---

**Q5. What is `Buffer.allocUnsafe` vs `Buffer.alloc`, and when should each be used?**

`Buffer.alloc(size)` allocates memory and **zero-fills** it before returning — safe to read any byte, but slower due to the memset operation. `Buffer.allocUnsafe(size)` allocates memory **without zeroing** — it may contain sensitive data from previously freed memory (old passwords, keys, user data). It's faster by ~3x for large buffers. Use `allocUnsafe` only when you **immediately overwrite every byte** before reading. Using `allocUnsafe` and then reading before fully writing is a security vulnerability — you could leak previous process memory to clients. For most cases, use `Buffer.alloc`. For performance-critical buffer pools where you control all writes, `allocUnsafe` is appropriate.

---

**Q6. Explain object mode streams and when you'd use them.**

By default, streams work with `Buffer` and `string` data, enforcing byte-level `highWaterMark` limits. Object mode (`{ objectMode: true }`) allows any JavaScript value to flow through — plain objects, arrays, numbers, whatever. The `highWaterMark` then counts objects instead of bytes (default: 16 objects). Object mode is essential when building data processing pipelines that deal with structured data — a database query result stream emitting row objects, a CSV parser emitting parsed row objects, a JSON transformation pipeline. You cannot mix object mode and binary mode without a boundary Transform stream. Object mode streams don't enforce memory limits as strictly — a stream of large objects can accumulate significant memory if the consumer is slow, so backpressure is even more important.

---

**Q7. How would you implement a streaming file upload to S3 without loading the file into memory?**

Use `multer` with `disableMultipart: false` or `busboy` to parse the `multipart/form-data` request as a stream, then pipe the file stream directly to S3 via the AWS SDK's `upload` method with a `Body` that is a stream. The pattern: `req.pipe(busboy)` → `busboy.on('file', (field, fileStream) => s3.upload({ Body: fileStream }).promise())`. The file bytes flow from the network socket → request body parser → S3 multipart upload without ever accumulating in a buffer. Memory stays at ~64KB per concurrent upload. The alternative (buffer the file in `multer`'s memory storage, then send to S3) uses memory proportional to file size times concurrent uploads — catastrophic for a video upload endpoint.

---

**Q8. What is the difference between `utf8`, `base64`, and `hex` Buffer encodings, and when would you use each?**

`utf8` encodes Unicode text — each character is 1-4 bytes. Use it for all human-readable text: JSON, HTML, plain text. `base64` encodes binary data as ASCII text using 64 characters — every 3 bytes become 4 ASCII chars, 33% size overhead. Use it when you need to embed binary data in text formats (JSON, XML, email, data URIs). `hex` encodes each byte as two hexadecimal digits — every 1 byte becomes 2 chars, 100% size overhead. Use it for cryptographic outputs (hashes, HMAC signatures), debugging binary data, or generating unique identifiers. In practice: file contents use `utf8`, JWT/crypto payloads use `base64url`, SHA256 hashes in logs use `hex`.
