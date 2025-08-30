// Path: /root/begAI/app/widget/embed/route.ts
import { NextResponse } from "next/server";

/**
 * Endpoint "una sola etiqueta" (CSP-friendly).
 * Uso:
 *   <script async src="https://TU_API/widget/embed
 *     ?hotel=hotel999
 *     &apiBase=https%3A%2F%2FTU_API
 *     &lang=es
 *     &pos=bottom-right
 *     &primary=%230ea5e9
 *     &langs=es,en,pt"></script>
 *
 * Este endpoint genera JS que:
 *   1) configura window.BegAIChat
 *   2) inyecta /widget/begAI-chat.js
 */

type Position = "bottom-right" | "bottom-left";
const ALLOWED_POS: Position[] = ["bottom-right", "bottom-left"];
const ALLOWED_LANGS = new Set(["es", "en", "pt"]);

// Sanitiza un color hex (#RRGGBB o #RGB). Si no matchea, devuelve default.
function sanitizeHexColor(input: string | null | undefined, fallback = "#0ea5e9"): string {
  if (!input) return fallback;
  // Acepta "#abc" o "#aabbcc" (case-insensitive)
  const s = input.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  return fallback;
}

function sanitizeApiBase(input: string | null | undefined, fallback: string): string {
  const raw = (input || "").trim().replace(/\/+$/, "");
  try {
    const u = new URL(raw || fallback);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return `${u.origin}`;
    }
  } catch {}
  return fallback.replace(/\/+$/, "");
}

function normLang(l: string | null | undefined, dflt = "es"): string {
  const v = String(l || "").toLowerCase().replace("_", "-").slice(0, 2);
  return ALLOWED_LANGS.has(v) ? v : dflt;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const hotel = (sp.get("hotel") || "hotel999").trim() || "hotel999";
  const apiBase = sanitizeApiBase(sp.get("apiBase"), url.origin);
  const lang = normLang(sp.get("lang"), "es");

  const pos = ((): Position => {
    const p = (sp.get("pos") || "bottom-right").toLowerCase() as Position;
    return ALLOWED_POS.includes(p) ? p : "bottom-right";
  })();

  const primary = sanitizeHexColor(sp.get("primary"), "#0ea5e9");

  // langs=es,en,pt  -> array filtrado por los permitidos; si queda vacío, usa [lang]
  const langsParam = (sp.get("langs") || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const langs = Array.from(
    new Set(
      (langsParam.length ? langsParam : [lang]).filter(l => ALLOWED_LANGS.has(l))
    )
  );
  if (langs.length === 0) langs.push("es");

  // JS a servir: configura y luego inyecta el bundle
  const js =
    `(()=>{` +
    `var w=window,d=document;` +
    `w.BegAIChat=Object.assign({},w.BegAIChat,{` +
    `hotelId:${JSON.stringify(hotel)},` +
    `apiBase:${JSON.stringify(apiBase)},` +
    `lang:${JSON.stringify(lang)},` +
    `languages:${JSON.stringify(langs)},` +
    `position:${JSON.stringify(pos)},` +
    `theme:{primary:${JSON.stringify(primary)}},` +
    `requireName:false` +
    `});` +
    `var s=d.createElement("script");` +
    `s.async=true;` +
    `s.src:${JSON.stringify(apiBase + "/widget/begai-chat.js")};` +
    `d.head.appendChild(s);` +
    `})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Cache corto; podés ajustar según tus necesidades:
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      // Para recursos <script> no hace falta CORS, pero no molesta habilitarlo:
      "Access-Control-Allow-Origin": "*",
    },
  });
}
