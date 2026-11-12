// Path: app/api/guest/web/bootstrap/route.ts

import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  assertGuestCapabilityConfigured,
  createGuestWebGrant,
  issueGuestConversationCapability,
} from "@/lib/auth/guestConversationCapability";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { createConversation, getConversationById } from "@/lib/db/conversations";
import { resolveGuestIdentity } from "@/lib/pipeline/resolveGuestIdentity";
import {
  enforceGuestBootstrapRateLimit,
  GuestBootstrapRateLimitError,
} from "@/lib/security/guestBootstrapRateLimit";

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function response(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const hotelId = text(body.hotelId, 120);
  const lang = text(body.lang, 12) || "es";
  if (!hotelId || hotelId.includes(":")) {
    return response({ ok: false, error: "Invalid hotel" }, { status: 400 });
  }

  try {
    assertGuestCapabilityConfigured();
    const hotel = await getHotelConfig(hotelId).catch(() => null);
    if (!hotel || hotel.hotelId !== hotelId || hotel.channelConfigs?.web?.enabled !== true) {
      return response({ ok: false, error: "Web chat is unavailable" }, { status: 404 });
    }
    await enforceGuestBootstrapRateLimit(req, hotelId);

    const webSubject = `ws_${crypto.randomUUID()}`;
    const resolved = await resolveGuestIdentity({ hotelId, channel: "web", rawGuestId: webSubject });
    const guestId = String(resolved.guestId ?? "").trim();
    if (!guestId) throw new Error("guest identity was not persisted");

    const conversationId = `conv-${crypto.randomUUID()}`;
    const jti = crypto.randomUUID();
    const grant = createGuestWebGrant({ webSubject, jti });
    const created = await createConversation({
      hotelId,
      conversationId,
      channel: "web",
      lang,
      guestId,
      status: "active",
      metadata: { guestWebGrant: grant },
    });
    const persisted = await getConversationById(hotelId, created.conversationId);
    if (
      !persisted ||
      persisted.conversationId !== conversationId ||
      persisted.hotelId !== hotelId ||
      persisted.channel !== "web" ||
      persisted.guestId !== guestId ||
      persisted.metadata?.guestWebGrant?.jtiHash !== grant.jtiHash
    ) {
      throw new Error("guest conversation persistence was not confirmed");
    }
    const capability = await issueGuestConversationCapability({
      hotelId,
      conversationId: persisted.conversationId,
      jti,
      grant,
    });

    return response({
      ok: true,
      capability,
      conversationId: persisted.conversationId,
      hotelId,
      channel: "web",
      expiresAt: grant.expiresAt,
      mode: hotel.channelConfigs.web.mode,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof GuestBootstrapRateLimitError) {
      return response({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    if (error && typeof error === "object" && "status" in error && "code" in error) {
      const known = error as { status: number; code: string; message?: string };
      return response(
        { ok: false, error: known.message || "Guest conversation bootstrap failed", code: known.code },
        { status: known.status },
      );
    }
    return response({ ok: false, error: "Guest conversation bootstrap failed" }, { status: 500 });
  }
}
