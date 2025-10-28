#!/usr/bin/env bash
set -euo pipefail

# Bulk-upload KB .txt files to the admin ingestion API.
# Reads Categoria and PromptKey headers from each file.
# Usage:
#   # Upload a whole directory (recursively):
#   API_BASE=http://localhost:3000 HOTEL_ID=hotel999 UPLOADER="me@example.com" ./scripts/upload-kb-batch.sh docs/kb/amenities
#   # Upload a single file:
#   API_BASE=http://localhost:3000 HOTEL_ID=hotel999 UPLOADER="me@example.com" ./scripts/upload-kb-batch.sh docs/kb/amenities/breakfast_bar.es.txt

API_BASE=${API_BASE:-http://localhost:3000}
HOTEL_ID=${HOTEL_ID:-hotel999}
UPLOADER=${UPLOADER:-anon}
INPUT_PATH=${1:-docs/kb}

if [[ -z "$INPUT_PATH" ]]; then
  echo "[upload-kb-batch] ❌ Missing path argument (directory or .txt file)" >&2
  exit 2
fi

shopt -s nullglob globstar
files=()
if [[ -f "$INPUT_PATH" ]]; then
  # Single file mode
  if [[ "$INPUT_PATH" != *.txt ]]; then
    echo "[upload-kb-batch] ❌ Not a .txt file: $INPUT_PATH" >&2
    exit 2
  fi
  files=( "$INPUT_PATH" )
  echo "[upload-kb-batch] Single file: $(basename "$INPUT_PATH")"
elif [[ -d "$INPUT_PATH" ]]; then
  # Directory mode
  files=( "$INPUT_PATH"/**/*.txt )
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "[upload-kb-batch] ⚠️ No .txt files found under $INPUT_PATH" >&2
    exit 0
  fi
  echo "[upload-kb-batch] Found ${#files[@]} files under $INPUT_PATH"
else
  echo "[upload-kb-batch] ❌ Path does not exist: $INPUT_PATH" >&2
  exit 2
fi

for f in "${files[@]}"; do
  # Extract Categoria and PromptKey (case-insensitive, allow optional spaces)
  categoria=$(grep -i -m1 '^\s*Categoria\s*:' "$f" | sed -E 's/^\s*Categoria\s*:\s*//I') || true
  promptKey=$(grep -i -m1 '^\s*PromptKey\s*:' "$f" | sed -E 's/^\s*PromptKey\s*:\s*//I') || true

  if [[ -z "$categoria" ]]; then
    echo "[upload-kb-batch] ❌ Missing Categoria in $f" >&2
    continue
  fi

  fname=$(basename "$f")
  echo "[upload-kb-batch] → Uploading $fname (category=$categoria, promptKey=${promptKey:-—})"
  # Post using curl -F multipart
  # Note: server must be running and accessible at $API_BASE
  resp=$(curl -sS -X POST \
    -F "file=@$f;type=text/plain" \
    -F "hotelId=$HOTEL_ID" \
    -F "uploader=$UPLOADER" \
    -F "category=$categoria" \
    ${promptKey:+-F "promptKey=$promptKey"} \
    "$API_BASE/api/upload-hotel-document" || true)

  if command -v jq >/dev/null 2>&1; then
    echo "$resp" | jq -r --arg fname "$fname" '.ok as $ok | if $ok then "[OK] \(.version // "v?") - \($fname)" else "[ERR] \($fname): \(.error // .details // .message // .stack // "unknown error")" end' || echo "$resp"
  else
    echo "$resp"
  fi

done

echo "[upload-kb-batch] ✅ Done"
