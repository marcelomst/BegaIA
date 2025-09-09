// Path: /root/begasist/app/api/conversations/reset-state/route.ts
import { NextResponse } from "next/server";
import { clearConvState } from "@/lib/db/convState";

/**
 * Endpoint admin (QA) para limpiar el estado de una conversación.
 * Seguridad simple: Header "x-admin-key" debe coincidir con ADMIN_API_KEY (env).
 *
 * POST body JSON:
 * {
 *   "hotelId": "hotel999",
 *   "conversationId": "xxxx-xxxx-...."
 * }
 */
export async function POST(req: Request) {
  try {
    const adminKey = process.env.ADMIN_API_KEY || "";
    const hdrKey = req.headers.get("x-admin-key") || "";
    if (adminKey && adminKey !== hdrKey) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { hotelId, conversationId } = await req.json().catch(() => ({}));
    if (!hotelId || !conversationId) {
      return NextResponse.json(
        { ok: false, error: "hotelId y conversationId son obligatorios" },
        { status: 400 }
      );
    }

    await clearConvState(hotelId, conversationId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[reset-state] error:", err?.stack || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
