#!/usr/bin/env bash
# Path: /scripts/demo-local-smoke.sh
set -euo pipefail

HOTEL_ID="${HOTEL_ID:-hotel999}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.demo.yml}"
NEXT_URL="${NEXT_URL:-http://127.0.0.1:3000}"
HOTEL_DEMO_URL="${HOTEL_DEMO_URL:-http://127.0.0.1:8081}"
TUNNEL_METRICS_URL="${TUNNEL_METRICS_URL:-http://127.0.0.1:2000/metrics}"

ok() {
  printf '[demo:smoke] OK   %s\n' "$1"
}

fail() {
  printf '[demo:smoke] FAIL %s\n' "$1" >&2
  exit 1
}

http_check() {
  local label="$1"
  local url="$2"
  local status
  status="$(curl -sS -o /tmp/demo-smoke-body -w '%{http_code}' "$url" || true)"
  if [[ "$status" =~ ^2|3 ]]; then
    ok "$label ($status)"
    return
  fi
  cat /tmp/demo-smoke-body >&2 || true
  fail "$label ($status) url=$url"
}

echo "[demo:smoke] HOTEL_ID=${HOTEL_ID}"

if docker compose -f "$COMPOSE_FILE" ps redis >/dev/null 2>&1; then
  redis_ping="$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null || true)"
  [[ "$redis_ping" == "PONG" ]] || fail "redis ping"
  ok "redis ping"
else
  fail "redis service not found in $COMPOSE_FILE"
fi

http_check "next health" "${NEXT_URL}/api/health"
http_check "widget embed" "${NEXT_URL}/widget/embed?hotel=${HOTEL_ID}&apiBase=${NEXT_URL}&lang=es&pos=bottom-right&primary=%230ea5e9&langs=es%2Cen%2Cpt"
http_check "widget js" "${NEXT_URL}/widget/begai-chat.js"
http_check "hotel demo" "${HOTEL_DEMO_URL}/"

chat_status="$(
  curl -sS -o /tmp/demo-smoke-chat -w '%{http_code}' \
    -H 'content-type: application/json' \
    -X POST "${NEXT_URL}/api/chat" \
    --data "{\"hotelId\":\"${HOTEL_ID}\",\"channel\":\"web\",\"conversationId\":\"demo-smoke-$(date +%s)\",\"guestId\":\"demo-smoke-guest\",\"message\":\"Hola\",\"lang\":\"es\"}" || true
)"
if [[ "$chat_status" =~ ^2 ]]; then
  ok "api chat greeting ($chat_status)"
else
  cat /tmp/demo-smoke-chat >&2 || true
  fail "api chat greeting ($chat_status)"
fi

active_services="$(docker compose -f "$COMPOSE_FILE" ps --services --all 2>/dev/null || true)"

if grep -qx "email-worker" <<<"$active_services"; then
  running_services="$(docker compose -f "$COMPOSE_FILE" ps --services --status running 2>/dev/null || true)"
  if grep -qx "email-worker" <<<"$running_services"; then
    ok "email worker running"
  else
    fail "email worker configured but not running"
  fi
else
  ok "email worker profile not enabled"
fi

if grep -qx "cloudflared" <<<"$active_services"; then
  http_check "cloudflared metrics" "$TUNNEL_METRICS_URL"
else
  ok "cloudflared profile not enabled"
fi

echo "[demo:smoke] done"
