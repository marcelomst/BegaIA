#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: bash scripts/render-mermaid.sh <input.mmd> <output.svg>"
  exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "No existe el archivo de entrada: $INPUT_FILE"
  exit 1
fi

detect_browser() {
  if command -v google-chrome >/dev/null 2>&1; then
    command -v google-chrome
    return
  fi
  if command -v chromium-browser >/dev/null 2>&1; then
    command -v chromium-browser
    return
  fi
  if command -v chromium >/dev/null 2>&1; then
    command -v chromium
    return
  fi
  return 1
}

BROWSER_PATH="${PUPPETEER_EXECUTABLE_PATH:-}"
if [[ -z "$BROWSER_PATH" ]]; then
  BROWSER_PATH="$(detect_browser || true)"
fi

if [[ -z "$BROWSER_PATH" ]]; then
  echo "No se encontro Chrome/Chromium. Configura PUPPETEER_EXECUTABLE_PATH o instala un navegador compatible."
  exit 1
fi

echo "Usando navegador: $BROWSER_PATH"
BACKGROUND_COLOR="${MERMAID_BACKGROUND_COLOR:-#0b1220}"
PUPPETEER_EXECUTABLE_PATH="$BROWSER_PATH" \
  pnpm dlx @mermaid-js/mermaid-cli -i "$INPUT_FILE" -o "$OUTPUT_FILE" -b "$BACKGROUND_COLOR"

if [[ "$OUTPUT_FILE" == *.svg ]]; then
  perl -0pi -e 's/background-color:\s*white;/background-color: #0b1220;/g' "$OUTPUT_FILE"
  perl -0pi -e 's|<style>|<style>#my-svg{background-color:#0b1220!important;}#my-svg,#my-svg svg{background-color:#0b1220!important;}#my-svg .label,#my-svg .label text,#my-svg .nodeLabel,#my-svg span,#my-svg p,#my-svg .cluster-label text,#my-svg .cluster text,#my-svg foreignObject div{fill:#e5eefc!important;color:#e5eefc!important;}#my-svg .node rect,#my-svg .node circle,#my-svg .node ellipse,#my-svg .node polygon,#my-svg .node path{fill:#162033!important;stroke:#6ea8fe!important;stroke-width:2px!important;}#my-svg .cluster rect{fill:#0f172a!important;stroke:#3b82f6!important;stroke-width:2px!important;}#my-svg .edgePath .path,#my-svg .flowchart-link{stroke:#d7e5ff!important;fill:none!important;stroke-width:2px!important;}#my-svg .marker,#my-svg .marker path,#my-svg .marker circle,#my-svg .arrowMarkerPath,#my-svg .arrowheadPath{stroke:#d7e5ff!important;fill:#d7e5ff!important;stroke-width:2px!important;}#my-svg .edgeLabel,#my-svg .edgeLabel rect,#my-svg .labelBkg{background-color:#0b1220!important;fill:#0b1220!important;opacity:1!important;}|g' "$OUTPUT_FILE"
fi

echo "Render listo: $OUTPUT_FILE"
