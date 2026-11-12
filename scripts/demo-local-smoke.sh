#!/usr/bin/env bash
# Path: /scripts/demo-local-smoke.sh
set -euo pipefail
umask 077

HOTEL_ID="${HOTEL_ID:-hotel999}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.demo.yml}"
NEXT_URL="${NEXT_URL:-http://127.0.0.1:3000}"
HOTEL_DEMO_URL="${HOTEL_DEMO_URL:-http://127.0.0.1:8081}"
TUNNEL_METRICS_URL="${TUNNEL_METRICS_URL:-http://127.0.0.1:2000/metrics}"
SMOKE_TMPDIR="$(mktemp -d)"
trap 'rm -rf -- "$SMOKE_TMPDIR"' EXIT

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
  status="$(curl -sS -o "$SMOKE_TMPDIR/http-body" -w '%{http_code}' "$url" || true)"
  if [[ "$status" =~ ^[23] ]]; then
    ok "$label ($status)"
    return
  fi
  fail "$label ($status) url=$url"
}

expect_status() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  [[ "$actual" == "$expected" ]] || fail "$label (expected $expected, got $actual)"
  ok "$label ($actual)"
}

echo "[demo:smoke] HOTEL_ID=${HOTEL_ID}"

if docker compose -f "$COMPOSE_FILE" ps redis >/dev/null 2>&1; then
  redis_ping="$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null || true)"
  [[ "$redis_ping" == "PONG" ]] || fail "redis ping"
  ok "redis ping"
else
  fail "redis service not found in $COMPOSE_FILE"
fi

http_check "trusted ingress health" "${NEXT_URL}/__trusted-ingress/health"
http_check "next health through ingress" "${NEXT_URL}/api/health"
http_check "widget embed" "${NEXT_URL}/widget/embed?hotel=${HOTEL_ID}&apiBase=${NEXT_URL}&lang=es&pos=bottom-right&primary=%230ea5e9&langs=es%2Cen%2Cpt"
http_check "widget js" "${NEXT_URL}/widget/begai-chat.js"
http_check "hotel demo" "${HOTEL_DEMO_URL}/"

node -e 'const fs=require("node:fs"); fs.writeFileSync(process.argv[1], JSON.stringify({hotelId:process.argv[2],lang:"es"}))' \
  "$SMOKE_TMPDIR/bootstrap-request.json" "$HOTEL_ID"
bootstrap_status="$(curl -sS -o "$SMOKE_TMPDIR/bootstrap-response.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -X POST "${NEXT_URL}/api/guest/web/bootstrap" \
  --data-binary "@$SMOKE_TMPDIR/bootstrap-request.json" || true)"
expect_status "guest bootstrap through trusted ingress" "$bootstrap_status" "201"

capability="$(node -e 'const d=require(process.argv[1]); if(!d.capability) process.exit(1); process.stdout.write(d.capability)' "$SMOKE_TMPDIR/bootstrap-response.json")" \
  || fail "bootstrap capability extraction"
conversation_id="$(node -e 'const d=require(process.argv[1]); if(!d.conversationId) process.exit(1); process.stdout.write(d.conversationId)' "$SMOKE_TMPDIR/bootstrap-response.json")" \
  || fail "bootstrap conversation extraction"
[[ -n "$capability" && -n "$conversation_id" ]] || fail "bootstrap response contract"
ok "bootstrap capability and conversation extracted without logging credentials"

printf 'header = "Authorization: Bearer %s"\n' "$capability" > "$SMOKE_TMPDIR/guest-auth.curl"

history_unauthorized_status="$(curl -sS -o "$SMOKE_TMPDIR/history-unauthorized.json" -w '%{http_code}' \
  "${NEXT_URL}/api/guest/web/history" || true)"
expect_status "history rejects missing capability" "$history_unauthorized_status" "401"

chat_unauthorized_status="$(curl -sS -o "$SMOKE_TMPDIR/chat-unauthorized.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -X POST "${NEXT_URL}/api/chat" \
  --data '{"query":"Hola","channel":"web","hotelId":"invalid","conversationId":"invalid","messageId":"demo-missing-auth"}' || true)"
expect_status "chat rejects missing capability" "$chat_unauthorized_status" "401"

node -e 'const fs=require("node:fs"); fs.writeFileSync(process.argv[1], JSON.stringify({query:"Hola",channel:"web",hotelId:process.argv[2],conversationId:`${process.argv[3]}-mismatch`,messageId:"demo-binding-mismatch",lang:"es"}))' \
  "$SMOKE_TMPDIR/mismatch-request.json" "$HOTEL_ID" "$conversation_id"
mismatch_status="$(curl -sS -K "$SMOKE_TMPDIR/guest-auth.curl" -o "$SMOKE_TMPDIR/mismatch-response.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -X POST "${NEXT_URL}/api/chat" \
  --data-binary "@$SMOKE_TMPDIR/mismatch-request.json" || true)"
expect_status "chat rejects conversation binding mismatch" "$mismatch_status" "403"

message_id="demo-smoke-$(date +%s)-$$"
node -e 'const fs=require("node:fs"); fs.writeFileSync(process.argv[1], JSON.stringify({query:"Hola",channel:"web",hotelId:process.argv[2],conversationId:process.argv[3],messageId:process.argv[4],lang:"es"}))' \
  "$SMOKE_TMPDIR/chat-request.json" "$HOTEL_ID" "$conversation_id" "$message_id"
chat_status="$(curl -sS -K "$SMOKE_TMPDIR/guest-auth.curl" -o "$SMOKE_TMPDIR/chat-response.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -X POST "${NEXT_URL}/api/chat" \
  --data-binary "@$SMOKE_TMPDIR/chat-request.json" || true)"
[[ "$chat_status" =~ ^20[02]$ ]] || fail "authorized Guest chat (expected 200 or 202, got $chat_status)"
node -e 'const d=require(process.argv[1]); if(d.hotelId!==process.argv[2] || d.conversationId!==process.argv[3]) process.exit(1)' \
  "$SMOKE_TMPDIR/chat-response.json" "$HOTEL_ID" "$conversation_id" \
  || fail "authorized chat binding response"
ok "authorized Guest chat with stable messageId ($chat_status)"

history_status="$(curl -sS -K "$SMOKE_TMPDIR/guest-auth.curl" -o "$SMOKE_TMPDIR/history-response.json" -w '%{http_code}' \
  "${NEXT_URL}/api/guest/web/history" || true)"
expect_status "authorized Guest history" "$history_status" "200"
node -e 'const d=require(process.argv[1]); if(d.hotelId!==process.argv[2] || d.conversationId!==process.argv[3] || !Array.isArray(d.messages)) process.exit(1)' \
  "$SMOKE_TMPDIR/history-response.json" "$HOTEL_ID" "$conversation_id" \
  || fail "authorized history binding response"
ok "Guest history preserves authorized binding"

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
