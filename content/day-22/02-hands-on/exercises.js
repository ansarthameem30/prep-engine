/**
 * Day 22 — Node.js Streams + Buffers
 * Hands-on Exercises
 */

const { Readable, Writable, Transform, pipeline: pipelineCallback } = require('stream');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

// ─────────────────────────────────────────────
// Exercise 1: Readable Stream from large array in chunks
// ─────────────────────────────────────────────

/**
 * Creates a Readable stream from an array, emitting `chunkSize` items at a time.
 * Shows how to implement a custom Readable using the simplified constructor.
 */
function exercise1_readableFromArray() {
  console.log('=== Exercise 1: Custom Readable Stream ===');

  function arrayToStream(arr, chunkSize = 3) {
    let index = 0;
    return new Readable({
      objectMode: true,
      read() {
        if (index >= arr.length) {
          this.push(null); // signal end of stream
          return;
        }
        const chunk = arr.slice(index, index + chunkSize);
        index += chunkSize;
        this.push(chunk); // push array slice as a single object
      }
    });
  }

  const largeArray = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, value: `item_${i + 1}` }));
  const stream = arrayToStream(largeArray, 3);

  let chunkCount = 0;
  stream.on('data', chunk => {
    chunkCount++;
    console.log(`Chunk ${chunkCount}:`, JSON.stringify(chunk));
  });

  stream.on('end', () => {
    console.log(`Total chunks emitted: ${chunkCount}`);
    // Expected: 4 chunks (3,3,3,1 items) — demonstrates memory-efficient chunking
  });
}

exercise1_readableFromArray();


// ─────────────────────────────────────────────
// Exercise 2: Transform Stream — CSV text to JSON objects
// ─────────────────────────────────────────────

function exercise2_csvToJsonTransform() {
  console.log('\n=== Exercise 2: CSV → JSON Transform Stream ===');

  class CSVToJSON extends Transform {
    constructor() {
      super({ objectMode: true }); // downstream gets JS objects
      this.headers = null;
      this.remainder = '';
    }

    _transform(chunk, _encoding, callback) {
      const lines = (this.remainder + chunk.toString()).split('\n');
      this.remainder = lines.pop(); // save incomplete last line

      for (const line of lines) {
        if (!line.trim()) continue;
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

        if (!this.headers) {
          this.headers = values;
        } else {
          const obj = {};
          this.headers.forEach((h, i) => {
            obj[h] = values[i] ?? null;
          });
          this.push(obj);
        }
      }
      callback();
    }

    _flush(callback) {
      if (this.remainder.trim() && this.headers) {
        const values = this.remainder.split(',').map(v => v.trim());
        const obj = {};
        this.headers.forEach((h, i) => { obj[h] = values[i] ?? null; });
        this.push(obj);
      }
      callback();
    }
  }

  // Simulate streaming CSV data in chunks (as if from a network or file)
  const csvData = [
    'name,age,city\n',
    'Alice,30,New York\nBob,25,',
    'London\nCharlie,35,Paris\n'
  ];

  const csvStream = Readable.from(csvData);
  const parser = new CSVToJSON();

  const results = [];
  csvStream.pipe(parser).on('data', obj => {
    results.push(obj);
    console.log('Parsed row:', JSON.stringify(obj));
  }).on('finish', () => {
    console.log(`Total rows parsed: ${results.length}`);
    // Expected: [{name:'Alice',age:'30',city:'New York'}, {name:'Bob',...}, {name:'Charlie',...}]
  });
}

exercise2_csvToJsonTransform();


// ─────────────────────────────────────────────
// Exercise 3: File copy using pipeline() (streaming, no buffer)
// ─────────────────────────────────────────────

