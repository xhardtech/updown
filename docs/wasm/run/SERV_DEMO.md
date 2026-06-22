# SERV — the flagship "link a GitHub repo → run the design" demo

**Live:** [`runner.html?top=serv_blink&base=/wasm/run/serv`](./runner.html?top=serv_blink&base=/wasm/run/serv)

SERV is the famous *smallest* RISC-V CPU (a bit-serial RV32I core by Olof
Kindgren). On the demo page it boots a real program from ROM and stores a
counter to a GPIO; you watch `gpio[31:0]` count up at ~12.5M cycles/sec — an
actual CPU executing instructions, running entirely in your browser via
WebAssembly, with no server in the loop.

It is the headline because it proves the whole pitch end-to-end: a non-trivial,
**multi-file**, real open-source design (21 Verilog files + an assembled
program) goes through the *same* Verilator→WASM pipeline that any linked GitHub
repo uses, and the result runs client-side.

---

## How it demonstrates "user links a GitHub repo, then runs it"

The pipeline that produced the published artifact is the same one the public
flow exposes. Two entry points:

1. **Homepage form** (`docs/index.html`) — a user pastes a repo + top module and
   submits. (The "Run" submit currently queues a job; the WASM build path is the
   GitHub Action below.)
2. **GitHub Action** `build-wasm.yml` — the build engine. It can be triggered by
   `workflow_dispatch` (Actions UI) or a `repository_dispatch` of type
   `build-wasm`. It:
   1. clones the repo (`git clone --depth 1`, no submodules, into an ephemeral
      sandboxed runner),
   2. runs `tools/wasm/scan_rtl.sh` (untrusted-RTL security scan),
   3. resolves the **source set** (single `.v`, a `srcdir` of `*.v/*.sv`, or a
      `.f` filelist),
   4. builds with `tools/wasm/build_wasm_any.sh` (Verilator `--xml-only` →
      `gen_harness.py` → Verilator `--cc -O3` → `emcc`), auto-embedding any
      `$readmemh` ROM hex into the wasm FS,
   5. publishes `docs/wasm/run/<top>/` to Pages and prints the live URL.

So "link a repo → run" is literally: give the Action a repo URL + a top + (for a
multi-file design) a `srcdir` or `filelist`, and the published page at
`runner.html?top=<top>&base=/wasm/run/<top>` runs it.

### Triggering it against the **real upstream SERV**

```
# Actions → build-wasm → Run workflow, with inputs:
repo     = https://github.com/olofk/serv
top      = <your top module>
srcdir   = rtl          # all of olofk/serv's rtl/*.v compiled together (multi-file)
hex      = <program>.hex # the program ROM your top loads via $readmemh
```

…or via the API:

```bash
gh workflow run build-wasm.yml \
  -f repo=https://github.com/olofk/serv \
  -f top=<your top> \
  -f srcdir=rtl \
  -f hex=<program>.hex
```

### What a real upstream-SERV clone needs (vs. our wrapper)

`olofk/serv` ships **only the CPU core + the `servile` wrapper** under `rtl/`. It
deliberately does **not** ship a synthesizable SoC top with a clock/reset and a
visible output, nor a program. To turn a clone into something that *runs and
shows motion*, two things must exist in the repo you point the Action at:

| Need | Upstream `olofk/serv` | Our demo provides |
|------|-----------------------|-------------------|
| A **top** with `clk`/`rst` and an **output port** | ✗ (core has Wishbone buses, no GPIO) | `serv_blink_wasm.v` → top `serv_blink`, GPIO captures the 32-bit store word into `gpio[31:0]` |
| A **register-file SRAM** instance | ✗ (interface only) | `serv_rf_ram` instantiated in the wrapper |
| A **program ROM** | ✗ | `$readmemh("count32.hex")` (32-word ROM) |
| A **program** | ✗ | `count.S` → `count32.hex` (RV32I store-in-delay-loop) |

Our wrapper + program are the *minimum* glue to make SERV observable in the
generic port-driven runner. A user pointing the Action at a fork of `olofk/serv`
would add the same two pieces (a top wrapper with an output port + a program
hex), set `srcdir=rtl` (plus the wrapper) and `top=`/`hex=`, and get the same
result.

> The currently-published artifact was built **locally** via the trusted pipeline
> (`build_wasm_any.sh` directly), not through the untrusted-CI clone path. One CI
> caveat: `scan_rtl.sh` still statically rejects `$fwrite`, which appears inside a
> dead `generate if(sim)` block in `servile_mux.v` (`sim` defaults to `0` and is
> never set here). Pushing SERV through the *untrusted* CI clone path would need a
> generate-aware exception in the scanner; the `$readmemh` reject was already
> narrowed to allow bare basenames so memory-init works.

---

## The source set

`/root/efpga_vu19p/fabric/serv_big/user_design/serv_wasm.f` lists the 21 files
(SERV core + `servile` wrapper + our `serv_blink_wasm.v` top). The program ROM
`count32.hex` is auto-detected from the `$readmemh("count32.hex")` literal and
embedded into the wasm filesystem at boot, so the `initial $readmemh` sees it.

Build command that produced the published files:

```bash
source ~/emsdk/emsdk_env.sh
bash tools/wasm/build_wasm_any.sh \
  /root/efpga_vu19p/fabric/serv_big/user_design/serv_wasm.f \
  serv_blink \
  docs/wasm/run/serv
```

Published artifacts (in `docs/wasm/run/serv/`): `Vserv_blink.mjs`,
`Vserv_blink.wasm`, `serv_blink.config.json`, plus `NOTICE.txt`.

---

## License & attribution

SERV is open source by **Olof Kindgren**. Upstream `olofk/serv` declares **ISC**
at the repo level; the core files carry `SPDX-License-Identifier: ISC` and the
newer `servile` wrapper files carry `Apache-2.0`. **Both are permissive and
permit redistribution + hosting of this compiled artifact** with attribution and
preserved license notices. See [`serv/NOTICE.txt`](./serv/NOTICE.txt) for the
full attribution, per-file license breakdown, and the redistribution rationale.

Our additions (`serv_blink_wasm.v`, `count.S`/`count32.hex`) are demo glue
authored for this site; they contain no upstream SERV code.
