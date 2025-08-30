// Path: /root/begasist/app/api/web/events/route.ts
import type { NextRequest } from "next/server";
import { onConversation } from "@/lib/web/eventBus";

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
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId") || "";
  if (!conversationId) {
    return new Response("conversationId required", { status: 400, headers: buildCorsHeaders(req) });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Suscripción a eventos de la conversación
      const off = onConversation(conversationId, (ev) => send(ev));

      // Handshake + keepalive
      send({ type: "status", value: "open", timestamp: new Date().toISOString() });
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const cleanup = () => {
        clearInterval(keepAlive);
        off();
        try { controller.close(); } catch {}
      };

      // cierre por desconexión del cliente
      (req as any).signal?.addEventListener?.("abort", cleanup);
    },
  });

  return new Response(stream, { headers: buildCorsHeaders(req) });
}