async function exercise3_pipelineCopy() {
  console.log('\n=== Exercise 3: File Copy via pipeline() ===');

  const srcPath = path.join(os.tmpdir(), 'stream-test-src.txt');
  const destPath = path.join(os.tmpdir(), 'stream-test-dest.txt');
  const gzipPath = path.join(os.tmpdir(), 'stream-test-dest.txt.gz');

  // Create a source file with 10,000 lines
  const content = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: ${'x'.repeat(50)}`).join('\n');
  fs.writeFileSync(srcPath, content);
  const srcSize = fs.statSync(srcPath).size;

  try {
    // Plain copy via pipeline — handles backpressure automatically
    const plainStart = Date.now();
    await pipeline(
      fs.createReadStream(srcPath, { highWaterMark: 64 * 1024 }),
      fs.createWriteStream(destPath)
    );
    console.log(`Plain copy: ${srcSize} bytes in ${Date.now() - plainStart}ms`);

    // Compressed copy — transform stream in the middle
    const gzipStart = Date.now();
    await pipeline(
      fs.createReadStream(srcPath),
      zlib.createGzip(),            // transform: compresses each chunk
      fs.createWriteStream(gzipPath)
    );
    const gzipSize = fs.statSync(gzipPath).size;
    console.log(`Gzip copy: ${srcSize} → ${gzipSize} bytes (${((1 - gzipSize/srcSize) * 100).toFixed(1)}% compression) in ${Date.now() - gzipStart}ms`);

    // Verify the copy
    const srcMD5 = require('crypto').createHash('md5').update(fs.readFileSync(srcPath)).digest('hex');
    const destMD5 = require('crypto').createHash('md5').update(fs.readFileSync(destPath)).digest('hex');
    console.log(`Copy integrity: ${srcMD5 === destMD5 ? 'PASS' : 'FAIL'}`);

    // Key insight: pipeline() vs pipe():
    // pipeline destroys all streams on error — no memory leaks
    // pipe() leaves upstream running if downstream errors

  } catch (err) {
    console.error('Pipeline error:', err.message);
  } finally {
    [srcPath, destPath, gzipPath].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
  }
}

exercise3_pipelineCopy();


// ─────────────────────────────────────────────
// Exercise 4: HTTP Proxy — stream response from upstream to client
// ─────────────────────────────────────────────

/**
 * Demonstrates the proxy pattern: pipe upstream response stream directly to client response.
 * The response data never fully buffers in the proxy server's memory.
 * This is the core pattern for API gateways, CDN edge workers, and reverse proxies.
 */
function exercise4_httpProxyConcept() {
  console.log('\n=== Exercise 4: HTTP Streaming Proxy Pattern ===');

  const http = require('http');

  // Upstream server: simulates a slow data source
  const upstream = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let i = 0;
    const interval = setInterval(() => {
      res.write(JSON.stringify({ chunk: i++, time: Date.now() }) + '\n');
      if (i >= 5) {
        clearInterval(interval);
        res.end();
      }
    }, 50);
  });

  // Proxy server: streams upstream response to client WITHOUT buffering
  const proxy = http.createServer((clientReq, clientRes) => {
    const upstreamReq = http.request({
      hostname: 'localhost',
      port: 3031,
      path: '/',
      method: 'GET'
    }, upstreamRes => {
      // Forward headers
      clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);

      // STREAM: pipe upstream response directly to client
      // Memory used = one chunk at a time, not the full response
      upstreamRes.pipe(clientRes);

      // Without streaming (BAD pattern):
      // let data = '';
      // upstreamRes.on('data', chunk => data += chunk);
      // upstreamRes.on('end', () => clientRes.end(data));
    });
    upstreamReq.on('error', err => clientRes.destroy(err));
    upstreamReq.end();
  });

  upstream.listen(3031, () => {
    proxy.listen(3032, () => {
      console.log('Upstream on :3031, Proxy on :3032');

      // Test: hit the proxy and collect streamed chunks
      const chunks = [];
      http.get('http://localhost:3032', res => {
        res.on('data', chunk => chunks.push(chunk.toString().trim()));
        res.on('end', () => {
          console.log(`Received ${chunks.length} streamed chunks via proxy:`);
          chunks.forEach(c => console.log(' ', c));
          proxy.close();
          upstream.close();
        });
      });
    });
  });
}

exercise4_httpProxyConcept();


// ─────────────────────────────────────────────
// Exercise 5: Backpressure — write faster than drain, observe drain event
// ─────────────────────────────────────────────

function exercise5_backpressure() {
  console.log('\n=== Exercise 5: Backpressure Demonstration ===');

  // A slow writable: processes each chunk with an artificial delay
  // highWaterMark: 3 means buffer fills after 3 pending chunks
  const slowWritable = new Writable({
    highWaterMark: 3,
    write(chunk, encoding, callback) {
      setTimeout(() => {
        process.stdout.write(`[wrote: ${chunk.toString()}] `);
        callback(); // signal completion — empties buffer slot
      }, 20); // 20ms per chunk simulates slow I/O
    }
  });

  let drainCount = 0;
  slowWritable.on('drain', () => {
    drainCount++;
    console.log(`\n  → drain event fired (#${drainCount})`);
  });

  // Write rapidly — faster than the writable can process
  let writeCount = 0;
  let pauseCount = 0;

  function writeNext() {
    if (writeCount >= 20) {
      slowWritable.end();
      return;
    }

    const data = `item${writeCount++}`;
    const canContinue = slowWritable.write(data);

    if (!canContinue) {
      // Buffer is full — backpressure signal
      pauseCount++;
      console.log(`\n  ← backpressure (pause #${pauseCount}), wrote ${writeCount} items`);
      slowWritable.once('drain', writeNext); // resume writing after drain
    } else {
      setImmediate(writeNext); // yield to event loop, then continue
    }
  }

  slowWritable.on('finish', () => {
    console.log(`\nDone! Wrote 20 items, paused ${pauseCount} times, drain fired ${drainCount} times`);
    console.log('Key insight: without handling drain, excess data would buffer in memory');
  });

  writeNext();
}

exercise5_backpressure();
