import { NextRequest, NextResponse } from "next/server";
import { getAllConversationsForHotel } from "@/lib/db/conversations";
import { getAstraDB } from "@/lib/astra/connection";

type TraceItem = {
  conversationId: string;
  messageId: string;
  timestamp: string;
  category?: string | null;
  promptKey?: string | null;
  contentVersion?: string | null;
  source?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const hotelId = req.nextUrl.searchParams.get("hotelId") || "hotel999";
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || "500");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, limitParam), 5000)
      : 500;

    const conversations = await getAllConversationsForHotel(hotelId);
    const tracesFromConversations: TraceItem[] = [];

    for (const conv of conversations || []) {
      const history = (conv as any)?.metadata?.responseTraceHistory;
      if (!Array.isArray(history)) continue;
      for (const t of history) {
        if (!t || typeof t !== "object") continue;
        tracesFromConversations.push({
          conversationId: conv.conversationId,
          messageId: String((t as any).messageId || ""),
          timestamp: String((t as any).timestamp || ""),
          category: (t as any).category ?? null,
          promptKey: (t as any).promptKey ?? null,
          contentVersion: (t as any).contentVersion ?? null,
          source: (t as any).source ?? null,
        });
      }
    }

    // Compatibilidad + merge completo: también leemos siempre desde messages.meta.responseTrace
    const db = getAstraDB();
    const msgCol = db.collection("messages");
    const cursor: any = await msgCol.find(
      { hotelId, role: "ai" },
      { limit: Math.max(limit * 3, 500), sort: { timestamp: -1 } }
    );
    const messages = Array.isArray(cursor)
      ? cursor
      : await (cursor?.toArray?.() ?? []);
    const tracesFromMessages: TraceItem[] = [];
    for (const m of messages || []) {
      const rt = (m as any)?.meta?.responseTrace;
      if (!rt || typeof rt !== "object") continue;
      tracesFromMessages.push({
        conversationId: String((m as any)?.conversationId || ""),
        messageId: String((m as any)?.messageId || (m as any)?._id || ""),
        timestamp: String((m as any)?.timestamp || (m as any)?.createdAt || ""),
        category: (rt as any)?.category ?? null,
        promptKey: (rt as any)?.promptKey ?? null,
        contentVersion: (rt as any)?.contentVersion ?? null,
        source: (rt as any)?.source ?? null,
      });
    }

    // Merge + dedupe (prioriza mensajes, luego completa con conversations)
    const merged = new Map<string, TraceItem>();
    const makeKey = (t: TraceItem) =>
      `${t.messageId || ""}::${t.conversationId || ""}::${t.timestamp || ""}`;

    for (const t of tracesFromMessages) merged.set(makeKey(t), t);
    for (const t of tracesFromConversations) {
      const k = makeKey(t);
      if (!merged.has(k)) merged.set(k, t);
    }
    const traces = Array.from(merged.values());

    traces.sort((a, b) =>
      String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
    );

    return NextResponse.json({
      ok: true,
      hotelId,
      count: traces.length,
      traces: traces.slice(0, limit),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "trace-history error" },
      { status: 500 }
    );
  }
}
