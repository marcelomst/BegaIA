// /app/api/messages/route.ts

import { NextResponse } from "next/server";
import { webMemory } from "@/lib/services/webMemory";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "Falta channelId" }, { status: 400 });
  }

  switch (channelId) {
    case "web":
      console.log("📥 GET /api/messages → Canal web");
      return NextResponse.json({ messages: webMemory.getMessages() });

    // case "whatsapp":
    //   return NextResponse.json({ messages: whatsappMemory.getMessages() });
    // case "email":
    //   return NextResponse.json({ messages: emailMemory.getMessages() });
    // case "channelManager":
    //   return NextResponse.json({ messages: channelManagerMemory.getMessages() });

    default:
      return NextResponse.json({ error: "Canal no soportado" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, approvedResponse, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Falta ID de mensaje" }, { status: 400 });
    }

    const updated = webMemory.updateMessage(id, {
      ...(approvedResponse && { approvedResponse }),
      ...(status && { status }),
      ...(approvedResponse && { edited: true }), // marca como editado si hay nueva respuesta
    });

    if (!updated) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("⛔ Error en POST /api/messages:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
