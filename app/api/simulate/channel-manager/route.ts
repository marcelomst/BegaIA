// Path: /root/begasist/app/api/simulate/channel-manager/route.ts

import { NextResponse } from "next/server";
import type { ChannelManagerEventDTO } from "@/types/externalDTOs";
import { handleChannelManagerEvent } from "@/lib/handlers/channelManagerHandler";
// Importa los tipos de los DTO externos e internos
import type { CMEventType } from "@/types/externalDTOs";
import type { CmEventType } from "@/types/cmEvent";
import { logCmEvent } from "@/lib/db/cmEvents";

// Función de mapeo: traduce el tipo externo al tipo interno
function toCmEventType(external: CMEventType): CmEventType {
  switch (external) {
    case "reservation_created":
      return "newReservation";
    case "reservation_modified":
      return "modification";
    case "reservation_cancelled":
      return "cancellation";
    case "guest_message":
      return "message";
    // Puedes añadir otros casos según amplíes CmEventType
    default:
      return "message";
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const hotelId = searchParams.get("hotelId");
  const immediate = searchParams.get("immediate") ?? "0";

  if (!hotelId) {
    return NextResponse.json(
      { ok: false, error: "hotelId query param missing" },
      { status: 400 }
    );
  }

  const evt = (await req.json()) as ChannelManagerEventDTO;
  console.log("[simulate/channel-manager] ✅ Received event:", evt);

  // 🔹 Registrar el evento en Astra (estado queued o processing según immediate)

const internalType = toCmEventType(evt.eventType as CMEventType);
await logCmEvent({
  eventId: evt.eventId,
  hotelId,
  type: internalType,
  channel: evt.channel,
  reservationId: evt.reservationId,
  guestId: evt.guestId,
  payload: evt.payload,
  status: immediate === "1" ? "processing" : "queued",
  receivedAt: new Date().toISOString(),
});

  try {
    if (immediate === "1") {
      // Modo test inmediato: procesa y devolver IA
      const reply = await handleChannelManagerEvent(evt, hotelId);
      return NextResponse.json({ ok: true, reply, processed: true });
    }

    // Modo normal: encola en Redis para procesamiento asíncrono
    const { redis } = await import("@/lib/services/redis");
    const redisKey = `cm_events:${hotelId}`;
    await redis.rpush(redisKey, JSON.stringify(evt));

    return NextResponse.json({ ok: true, enqueued: true });
  } catch (e) {
    console.error("[simulate/channel-manager] ❌ Error:", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
