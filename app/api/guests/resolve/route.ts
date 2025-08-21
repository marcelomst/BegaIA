// /root/begasist/app/api/guests/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAstraDB } from "@/lib/astra/connection";

type Guest = any; // usamos el tipo en runtime; si querés, importá desde "@/types/channel"

function normEmail(e?: string | null) {
  return (e || "").trim().toLowerCase();
}

// Normalización MUY básica (si ya viene con +, la dejamos; si empieza en 00 => +; si no, solo dígitos)
function normPhone(p?: string | null) {
  if (!p) return "";
  let s = (p + "").trim();
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  s = s.replace(/\D+/g, "");
  return s ? s : "";
}

function normDoc(d?: string | null) {
  return (d || "").replace(/\s|\.|-/g, "").toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hotelId = url.searchParams.get("hotelId") || "";
    const pmsId   = url.searchParams.get("pmsId") || "";
    const email   = normEmail(url.searchParams.get("email"));
    const phone   = normPhone(url.searchParams.get("phone"));
    const doc     = normDoc(url.searchParams.get("doc"));
    const wa      = url.searchParams.get("wa") || "";      // WhatsApp ID (ej: 598...@c.us)
    const webId   = url.searchParams.get("web_id") || "";  // id del canal web, si aplica

    if (!hotelId) {
      return NextResponse.json({ ok: false, error: "missing_hotelId" }, { status: 400 });
    }

    const db = getAstraDB();
    const col = db.collection<Guest>("guests");

    // 1) Match fuerte por PMS
    if (pmsId) {
      const byPms = await col.findOne({ hotelId, "external.pmsId": pmsId });
      if (byPms) {
        return NextResponse.json({ ok: true, matchType: "pmsId", guest: byPms });
      }
    }

    // 2) Construimos OR de términos exactos
    const or: any[] = [];
    if (email) {
      or.push(
        { "identifiers": { $elemMatch: { type: "email", value: email } } },
        { email } // por si está en el campo toplevel
      );
    }
    if (phone) {
      or.push(
        { "identifiers": { $elemMatch: { type: "phone", value: phone } } },
        { phone } // toplevel
      );
    }
    if (doc) {
      or.push(
        { "identifiers": { $elemMatch: { type: "doc", value: doc } } }
      );
    }
    if (wa) {
      or.push(
        { "identifiers": { $elemMatch: { type: "wa", value: wa } } },
        { guestId: wa } // a veces el guestId es el wa-id
      );
    }
    if (webId) {
      or.push(
        { "identifiers": { $elemMatch: { type: "web_id", value: webId } } }
      );
    }

    if (or.length) {
      const filter = { hotelId, $or: or };
      const hits = await col.find(filter).limit(10).toArray();

      if (hits.length === 1) {
        return NextResponse.json({
          ok: true,
          matchType: "exact",
          normalized: { email, phone, doc, wa, webId },
          guest: hits[0],
        });
      }
      if (hits.length > 1) {
        // Podés agregar un score simple si querés; por ahora devolvemos candidatos
        return NextResponse.json({
          ok: true,
          matchType: "candidates",
          normalized: { email, phone, doc, wa, webId },
          candidates: hits.map(g => ({
            guestId: g.guestId,
            name: g.name || `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim(),
            email: g.email,
            phone: g.phone,
            external: g.external ?? {},
          })),
        });
      }
    }

    // 3) Sin match → 404 lógico (o 200 con ok:false, found:false)
    return NextResponse.json({
      ok: false,
      found: false,
      normalized: { email, phone, doc, wa, webId }
    }, { status: 404 });

  } catch (err: any) {
    console.error("[/api/guests/resolve] error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
