# Node.js Streams + Buffers

## Why Streams Exist

The naive approach to reading a file: `fs.readFileSync` or `fs.readFile` loads the entire file into memory before you can process the first byte. For a 4GB log file, that means 4GB RAM allocation. For an HTTP upload of a video, you buffer the entire video before responding.

Streams solve this by processing data in **chunks** as it arrives, maintaining a constant memory footprint regardless of total data size. A 4GB file processed as a stream might only use 64KB of RAM at any moment. This is the fundamental value proposition: **time-to-first-byte latency and bounded memory usage**.

```
Without streams:            With streams:
[disk] ──── 4GB ──→ [RAM] ──→ [process]   Memory: 4GB
[disk] ──→ [64KB] ──→ [process]           Memory: 64KB
                  ↓ (more chunks)
[disk] ──→ [64KB] ──→ [process]
```

---

## 4 Stream Types

**Readable** — produces data. Examples: `fs.createReadStream`, `http.IncomingMessage`, `process.stdin`.

**Writable** — consumes data. Examples: `fs.createWriteStream`, `http.ServerResponse`, `process.stdout`.

**Duplex** — both readable and writable, but the two sides are independent. Example: `net.Socket` (a TCP socket receives and sends simultaneously).

**Transform** — a duplex stream where the output is derived from the input. The most powerful type. Examples: `zlib.createGzip()`, `crypto.createCipher()`, a CSV parser.

---

## Stream Events

```javascript
const readable = fs.createReadStream('file.txt');

readable.on('data', chunk => {
  // chunk is a Buffer by default, or string if encoding is set
  // This fires repeatedly as data flows
});

readable.on('end', () => {
  // All data has been consumed — no more 'data' events
});

readable.on('error', err => {
  // Something went wrong — always handle this
  // Unhandled 'error' event crashes the process
});

const writable = fs.createWriteStream('out.txt');

writable.on('drain', () => {
  // The writable buffer was full, we paused, now it's drained
  // Resume the readable source here
});

writable.on('finish', () => {
  // All data has been flushed — writable.end() was called
});
```

---

## pipe() vs pipeline()

`pipe()` is the classic way to connect streams:

```javascript
readable.pipe(transform).pipe(writable);
```

The problem: if the writable errors, `pipe()` does NOT automatically destroy the readable. You get a memory leak — the readable keeps producing data into a destroyed writable. Error handling with `pipe()` requires attaching error listeners to every stream in the chain.

**`stream.pipeline()`** (Node 10+) is the correct approach:

```javascript
const { pipeline } = require('stream/promises');

await pipeline(
  fs.createReadStream('input.csv'),
  csvTransform,
  gzipTransform,
  fs.createWriteStream('output.csv.gz')
);
// If any stream errors, ALL streams are destroyed and the Promise rejects
```

With `pipeline`, error propagation is automatic. Every stream in the chain gets properly destroyed (preventing memory leaks). It also supports async generators as stages, which is very ergonomic.

---

## Backpressure

Backpressure is the mechanism by which a slow consumer tells a fast producer to slow down. Without it, data buffers accumulate in memory until the process crashes with OOM.

**The flow:**
1. `writable.write(chunk)` returns `false` when the internal buffer exceeds `highWaterMark`
2. The producer should stop calling `write()` and wait for the `drain` event
3. When the buffer empties below `highWaterMark`, `drain` fires
4. Producer resumes writing

```javascript
function copy(readable, writable) {
  readable.on('data', chunk => {
    const canContinue = writable.write(chunk);
    if (!canContinue) {
      readable.pause(); // stop producing
      writable.once('drain', () => readable.resume()); // resume on drain
    }
  });
  readable.on('end', () => writable.end());
}
```

`pipe()` and `pipeline()` handle backpressure automatically — this is their core value. When you implement a custom Readable, return `false` from `_read()` when you want to signal the consumer to slow down.

**highWaterMark**: default 16KB for binary streams, 16 objects for object mode. This controls how much data can buffer before backpressure kicks in.

---

## Transform Stream Example: CSV Parser

