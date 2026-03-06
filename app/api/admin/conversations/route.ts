import { NextRequest, NextResponse } from "next/server";
import {
  getConversationsByGuestId,
  getConversationsByHotelAndChannel,
  getConversationById,
  getAllConversationsForHotel,
} from "@/lib/db/conversations";
import { getMessagesByConversation } from "@/lib/db/messages";
import { ALL_CHANNELS, type Channel } from "@/types/channel";

type ConversationSummaryItem = {
  conversationId: string;
  startedAt: string;
  lastUpdatedAt: string;
  lang: string;
  status?: string;
  subject?: string;
  guestId?: string;
  userId?: string;
  channel?: Channel;
  lastMessage?: string;
};

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function pickLatestMessageText(messages: Array<Record<string, unknown>>): string {
  const sorted = [...messages].sort((a, b) => {
    const ta = Date.parse(String(a?.timestamp || a?.createdAt || ""));
    const tb = Date.parse(String(b?.timestamp || b?.createdAt || ""));
    return tb - ta;
  });
  const msg = sorted[0];
  if (!msg) return "";
  const approved = normalizeText(msg.approvedResponse);
  const suggestion = normalizeText(msg.suggestion);
  const content = normalizeText(msg.content);
  return approved || suggestion || content;
}

async function toSummaryItem(conv: any): Promise<ConversationSummaryItem> {
  const msgs = await getMessagesByConversation({
    hotelId: conv.hotelId,
    conversationId: conv.conversationId,
    channel: conv.channel,
    limit: 10,
  });
  return {
    conversationId: conv.conversationId,
    startedAt: conv.startedAt,
    lastUpdatedAt: conv.lastUpdatedAt,
    lang: conv.lang,
    status: conv.status,
    subject: conv.subject ?? "",
    guestId: conv.guestId,
    userId: conv.userId,
    channel: conv.channel,
    lastMessage: pickLatestMessageText(msgs as Array<Record<string, unknown>>),
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hotelId = normalizeText(url.searchParams.get("hotelId")) || "hotel999";
    const guestId = normalizeText(url.searchParams.get("guestId"));
    const conversationId = normalizeText(url.searchParams.get("conversationId"));
    const rawChannel = normalizeText(url.searchParams.get("channel"));
    const channel = ALL_CHANNELS.includes(rawChannel as Channel)
      ? (rawChannel as Channel)
      : undefined;

    if (conversationId) {
      const conv = await getConversationById(conversationId);
      if (!conv || conv.hotelId !== hotelId) {
        return NextResponse.json({ guestId: null, conversations: [] });
      }
      const item = await toSummaryItem(conv);
      return NextResponse.json({
        guestId: item.guestId ?? null,
        conversations: [item],
      });
    }

    if (guestId) {
      const convs = await getConversationsByGuestId({ hotelId, guestId });
      const filtered = channel ? convs.filter((c) => c.channel === channel) : convs;
      const summaries = await Promise.all(filtered.map((c) => toSummaryItem(c)));
      return NextResponse.json({ guestId, conversations: summaries });
    }

    if (channel) {
      const convs = await getConversationsByHotelAndChannel(hotelId, channel);
      const summaries = await Promise.all(convs.map((c) => toSummaryItem(c)));
      return NextResponse.json({ guestId: null, conversations: summaries });
    }

    const allConversations = await getAllConversationsForHotel(hotelId);
    const summaries = await Promise.all(allConversations.map((c) => toSummaryItem(c)));
    return NextResponse.json({ guestId: null, conversations: summaries });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
