#!/usr/bin/env bash
# Port-aware, design-agnostic Verilator->WASM build pipeline.
#   Usage: ./build_wasm_any.sh <rtl.v> <top> [outdir]
#   1. verilator --xml-only -> ports; 2. gen_harness.py -> harness+config;
#   3. verilator --cc -O3; 4. emcc -> V<top>.mjs + V<top>.wasm
# Works with Verilator 4.038 (local) and 5.020 (Ubuntu runner).
set -euo pipefail

RTL="${1:?usage: build_wasm_any.sh <rtl.v> <top> [outdir]}"
TOP="${2:?usage: build_wasm_any.sh <rtl.v> <top> [outdir]}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUTDIR="${3:-$HERE}"
VINC="/usr/share/verilator/include"
XDIR="${OUTDIR}/obj_xml_${TOP}"
MDIR="${OUTDIR}/obj_dir_${TOP}_wasm"
OUT="${OUTDIR}/V${TOP}.mjs"

[ -f "$RTL" ] || { echo "RTL not found: $RTL"; exit 1; }
command -v verilator >/dev/null || { echo "verilator not on PATH"; exit 1; }
command -v emcc      >/dev/null || { echo "emcc not on PATH (source emsdk_env.sh)"; exit 1; }
mkdir -p "$OUTDIR"

echo "[1/4] verilator --xml-only (ports of '$TOP') ..."
rm -rf "$XDIR"
verilator --xml-only --top-module "$TOP" "$RTL" --Mdir "$XDIR"
XML="${XDIR}/V${TOP}.xml"
[ -f "$XML" ] || { echo "XML not produced: $XML"; exit 1; }

echo "[2/4] codegen harness + config from ports ..."
python3 "${HERE}/gen_harness.py" "$XML" "$TOP" "$OUTDIR"
HARNESS="${OUTDIR}/sim_main_${TOP}_wasm.cpp"
EXPORTS="$(cat "${OUTDIR}/${TOP}.exports.txt")"
[ -f "$HARNESS" ] || { echo "harness codegen failed"; exit 1; }
echo "      exported funcs: $EXPORTS"

echo "[3/4] verilator --cc -O3 -> C++ model ..."
rm -rf "$MDIR"
verilator --cc -O3 --top-module "$TOP" "$RTL" --Mdir "$MDIR"

# Aggregate EVERY generated TU into one emcc compilation unit. Verilator emits per-class
# files (V<top>.cpp, __Slow, __Syms, ___024root*, __ConstPool*, ...) whose names vary by
# version, so include them ALL (except any __ALL aggregate) to avoid undefined symbols.
ALL="${MDIR}/V${TOP}__ALL_emcc.cpp"
{
  echo "// auto aggregate TU for emcc"
  for f in "$MDIR"/V${TOP}*.cpp; do
    bn="$(basename "$f")"
    case "$bn" in V${TOP}__ALL.cpp|V${TOP}__ALL_emcc.cpp) continue;; esac
    echo "#include \"$bn\""
  done
} > "$ALL"

# Verilator runtime: verilated.cpp only. We do NOT compile verilated_threads.cpp (it needs
# std::thread/-pthread, which would require SharedArrayBuffer+COOP/COEP — unavailable on GitHub
# Pages). Single-threaded models never construct VlThreadPool, so its symbol (referenced in
# 5.x verilated.cpp's lazy thread-pool path but never called) is left undefined and tolerated
# via -sERROR_ON_UNDEFINED_SYMBOLS=0 below.
RT=("${VINC}/verilated.cpp")

echo "[4/4] emcc -> ${OUT} + V${TOP}.wasm ..."
emcc -O3 \
  -I "$MDIR" -I "$VINC" \
  "$ALL" \
  "$HARNESS" \
  "${RT[@]}" \
  -sMODULARIZE -sEXPORT_ES6 -sALLOW_MEMORY_GROWTH \
  -sERROR_ON_UNDEFINED_SYMBOLS=0 \
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap \
  -sEXPORTED_FUNCTIONS="$EXPORTS" \
  -o "$OUT"

echo "Done: ${OUT} ($(stat -c%s "${OUTDIR}/V${TOP}.wasm") bytes wasm); config=${OUTDIR}/${TOP}.config.json"
