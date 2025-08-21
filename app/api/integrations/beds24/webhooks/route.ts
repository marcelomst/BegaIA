// Path: /root/begasist/app/api/integrations/beds24/webhooks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { makeBeds24V2FromEnv } from "@/lib/adapters/beds24_v2";
import { parseBeds24Webhook, buildIdempotencyKey } from "@/lib/integrations/beds24/webhook";
import { handleChannelManagerEvent } from "@/lib/handlers/channelManagerHandler";
import type { ChannelManagerEventDTO, ReservationDTO } from "@/types/externalDTOs";
import type { Channel } from "@/types/channel";
import { redis } from "@/lib/services/redis";

// ---- Idempotencia con Redis (NX + TTL) ----
// ⏱️ Aumento TTL de 5 → 15 minutos
async function wasProcessed(key: string): Promise<boolean> {
  const res = await redis.set(key, "1", "EX", 900, "NX");
  return res !== "OK";
}
async function markProcessed(_key: string) { /* no-op */ }

// ---- Utilidades ----
function mapStatusToEventType(
  status: string | null | undefined
): "reservation_created" | "reservation_modified" | "reservation_cancelled" | "other" {
  const s = (status || "").toLowerCase();
  if (s === "new" || s === "booked" || s === "confirmed") return "reservation_created";
  if (s === "modified" || s === "changed" || s === "updated") return "reservation_modified";
  if (s === "cancelled" || s === "canceled") return "reservation_cancelled";
  return "other";
}

export async function HEAD(_req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
export async function GET(req: NextRequest) { return handleWebhook(req); }
export async function POST(req: NextRequest) { return handleWebhook(req); }

async function handleWebhook(req: NextRequest) {
  try {
    const parsed = await parseBeds24Webhook(req);

    // --- hotelId desde querystring o default/env ---
    const url = new URL(req.url);
    const hotelId = url.searchParams.get("hotelId") || process.env.DEFAULT_HOTEL_ID || "hotel999";

    // --- Seguridad por secreto en la URL (si está configurado) ---
    const expectedSecret = process.env.BEDS24_WEBHOOK_SECRET;
    if (expectedSecret) {
      if (!parsed.providedSecret || parsed.providedSecret !== expectedSecret) {
        return NextResponse.json({ ok: false, reason: "invalid_secret" }, { status: 200 });
      }
    }

    const propId = parsed.propId ?? (process.env.BEDS24_V2_PROPERTY_ID ?? null);

    // ==== Cliente V2 ====
    const v2 = makeBeds24V2FromEnv();

    // 1) Resolver booking
    let booking: any | null = null;
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

    if (!booking && parsed.hintedBookId) {
      return NextResponse.json(
        { ok: false, processed: false, reason: "bookId_not_found", bookId: parsed.hintedBookId, v2: true },
        { status: 200 }
      );
    }

    if (!booking) {
      console.warn("[Beds24 webhook] No booking resolved from API (V2). Parsed:", parsed);
      return NextResponse.json({ ok: true, processed: false, v2: true });
    }

    // 2) Snapshot para trazas
    const snap = {
      bookId: String(booking.id ?? booking.bookingId ?? ""),
      status: String(booking.status ?? parsed.hintedStatus ?? "modified"),
      guest: `${booking.firstName ?? ""} ${booking.lastName ?? ""}`.trim(),
      email: booking.email ?? null,
      arrival: booking.arrival ?? booking.checkIn ?? null,
      departure: booking.departure ?? booking.checkOut ?? null,
      roomId: booking.roomId ?? booking.roomType ?? null,
      lastModified: booking.lastModified ?? booking.modified ?? null,
      createdAt: booking.created ?? booking.bookingDate ?? null,
      propId,
    };

    // 3) Idempotencia
    const numericBookId = Number(snap.bookId);
    const idemKey = buildIdempotencyKey({
      hintedBookId: Number.isFinite(numericBookId) ? numericBookId : undefined,
      hintedStatus: snap.status || null,
      lastModified: snap.lastModified || null,
    });
    if (await wasProcessed(idemKey)) {
      return NextResponse.json({ ok: true, processed: false, dedup: true, bookId: snap.bookId, v2: true });
    }

    // 4) Mapear a evento + DTO de reserva para nuestro handler
    const eventType = mapStatusToEventType(snap.status);
    const eventId = `beds24:${snap.bookId}:${snap.lastModified ?? Date.now()}`;

    const guest =
      (booking.guest ?? null) || {
        guestId: booking.guestId ?? booking.email ?? undefined,
        name: snap.guest || undefined,
        email: booking.email ?? undefined,
        phone: booking.phone ?? undefined,
      };

    const resDTO: ReservationDTO = {
      reservationId: snap.bookId,
      hotelId,
      channel: "channelManager" as Channel,
      guest: guest as any,
      checkIn: snap.arrival ?? "",
      checkOut: snap.departure ?? "",
      roomType: String(snap.roomId ?? ""),
      // 🔧 Mejora: fallback más robusto para ratePlan
      ratePlan: String(
        booking.ratePlanName ??
        booking.ratePlan ??
        booking.rateDescription ??
        ""
      ),
      // mantenemos externo "new/modified/cancelled"; el handler lo convierte a confirmed/...
      status:
        (snap.status === "cancelled"
          ? "cancelled"
          : snap.status === "modified"
          ? "modified"
          : "new") as ReservationDTO["status"],
      bookingTimestamp: snap.createdAt ?? new Date().toISOString(),
      specialRequests: booking.specialRequests ?? booking.notes ?? undefined,
      guestComment: booking.guestComment ?? booking.comments ?? undefined,
      rawPayload: booking,
    };

    const evt: ChannelManagerEventDTO = {
      eventId,
      eventType,
      channel: "channelManager" as Channel,
      reservationId: resDTO.reservationId,
      guestId: (guest as any)?.guestId ?? undefined,
      payload: resDTO,
      receivedAt: new Date().toISOString(),
      processedByHA: false,
    };

    // 5) Enviar al handler (persiste en Astra con upsert)
    const iaReply = await handleChannelManagerEvent(evt, hotelId);

    return NextResponse.json({
      ok: true,
      processed: true,
      v2: true,
      bookId: snap.bookId,
      mappedType: eventType,
      eventId,
      iaReply: iaReply ?? null,
    });
  } catch (err: any) {
    console.error("[Beds24 webhook] error (V2):", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err), v2: true }, { status: 200 });
  }
}
