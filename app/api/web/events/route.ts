// Path: /root/begasist/app/api/web/events/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs"; // asegura ReadableStream en dev

// 🔓 Si servís el widget desde otro origen (p.ej. 8081), habilitalo acá:
const ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  // agregá más si hace falta
]);

function buildCorsHeaders(req: NextRequest | Request) {
  const origin = (req.headers as any).get?.("origin") || null;
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

export async function GET(req: NextRequest) {
  return new Response("Guest event streaming is temporarily disabled", {
    status: 403,
    headers: buildCorsHeaders(req),
  });
}
