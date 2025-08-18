// Path: /root/begasist/lib/integrations/beds24/webhook.ts
import type { NextRequest } from "next/server";

export type Beds24WebhookVersion = "v1" | "v2" | "unknown";

export interface ParsedBeds24Webhook {
  version: Beds24WebhookVersion;
  hintedBookId?: number;
  hintedStatus?: string | null;
  propId?: string | null;
  providedSecret?: string | null;
  rawBody?: any;
}

/** Parsea webhook: V1 por query (?bookid&status) o V2 por JSON body. */
export async function parseBeds24Webhook(req: NextRequest): Promise<ParsedBeds24Webhook> {
  const url = new URL(req.url);
  const q = url.searchParams;

  // V1 (query)
  const v1Book = q.get("bookid");
  const v1Status = q.get("status");
  if (v1Book || v1Status) {
    return {
      version: "v1",
      hintedBookId: v1Book ? Number(v1Book) : undefined,
      hintedStatus: v1Status,
      propId: q.get("propid"),
      providedSecret: q.get("secret"),
    };
  }

  // V2 (JSON)
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    // no body o no JSON
  }
  if (body && (body.bookId || body.bookingId || body.id || body.booking)) {
    const booking = body.booking ?? body;
    const rawId = booking.bookId ?? booking.bookingId ?? booking.id;
    return {
      version: "v2",
      hintedBookId: Number(rawId ?? NaN),
      hintedStatus: booking.status ?? null,
      propId: (booking.propid ?? booking.propertyId ?? null)?.toString?.() ?? null,
      providedSecret: q.get("secret"),
      rawBody: booking,
    };
  }

  return { version: "unknown", hintedStatus: null, providedSecret: q.get("secret") };
}

/** Clave idempotente. */
export function buildIdempotencyKey(input: {
  hintedBookId?: number;
  hintedStatus?: string | null;
  lastModified?: string | null;
}): string {
  const bid = input.hintedBookId ? `b:${input.hintedBookId}` : "b:unknown";
  const st = input.hintedStatus ? `s:${input.hintedStatus}` : "s:unknown";
  const lm = input.lastModified ? `m:${input.lastModified}` : "m:unknown";
  return `beds24:${bid}:${st}:${lm}`;
}
