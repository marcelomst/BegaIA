// /app/api/messages/route.ts

import { NextResponse } from "next/server";
import {
  getMessagesFromChannel,
  updateMessageInChannel,
} from "@/lib/services/messages";
import { channelHandlers } from "@/lib/services/channelHandlers";
import type { Channel } from "@/types/channel";
import { channelMemory } from "@/lib/services/channelMemory";


export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");

  if (!channelId || !(channelId in channelHandlers)) {
    return NextResponse.json({ error: "Canal no soportado o inválido" }, { status: 400 });
  }

  const messages = await getMessagesFromChannel(channelId as Channel);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  try {
    const { id, approvedResponse, status, respondedBy, channelId } = await req.json();

    if (!id || !channelId || !(channelId in channelHandlers)) {
      return NextResponse.json({ error: "Datos inválidos o canal no soportado" }, { status: 400 });
    }

    const updateResult = await updateMessageInChannel(channelId as Channel, id, {
      ...(approvedResponse && { approvedResponse }),
      ...(status && { status }),
      ...(respondedBy && { respondedBy }),
    });

    if (updateResult === undefined || updateResult === null) {
      return NextResponse.json({ error: "Mensaje no encontrado o sin cambios" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("⛔ Error en POST /api/messages:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
