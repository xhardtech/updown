// Web Worker: runs the Verilator-compiled counter_en RTL sim entirely in the
// browser (WASM, no server). Streams {ctr, cycles_per_sec, cycles} to the page.
// Loaded as a module worker: new Worker('sim.worker.js', { type: 'module' }).
import createModule from './Vcounter_en.mjs';

const Mod = await createModule();
const sim_reset   = Mod.cwrap('sim_reset',   null, []);
const sim_step    = Mod.cwrap('sim_step',    null, ['number']);
const sim_get_ctr = Mod.cwrap('sim_get_ctr', 'number', []);

const BATCH = 20000;
let running = false;
let cycles = 0;
let t0 = 0;

function loop() {
  if (!running) return;
  // Run several batches per animation tick so cycles/sec stays high.
  for (let i = 0; i < 50; i++) {
    sim_step(BATCH);
    cycles += BATCH;
  }
  const ctr = sim_get_ctr();
  const wall = (performance.now() - t0) / 1000;
  const cps = wall > 0 ? cycles / wall : 0;
  postMessage({ type: 'tick', ctr, cycles, cycles_per_sec: cps });
  setTimeout(loop, 0); // yield so the worker stays responsive
}

onmessage = (e) => {
  const cmd = e.data && e.data.cmd;
  if (cmd === 'start') {
    sim_reset();
    cycles = 0;
    t0 = performance.now();
    running = true;
    postMessage({ type: 'started' });
    loop();
  } else if (cmd === 'stop') {
    running = false;
    postMessage({ type: 'stopped' });
  } else if (cmd === 'reset') {
    sim_reset();
    cycles = 0;
    t0 = performance.now();
    postMessage({ type: 'tick', ctr: sim_get_ctr(), cycles: 0, cycles_per_sec: 0 });
  }
};

postMessage({ type: 'ready' });
