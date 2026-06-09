// /app/api/messages/route.ts

import { NextResponse } from "next/server";
import {
  getMessagesFromChannel,
  updateMessageInChannel,
} from "@/lib/services/messages";
import { getMessageById, updateMessageInAstra } from "@/lib/db/messages";
import { channelHandlers } from "@/lib/services/channelHandlers";
import { parseChannel } from "@/lib/utils/parseChannel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { toTwilioWhatsAppAddress, twilioSendWhatsAppMessage } from "@/lib/channels/whatsapp/twilioSendMessage";
import { getGuest } from "@/lib/db/guests";
import { getGuestAliasesByGuestId } from "@/lib/db/guestAliases";
import { deriveGuestReadAliases } from "@/lib/utils/guestReadAliases";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function looksLikeWhatsAppDeliveryAddress(value: unknown): boolean {
  const trimmed = normalizeText(value);
  if (!trimmed) return false;
  const bare = trimmed.toLowerCase().startsWith("whatsapp:")
    ? trimmed.slice("whatsapp:".length).trim()
    : trimmed;
  return /^\+?\d{6,15}$/.test(bare);
}

async function resolveWhatsAppApprovalTo(input: {
  hotelId: string;
  guestId?: string | null;
  requestedTo?: string | null;
  current?: Record<string, any> | null;
}): Promise<string | null> {
  const candidates = new Set<string>();
  const pushCandidate = (value: unknown) => {
    const trimmed = normalizeText(value);
    if (trimmed && looksLikeWhatsAppDeliveryAddress(trimmed)) {
      candidates.add(toTwilioWhatsAppAddress(trimmed));
    }
  };

  pushCandidate(input.requestedTo);
  pushCandidate(input.current?.meta?.channelAddress);
  pushCandidate(input.current?.meta?.senderJid);
  pushCandidate(input.current?.meta?.from);
  pushCandidate(input.current?.sender);
  pushCandidate(input.current?.guestId);

  const guestId = normalizeText(input.guestId);
  if (guestId) {
    const [guest, aliasRows] = await Promise.all([
      getGuest(input.hotelId, guestId).catch(() => null),
      getGuestAliasesByGuestId({ hotelId: input.hotelId, guestId }).catch(() => []),
    ]);
    const aliases = deriveGuestReadAliases(
      guest,
      aliasRows.map((row) => normalizeText(row.alias)).filter(Boolean),
    );
    aliases.forEach(pushCandidate);
  }

  return candidates.values().next().value ?? null;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channelId");
  const channel = parseChannel(rawChannel);

  if (!channel) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }

  const messages = await getMessagesFromChannel(user.hotelId, channel);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const {
      action,
      messageId,
      approvedResponse,
      status,
      respondedBy,
      to,
      channel: rawChannel,
    } = await req.json();

    const channel = parseChannel(rawChannel);

    if (!messageId || !channel || !(channel in channelHandlers)) {
      return NextResponse.json(
        { error: "Datos inválidos o canal no soportado" },
        { status: 400 }
      );
    }

    if (action === "approve_and_send") {
      if (channel !== "whatsapp") {
        return NextResponse.json(
          { error: "approve_and_send solo está soportado para WhatsApp" },
          { status: 400 }
        );
      }

      const current = await getMessageById(messageId);
      if (!current || current.hotelId !== user.hotelId) {
        return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
      }
      if (current.channel !== "whatsapp" || current.status !== "pending") {
        return NextResponse.json(
          { error: "El mensaje no está en estado pendiente de WhatsApp" },
          { status: 400 }
        );
      }

      const textToSend =
        (typeof approvedResponse === "string" && approvedResponse.trim()) ||
        current.approvedResponse ||
        current.suggestion ||
        current.content ||
        "";
      if (!textToSend) {
        return NextResponse.json({ error: "No hay texto para enviar" }, { status: 400 });
      }

      const twilioTo = await resolveWhatsAppApprovalTo({
        hotelId: user.hotelId,
        guestId: current.guestId,
        requestedTo: typeof to === "string" ? to : "",
        current,
      });
      if (!twilioTo) {
        return NextResponse.json(
          { error: "No se pudo resolver destinatario WhatsApp técnico para entrega" },
          { status: 400 },
        );
      }

      try {
        const outbound = await twilioSendWhatsAppMessage({
          hotelId: user.hotelId,
          to: twilioTo,
          body: textToSend,
        });

        await updateMessageInAstra(user.hotelId, messageId, {
          approvedResponse: textToSend,
          status: "sent",
          respondedBy: respondedBy || user.email,
          deliveredAt: new Date().toISOString(),
          meta: {
            ...(current.meta || {}),
            twilioOutboundSid: outbound.sid ?? null,
          },
        });

        return NextResponse.json({ success: true, outboundSid: outbound.sid ?? null });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Twilio send failed",
          },
          { status: 502 },
        );
      }
    }

    const updateResult = await updateMessageInChannel(
      user.hotelId,
      channel,
      messageId,
      {
        ...(approvedResponse && { approvedResponse }),
        ...(status && { status }),
        ...(respondedBy && { respondedBy }),
      }
    );

    if (!updateResult) {
      return NextResponse.json(
        { error: "Mensaje no encontrado o sin cambios" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("⛔ Error en POST /api/messages:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
