// Path: /root/begasist/app/api/reservations/by-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getReservation } from "@/lib/db/reservations";
import { getAstraDB } from "@/lib/astra/connection";

function trace(req: NextRequest) {
  const h = (k: string) => req.headers.get(k) || "";
  console.log(
    `[edge] ${req.method} ${new URL(req.url).pathname} host=${h("host")} ip=${h("cf-connecting-ip") || h("x-forwarded-for")} cf-ray=${h("cf-ray")} ua=${h("user-agent")}`
  );
}

export async function HEAD(req: NextRequest) {
  trace(req);
  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  trace(req);
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId") || "";
    const reservationId = searchParams.get("reservationId") || "";
    const debug = searchParams.get("debug") === "1" || searchParams.get("loose") === "1";

    if (!hotelId || !reservationId) {
      return NextResponse.json(
        { ok: false, reason: "missing_params", need: ["hotelId", "reservationId"] },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Camino normal (usa la capa de DB con fallback)
    if (!debug) {
      const reservation = await getReservation(hotelId, reservationId);
      if (!reservation) {
        return NextResponse.json(
          { ok: false, found: false },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json({ ok: true, reservation }, { headers: { "Cache-Control": "no-store" } });
    }

    // ── Modo diagnóstico: probamos múltiples selectores ──────────────────────────
    const col = getAstraDB().collection<any>("reservations");
    const selectors: Array<{ name: string; filter: Record<string, any> }> = [
      { name: "by_compound_id", filter: { _id: `${hotelId}:${reservationId}` } },
      { name: "by_pair_exact", filter: { hotelId, reservationId } },
      { name: "by_reservationId_str", filter: { reservationId: reservationId } },
    ];

    // Intenta también por número si aplica
    const num = Number(reservationId);
    if (Number.isFinite(num)) {
      selectors.push({ name: "by_reservationId_num", filter: { reservationId: num } });
    }

    const results: any[] = [];
    for (const sel of selectors) {
      try {
        const doc = await col.findOne(sel.filter);
        if (doc) {
          results.push({
            selector: sel.name,
            filter: sel.filter,
            _id: doc._id ?? null,
            hotelId: doc.hotelId ?? null,
            reservationId: doc.reservationId ?? null,
            keys: Object.keys(doc).sort(),
            sample: {
              status: doc.status ?? null,
              checkInDate: doc.checkInDate ?? null,
              checkOutDate: doc.checkOutDate ?? null,
              updatedAt: doc.updatedAt ?? null,
            },
          });
        } else {
          results.push({ selector: sel.name, filter: sel.filter, found: false });
        }
      } catch (e: any) {
        results.push({ selector: sel.name, filter: sel.filter, error: String(e?.message || e) });
      }
    }

    const anyHit = results.some((r) => r._id);
    return NextResponse.json(
      { ok: true, debug: true, anyHit, tried: selectors.length, results },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[reservations/by-id] error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
