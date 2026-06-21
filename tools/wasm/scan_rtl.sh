#!/usr/bin/env bash
# Reject RTL with build/run code-injection or host file I/O before verilate+emcc.
set -euo pipefail
DIR="${1:?usage: scan_rtl.sh <dir>}"
bad=0
scan(){ if grep -rniE "$2" "$DIR" --include='*.v' --include='*.sv' -l >/dev/null 2>&1; then echo "REJECT: $1"; bad=1; fi; }
scan "Verilator inline C (\$c)"        '\$c[a-z]*\s*\('
scan "DPI import/export"               '(import|export)\s+"DPI'
scan "\$system / shell exec"           '\$system\b'
scan "host file write (\$fopen/\$fwrite/\$fdisplay)" '\$f(open|write|display|printf)\b'
scan "memory load from file (\$readmem)"  '\$readmem[bh]\b'
scan "absolute-path \`include"          '`include\s+"/'
if [ "$bad" = 1 ]; then echo "RTL rejected by scan_rtl"; exit 1; fi
echo "scan_rtl: OK"
