// Path: /root/begasist/app/api/web/events/route.ts
import { onConversation } from "@/lib/web/eventBus";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId") || "";
  if (!conversationId) {
    return new Response("conversationId required", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = (ev: any) => {
        controller.enqueue(`data: ${JSON.stringify(ev)}\n\n`);
      };
      const off = onConversation(conversationId, enc as any);

      // enviar un “ping”/handshake
      enc({ type: "status", value: "open", timestamp: new Date().toISOString() });

      // limpiar al cerrar
      const cancel = () => {
        off();
        try { controller.close(); } catch {}
      };

      // cierre por desconexión del cliente
      // @ts-ignore
      req.signal?.addEventListener?.("abort", cancel);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // CORS si embebés desde otro origen:
      // "Access-Control-Allow-Origin": "http://localhost:8081",
      // "Access-Control-Allow-Credentials": "true",
    },
  });
}
