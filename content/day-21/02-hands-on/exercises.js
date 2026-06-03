/**
 * Day 21 — Node.js Internals: Event Loop Phases
 * Hands-on Exercises
 */

// ─────────────────────────────────────────────
// Exercise 1: Predict Output Order
// ─────────────────────────────────────────────
/**
 * Before running, predict the output order.
 * The order of execution reflects queue priorities.
 */
function exercise1_eventLoopOrder() {
  console.log('=== Exercise 1: Event Loop Order ===');

  console.log('A: sync start');

  process.nextTick(() => console.log('B: nextTick 1'));
  process.nextTick(() => {
    console.log('C: nextTick 2');
    process.nextTick(() => console.log('D: nextTick 3 (nested)'));
  });

  Promise.resolve().then(() => console.log('E: microtask 1'));
  Promise.resolve().then(() => {
    console.log('F: microtask 2');
    process.nextTick(() => console.log('G: nextTick inside microtask'));
  });

  setTimeout(() => console.log('H: setTimeout 0'), 0);
  setTimeout(() => console.log('I: setTimeout 100'), 100);

  setImmediate(() => console.log('J: setImmediate'));

  console.log('K: sync end');
}

/**
 * Expected output:
 * A: sync start
 * K: sync end
 * B: nextTick 1
 * C: nextTick 2
 * D: nextTick 3 (nested)   ← nextTick added during nextTick still runs before microtasks
 * G: nextTick inside microtask  ← nextTick drains before returning to microtask queue
 * E: microtask 1
 * F: microtask 2
 * H: setTimeout 0
 * J: setImmediate
 * I: setTimeout 100
 *
 * Key insight: nextTick queue fully drains before microtask queue.
 * Within a single "turn", nextTick added inside a microtask runs before the next microtask.
 */
exercise1_eventLoopOrder();


// ─────────────────────────────────────────────
// Exercise 2: Worker Thread — Non-blocking fibonacci(40)
// ─────────────────────────────────────────────
/**
 * fibonacci(40) takes ~1 second synchronously.
 * Without worker threads, this blocks all requests.
 * With workers, the main thread stays responsive.
 *
 * Save to a file: node exercises.js (worker code is inlined via data URI technique)
 */
const { Worker, isMainThread, parentPort, workerData, receiveMessageOnPort, MessageChannel } = require('worker_threads');

function exercise2_workerThreadFib() {
  console.log('\n=== Exercise 2: Worker Thread Fibonacci ===');

  if (!isMainThread) return; // guard for when this file is loaded as a worker

  const workerCode = `
    const { parentPort, workerData } = require('worker_threads');
    function fib(n) {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    }
    const result = fib(workerData.n);
    parentPort.postMessage({ result, n: workerData.n });
  `;

  const worker = new Worker(workerCode, {
    eval: true,
    workerData: { n: 40 }
  });

  const startTime = Date.now();

  // Main thread is NOT blocked — this timer fires normally
  const heartbeat = setInterval(() => {
    process.stdout.write('.');
  }, 10);

  worker.on('message', ({ result, n }) => {
    clearInterval(heartbeat);
    console.log(`\nfib(${n}) = ${result}`);
    console.log(`Worker completed in ${Date.now() - startTime}ms`);
    console.log('Main thread was responsive the entire time (dots above)');
  });

  worker.on('error', err => {
    clearInterval(heartbeat);
    console.error('Worker error:', err);
  });
}

exercise2_workerThreadFib();


// ─────────────────────────────────────────────
// Exercise 3: CPU-Blocking vs Async Equivalent
// ─────────────────────────────────────────────
function exercise3_blockingVsAsync() {
  console.log('\n=== Exercise 3: Blocking vs Async ===');

  // Simulate CPU-bound blocking work
  function blockingSum(n) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += i;
    return sum;
  }

  // Async version: yield control every N iterations using setImmediate
  function asyncSum(n, callback) {
    let sum = 0;
    let i = 0;
    const CHUNK = 1_000_000;

    function processChunk() {
      const end = Math.min(i + CHUNK, n);
      while (i < end) {
        sum += i++;
      }
      if (i < n) {
        setImmediate(processChunk); // yield to event loop between chunks
      } else {
        callback(sum);
      }
    }
    setImmediate(processChunk);
  }

  // Blocking: will hold up any I/O during execution
  const blockStart = Date.now();
  const blockResult = blockingSum(100_000_000);
  console.log(`Blocking sum: ${blockResult} in ${Date.now() - blockStart}ms`);
  console.log('During blocking sum, no I/O callbacks could run');

  // Non-blocking: yields between chunks
  let ioFired = 0;
  const ioInterval = setInterval(() => {
    ioFired++;
  }, 0);

  asyncSum(100_000_000, (result) => {
    clearInterval(ioInterval);
    console.log(`Async sum: ${result}`);
    console.log(`I/O callbacks fired during async sum: ${ioFired} times`);
    console.log('Event loop was NOT blocked');
  });
}

exercise3_blockingVsAsync();


// ─────────────────────────────────────────────
// Exercise 4: setImmediate vs setTimeout inside/outside I/O
// ─────────────────────────────────────────────
function exercise4_immediateVsTimeout() {
  console.log('\n=== Exercise 4: setImmediate vs setTimeout ===');

  // Outside I/O: non-deterministic order
  console.log('--- Outside I/O (non-deterministic) ---');
  setTimeout(() => console.log('setTimeout (outside I/O)'), 0);
  setImmediate(() => console.log('setImmediate (outside I/O)'));
  // Order depends on how long event loop initialization takes

  // Inside I/O callback: setImmediate ALWAYS wins
  const fs = require('fs');
  fs.readFile(process.execPath, () => {
    console.log('\n--- Inside I/O callback (deterministic) ---');
    setTimeout(() => console.log('setTimeout (inside I/O) — always second'), 0);
    setImmediate(() => console.log('setImmediate (inside I/O) — always first'));
    // setImmediate ALWAYS fires before setTimeout here because:
    // We're in the poll phase. Poll completes → check phase (setImmediate) → next iteration timers phase
  });
}

exercise4_immediateVsTimeout();


// ─────────────────────────────────────────────
// Exercise 5: Child Process — spawn with captured output
// ─────────────────────────────────────────────
function exercise5_childProcess() {
  console.log('\n=== Exercise 5: Child Process ===');

  const { spawn, exec, fork } = require('child_process');

  // spawn: stream output, no shell, safe from injection
  const child = spawn('node', ['-e', 'console.log("Child PID:", process.pid)']);

  let output = '';
  child.stdout.on('data', data => {
    output += data.toString();
  });

  child.on('close', code => {
    console.log(`spawn output: ${output.trim()}`);
    console.log(`Exit code: ${code}`);
  });

  // exec: buffered, uses shell — NEVER use with user input (injection risk)
  exec('node -e "console.log(process.version)"', (err, stdout) => {
    if (!err) console.log(`Node version from exec: ${stdout.trim()}`);
  });

  // exec with shell expansion — useful for shell pipelines
  exec('echo "spawn vs exec: use spawn for user-controlled input"', (err, stdout) => {
    if (!err) console.log(stdout.trim());
  });

  console.log(`Main process PID: ${process.pid}`);
  console.log('Notice: child spawns asynchronously — main thread continues immediately');
}

exercise5_childProcess();
