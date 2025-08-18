// Path: /root/begasist/app/api/integrations/beds24/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { makeBeds24V2FromEnv } from "@/lib/adapters/beds24_v2";
import { parseBeds24Webhook, buildIdempotencyKey } from "@/lib/integrations/beds24/webhook";

// (Opcional) reemplazar por Redis/Astra para idempotencia real
async function wasProcessed(_key: string): Promise<boolean> { return false; }
async function markProcessed(_key: string): Promise<void> {}

export async function HEAD(_req: NextRequest) {
  // Healthcheck para curl -I; sin validar secret
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  return handleWebhook(req);
}

export async function POST(req: NextRequest) {
  return handleWebhook(req);
}

async function handleWebhook(req: NextRequest) {
  try {
    const parsed = await parseBeds24Webhook(req);

    // --- Seguridad simple por secreto en la URL ---
    const expectedSecret = process.env.BEDS24_WEBHOOK_SECRET;
    if (expectedSecret) {
      if (!parsed.providedSecret || parsed.providedSecret !== expectedSecret) {
        return NextResponse.json({ ok: false, reason: "invalid_secret" }, { status: 200 });
      }
    }

    const propId = parsed.propId ?? (process.env.BEDS24_V2_PROPERTY_ID ?? null);

    // ==== Cliente V2 (único) ====
    const v2 = makeBeds24V2FromEnv();

    // Resolución del booking: por id si viene, sino por modified_since (+ filtro property_id si tenemos)
    let booking: Awaited<ReturnType<typeof v2.getBookingById>> | null = null;

    if (parsed.hintedBookId && !Number.isNaN(parsed.hintedBookId)) {
      booking = await v2.getBookingById(parsed.hintedBookId);
    } else {
      const sinceISO = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const list = await v2.getBookings({
        modified_since: sinceISO,
        property_id: propId ?? undefined,
        limit: 50,
      });
      booking = (propId
        ? list.find((b: any) => String((b?.propertyId ?? "")) === String(propId))
        : list[0]) ?? null;
    }

    if (!booking) {
      console.warn("[Beds24 webhook] No booking resolved from API (V2). Parsed:", parsed);
      return NextResponse.json({ ok: true, processed: false, v2: true });
    }

    // Snapshot normalizado para logs / persistencia
    const snap = {
      bookId: (booking as any).id,
      status: (booking as any).status ?? null,
      guest: `${(booking as any).firstName ?? ""} ${(booking as any).lastName ?? ""}`.trim(),
      email: (booking as any).email ?? null,
      arrival: (booking as any).arrival ?? null,
      departure: (booking as any).departure ?? null,
      roomId: (booking as any).roomId ?? null,
      lastModified: (booking as any).lastModified ?? null,
      propId,
    };

    // Idempotencia
    const idemKey = buildIdempotencyKey({
      hintedBookId: snap.bookId,
      hintedStatus: parsed.hintedStatus ?? null,
      lastModified: snap.lastModified ?? null,
    });

    if (await wasProcessed(idemKey)) {
      return NextResponse.json({ ok: true, processed: false, dedup: true, bookId: snap.bookId, v2: true });
    }

    console.log("[Beds24 webhook] booking snapshot (V2):", snap);

    // TODO: Persistir en AstraDB si aplica
    await markProcessed(idemKey);

    return NextResponse.json({ ok: true, processed: true, bookId: snap.bookId, v2: true });
  } catch (err: any) {
    console.error("[Beds24 webhook] error (V2):", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err), v2: true }, { status: 200 });
  }
}
