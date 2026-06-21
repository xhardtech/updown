#!/usr/bin/env bash
# Port-aware, design-agnostic Verilator->WASM build pipeline.
#
# Usage: ./build_wasm_any.sh <rtl.v> <top> [outdir]
#
# Stages:
#   1. verilator --xml-only --top-module <top> <rtl.v>   -> port list (XML)
#   2. gen_harness.py parses ports, codegens sim_main_<top>_wasm.cpp +
#      <top>.config.json + <top>.exports.txt
#   3. verilator --cc -O3 + emcc -> V<top>.mjs + V<top>.wasm
#
# Requires verilator (4.038 OK) and emcc (source ~/emsdk/emsdk_env.sh) on PATH.
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
command -v emcc      >/dev/null || { echo "emcc not on PATH (source ~/emsdk/emsdk_env.sh)"; exit 1; }
mkdir -p "$OUTDIR"

echo "[1/4] verilator --xml-only (extracting ports of '$TOP') ..."
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

# Verilator 4.038 emits per-class .cpp, no native __ALL.cpp: synthesize an
# aggregate TU so emcc compiles one module source.
ALL="${MDIR}/V${TOP}__ALL.cpp"
if [ ! -f "$ALL" ]; then
  {
    echo "// auto aggregate TU for emcc (Verilator 4.038)"
    for f in "$MDIR"/V${TOP}.cpp "$MDIR"/V${TOP}__Slow.cpp "$MDIR"/V${TOP}__Syms.cpp; do
      [ -f "$f" ] && echo "#include \"$(basename "$f")\""
    done
    # any extra per-class files (e.g. V<top>___024root*.cpp on newer flows)
    for f in "$MDIR"/V${TOP}___*.cpp; do
      [ -e "$f" ] && echo "#include \"$(basename "$f")\""
    done
  } > "$ALL"
fi

echo "[4/4] emcc -> ${OUT} + V${TOP}.wasm ..."
emcc -O3 -D'VL_CPU_RELAX()=' \
  -I "$MDIR" -I "$VINC" \
  "$ALL" \
  "$HARNESS" \
  "${VINC}/verilated.cpp" \
  -sMODULARIZE -sEXPORT_ES6 -sALLOW_MEMORY_GROWTH \
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap \
  -sEXPORTED_FUNCTIONS="$EXPORTS" \
  -o "$OUT"

echo "Done: ${OUT} ($(stat -c%s "${OUTDIR}/V${TOP}.wasm") bytes wasm); config=${OUTDIR}/${TOP}.config.json"
