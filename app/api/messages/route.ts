// /app/api/messages/route.ts

import { NextResponse } from "next/server";
import {
  getMessagesFromChannel,
  updateMessageInChannel,
} from "@/lib/services/messages";
import { channelHandlers } from "@/lib/services/channelHandlers";
import { parseChannel } from "@/lib/utils/parseChannel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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
      messageId,
      approvedResponse,
      status,
      respondedBy,
      channel: rawChannel,
    } = await req.json();

    const channel = parseChannel(rawChannel);

    if (!messageId || !channel || !(channel in channelHandlers)) {
      return NextResponse.json(
        { error: "Datos inválidos o canal no soportado" },
        { status: 400 }
      );
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

