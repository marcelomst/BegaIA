// Path: app/api/guest/web/history/route.ts

import { NextResponse } from "next/server";
import {
  authorizeGuestConversation,
  guestCapabilityErrorResponse,
} from "@/lib/auth/guestConversationCapability";
import { getMessagesByConversationService } from "@/lib/services/messages";
import type { MessageDoc } from "@/lib/db/messages";

function visibleRole(message: MessageDoc): "user" | "assistant" | null {
  if (message.role === "system") return null;
  if (message.role === "user" || message.direction === "in" || message.sender === "guest") return "user";
  if (message.role === "ai" || message.direction === "out" || message.sender === "assistant") return "assistant";
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function visibleText(value: unknown, max = 500): string | undefined {
  return typeof value === "string" && value ? value.slice(0, max) : undefined;
}

function visibleUrl(value: unknown): string | undefined {
  const url = visibleText(value, 2_000);
  return url && (/^https?:\/\//i.test(url) || url.startsWith("/")) ? url : undefined;
}

function visibleStringArray(value: unknown, maxItems = 8): string[] {
  return Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => visibleText(item)).filter((item): item is string => Boolean(item))
    : [];
}

function visibleRich(value: unknown): Record<string, unknown> | undefined {
  const rich = record(value);
  if (!rich) return undefined;

  if (Array.isArray(rich.carousel)) {
    const carousel = rich.carousel.slice(0, 10).flatMap((rawItem) => {
      const item = record(rawItem);
      if (!item || !Array.isArray(item.images)) return [];
      const images = item.images.slice(0, 6).flatMap((rawImage) => {
        const image = record(rawImage);
        const url = image && visibleUrl(image.url);
        return url ? [{ url, ...(visibleText(image?.alt) ? { alt: visibleText(image?.alt) } : {}) }] : [];
      });
      return images.length ? [{
        ...(visibleText(item.title) ? { title: visibleText(item.title) } : {}),
        ...(visibleText(item.subtitle) ? { subtitle: visibleText(item.subtitle) } : {}),
        images,
      }] : [];
    });
    return carousel.length ? { carousel } : undefined;
  }

  const type = visibleText(rich.type, 40);
  if (!type) return undefined;
  if (["dates", "guests", "handoff"].includes(type)) return { type };

  const data = record(rich.data);
  if (type === "quick-actions") {
    const actions = visibleStringArray(data?.actions);
    return actions.length ? { type, data: { actions } } : { type };
  }
  if (type === "upsell") {
    const options = visibleStringArray(data?.options);
    return options.length ? { type, data: { options } } : undefined;
  }
  if (type === "room-cards" && Array.isArray(rich.data)) {
    const rooms = rich.data.slice(0, 10).flatMap((rawRoom) => {
      const room = record(rawRoom);
      if (!room) return [];
      const code = visibleText(room.code, 120);
      const name = visibleText(room.name);
      if (!code || !name) return [];
      const price = typeof room.price === "number" && Number.isFinite(room.price) ? room.price : 0;
      return [{
        code,
        name,
        price,
        currency: visibleText(room.currency, 20) ?? "",
        perks: visibleStringArray(room.perks),
        ...(visibleUrl(room.img) ? { img: visibleUrl(room.img) } : {}),
        ...(typeof room.refundable === "boolean" ? { refundable: room.refundable } : {}),
        ...(visibleText(room.icon, 20) ? { icon: visibleText(room.icon, 20) } : {}),
      }];
    });
    return rooms.length ? { type, data: rooms } : undefined;
  }
  if (type === "room-info-img" && Array.isArray(rich.data)) {
    const items = rich.data.slice(0, 10).flatMap((rawItem) => {
      const item = record(rawItem);
      if (!item) return [];
      const images = Array.isArray(item.images)
        ? item.images.slice(0, 6).map(visibleUrl).filter((url): url is string => Boolean(url))
        : [];
      const roomType = visibleText(item.type);
      if (!roomType && !images.length) return [];
      return [{
        ...(roomType ? { type: roomType } : {}),
        ...(visibleText(item.icon, 20) ? { icon: visibleText(item.icon, 20) } : {}),
        highlights: visibleStringArray(item.highlights, 6),
        images,
      }];
    });
    return items.length ? { type, data: items } : undefined;
  }
  return undefined;
}

function visibleMessages(messages: MessageDoc[]) {
  return messages
    .map((message) => ({ message, role: visibleRole(message) }))
    .filter(({ message, role }) => {
      if (!role) return false;
      if (role === "assistant" && !["sent", "approved", "delivered"].includes(message.status ?? "sent")) {
        return false;
      }
      return true;
    })
    .map(({ message, role }) => {
      const rich = visibleRich(message.rich);
      return {
        messageId: message.messageId,
        role,
        content: role === "assistant"
          ? String(message.approvedResponse ?? message.content ?? "")
          : String(message.content ?? ""),
        timestamp: String(message.timestamp ?? message.createdAt ?? ""),
        status: message.status ?? "sent",
        ...(rich ? { rich } : {}),
      };
    })
    .filter((message) => Boolean(message.content || message.rich))
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
}

export async function GET(req: Request) {
  try {
    const authorization = await authorizeGuestConversation(req, "conversation:read");
    const messages = await getMessagesByConversationService(
      authorization.hotelId,
      "web",
      authorization.conversationId,
    );
    const res = NextResponse.json({
      ok: true,
      hotelId: authorization.hotelId,
      conversationId: authorization.conversationId,
      messages: visibleMessages(messages),
    });
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  } catch (error) {
    return guestCapabilityErrorResponse(error);
  }
}