```javascript
const { Transform } = require('stream');

class CSVParser extends Transform {
  constructor() {
    super({ objectMode: true }); // output JavaScript objects, not Buffers
    this.headers = null;
    this.remainder = '';
  }

  _transform(chunk, encoding, callback) {
    const text = this.remainder + chunk.toString();
    const lines = text.split('\n');
    this.remainder = lines.pop(); // last incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      const values = line.split(',').map(v => v.trim());
      if (!this.headers) {
        this.headers = values;
      } else {
        const obj = Object.fromEntries(this.headers.map((h, i) => [h, values[i]]));
        this.push(obj); // emit each row as an object downstream
      }
    }
    callback(); // signal: ready for more data
  }

  _flush(callback) {
    // Handle any remaining data after all input is consumed
    if (this.remainder.trim() && this.headers) {
      const values = this.remainder.split(',').map(v => v.trim());
      const obj = Object.fromEntries(this.headers.map((h, i) => [h, values[i]]));
      this.push(obj);
    }
    callback();
  }
}
```

---

## Object Mode Streams

By default, streams work with Buffers and strings. **Object mode** allows any JavaScript value to flow through the stream:

```javascript
const objectStream = new Transform({
  objectMode: true,
  transform(obj, encoding, callback) {
    // obj is a plain JS object, not a Buffer
    this.push({ ...obj, processed: true });
    callback();
  }
});
```

Object mode streams don't enforce buffer size limits the same way binary streams do — `highWaterMark` counts objects, not bytes. Be careful about accumulating large objects.

---

## Async Generators + pipeline (Node 12+)

The cleanest modern pattern uses async generators:

```javascript
async function* readLines(filePath) {
  const readable = fs.createReadStream(filePath, { encoding: 'utf8' });
  let remainder = '';
  for await (const chunk of readable) {
    const lines = (remainder + chunk).split('\n');
    remainder = lines.pop();
    yield* lines;
  }
  if (remainder) yield remainder;
}

async function* transform(source) {
  for await (const line of source) {
    yield JSON.parse(line); // NDJSON parser
  }
}

const { pipeline } = require('stream/promises');
await pipeline(
  readLines('data.ndjson'),
  transform,
  async function* (source) {
    for await (const obj of source) {
      await db.insert(obj); // consume to DB
    }
  }
);
```

---

## Buffer: What It Is and Why It Exists

JavaScript strings are UTF-16 encoded Unicode. But binary data (network packets, file contents, crypto outputs) has no concept of "characters" — it's just bytes. `Buffer` is Node.js's class for working with raw binary data.

```javascript
// Create a Buffer
const buf1 = Buffer.from('hello', 'utf8');   // from string
const buf2 = Buffer.alloc(10);               // zero-filled 10 bytes
const buf3 = Buffer.allocUnsafe(10);         // uninitialized (fast, but contains garbage)

// Encoding conversions
const hex = buf1.toString('hex');        // '68656c6c6f'
const b64 = buf1.toString('base64');     // 'aGVsbG8='
const utf8 = Buffer.from(b64, 'base64').toString('utf8'); // 'hello'

// Buffer is a subclass of Uint8Array
console.log(buf1 instanceof Uint8Array); // true
console.log(buf1[0]); // 104 ('h' in ASCII)
```

`Buffer.allocUnsafe` is faster because it skips zeroing the memory — use it only when you immediately overwrite all bytes. Use `Buffer.alloc` when you might read uninitialized bytes.

**Buffer vs Uint8Array**: `Buffer` is Node-specific and has helper methods for encoding/decoding. `Uint8Array` is the web-standard equivalent. In modern Node.js, Buffer extends Uint8Array, so they're interchangeable in most contexts. New code often uses `Uint8Array` for portability with browser-compatible modules.

---

## Real-World Stream Use Cases

**File upload streaming**: Don't buffer the entire upload. Pipe `req` (a Readable) directly to S3's multipart upload or a file stream. The server's memory footprint stays constant regardless of file size.

**HTTP response streaming**: Stream a large database result set directly to the HTTP response instead of collecting all rows then sending. First byte arrives sooner, memory stays bounded.

**Log processing**: Tail a log file with `fs.createReadStream` + `readline`, transform lines into structured events, pipe to Elasticsearch. Handles terabyte log files with megabytes of RAM.

**Video transcoding pipeline**: `ffmpeg` spawned via `child_process.spawn`, stdin piped from S3 download stream, stdout piped to S3 upload stream — the video never fully resides on disk.
