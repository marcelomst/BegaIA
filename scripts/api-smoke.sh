#!/usr/bin/env bash
set -euo pipefail

HOTEL_ID="${HOTEL_ID:-hotel999}"

echo "[api:smoke] Listado de documentos (${HOTEL_ID})"
curl -s "http://localhost:3000/api/hotel-documents?hotelId=${HOTEL_ID}" \
  | jq '.docs[] | {name, language, version}'

echo "\n[api:smoke] Detalle primer documento (piscina_v3.md)"
curl -s "http://localhost:3000/api/hotel-document-details?hotelId=${HOTEL_ID}&originalName=piscina_v3.md&version=v3" \
  | jq '.chunks[0] | {targetLang, text: (.text | tostring)[0:120]}'

echo "\n[api:smoke] ✅ OK"
