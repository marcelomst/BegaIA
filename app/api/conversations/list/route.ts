// Path: /root/begasist/app/api/conversations/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getConversationsByUser } from "@/lib/db/conversations";

export async function GET(req: NextRequest) {
  try {
    const hotelId = req.nextUrl.searchParams.get("hotelId") || "hotel123";
    const userId = req.nextUrl.searchParams.get("userId") || undefined;
    const guestId = req.nextUrl.searchParams.get("guestId") || undefined;
    const id = userId || guestId;
    if (!id) {
      return NextResponse.json({ conversations: [] });
    }

    const conversations = await getConversationsByUser(hotelId, id);

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        conversationId: c.conversationId,
        startedAt: c.startedAt,
        lastUpdatedAt: c.lastUpdatedAt,
        lang: c.lang,
        status: c.status,
        subject: c.subject ?? "",
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
