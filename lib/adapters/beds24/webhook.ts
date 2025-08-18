// Path: /root/begasist/lib/integrations/beds24/webhook.ts
import type { NextRequest } from "next/server";

export type Beds24WebhookVersion = "v1" | "v2" | "unknown";

export interface ParsedBeds24Webhook {
  version: Beds24WebhookVersion;
  // Lo que venga del webhook
  hintedBookId?: number;          // V1: query ?bookid=... ; V2: body?.bookId
  hintedStatus?: string | null;   // V1: query ?status=... ; V2: body?.status
  propId?: string | null;         // query ?propid=...
  providedSecret?: string | null; // query ?secret=...
  rawBody?: any;                  // V2 body completo cuando viene JSON
}

/** Detecta si es V1 (query) o V2 (JSON con booking). */
export async function parseBeds24Webhook(req: NextRequest): Promise<ParsedBeds24Webhook> {
  const url = new URL(req.url);
  const q = url.searchParams;

  // Intento V1: bookid y status por querystring
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

  // Intento V2: JSON con booking incluido
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    // no hay body o no es JSON
  }
  if (body && (body.bookId || body.bookingId || body.id || body.booking)) {
    const booking = body.booking ?? body;
    const rawId = booking.bookId ?? booking.bookingId ?? booking.id;
    return {
      version: "v2",
      hintedBookId: Number(rawId ?? NaN),
      hintedStatus: booking.status ?? null,
      propId: (booking.propid ?? booking.propertyId ?? null)?.toString?.() ?? null,
      providedSecret: new URL(req.url).searchParams.get("secret"),
      rawBody: booking,
    };
  }

  return { version: "unknown", hintedStatus: null, providedSecret: q.get("secret") };
}

/** Construye una clave idempotente con lo mejor que tengamos. */
export function buildIdempotencyKey(input: {
  hintedBookId?: number;
  hintedStatus?: string | null;
  lastModified?: string | null; // si luego la obtenés de la API
}): string {
  const bid = input.hintedBookId ? `b:${input.hintedBookId}` : "b:unknown";
  const st = input.hintedStatus ? `s:${input.hintedStatus}` : "s:unknown";
  const lm = input.lastModified ? `m:${input.lastModified}` : "m:unknown";
  return `beds24:${bid}:${st}:${lm}`;
}
