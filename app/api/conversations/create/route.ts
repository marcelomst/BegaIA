// /root/begasist/app/api/conversations/create/route.ts
import { NextResponse } from "next/server";
import { createConversation } from "@/lib/db/conversations.ts";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hotelId, channel, guestId } = await request.json();

    if (!hotelId || !channel || !guestId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // You may want to extract lang from the request body or set a default value
    const conversation = await createConversation({
      hotelId,
      channel,
      guestId,
      lang: "en", // Set default or extract from request
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}