// Path: /root/begasist/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { canAccessAdminRoute } from "@/lib/auth/roles";

// 🔐 Orígenes permitidos para el widget estático
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

// 🆕 rutas de API que pueden usar x-admin-key para bypass de login
// Agregamos endpoints del pipeline manual (seed, get, list) para permitir pruebas vía curl.
const ADMIN_KEY_BYPASS_PATHS = new Set<string>([
  "/api/kb/generate",
  "/api/debug/astra/list-collections",
  "/api/category/seed-to-hotel",
  "/api/hotel-content/get",
  "/api/hotel-content/list",
  // futuro: vectorización manual
  "/api/hotel-content/vectorize",
  // acceso directo a la config del hotel (solo lectura) para inspección en scripts
  "/api/hotels/get",
  // si querés otras rutas “admin script-friendly”, agregalas acá
  // "/api/upload",
]);

function applyCORSHeaders(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // 🆕 permitir el header x-admin-key además de los existentes
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

const PUBLIC_PATHS = [
  // Auth públicas
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-account",

  // Rutas públicas de API
  "/api/login",
  "/api/users/hotels-for-user",
  "/api/users/send-recovery-email",
  "/api/users/verify-account",
  "/api/users/validate-reset-token",
  "/api/test",
  "/api/chat",
  // 🔎 Endpoint de debug de fast-path
  "/api/debug/fastpath",
  "/api/upload-hotel-document",
  "/api/hotel-documents",
  "/api/hotel-document-details",
  "/api/hotel-document-original",
  "/api/conversations/list",
  "/api/messages/by-conversation",
  "/api/whatsapp/qr",
  "/api/debug/list-user-passwords",
  "/api/users/reset-password",
  "/api/channel-status",
  "/api/email/polling",

  // Permitir acceso público a la configuración del hotel desde el panel
  "/api/config",

  // Simuladores
  "/api/simulate",

  // 🔓 Webhooks externos
  "/api/integrations/beds24/webhooks",
  "/api/health",
  "/api/reservations/by-id",

  // 👇 SSE del widget (crítico)
  "/api/web/events",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const origin = req.headers.get("origin");

  // 0) Preflight CORS
  if (req.method === "OPTIONS" && isApi) {
    return applyCORSHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  // 1) Integraciones: bypass (pero con CORS)
  if (pathname.startsWith("/api/integrations/")) {
    return applyCORSHeaders(NextResponse.next(), origin);
  }

  // 1b) Mock MCP endpoints: acceso libre
  if (pathname.startsWith("/api/mcp/")) {
    return applyCORSHeaders(NextResponse.next(), origin);
  }

  // 2) Públicos (incluye /api/chat y /api/web/events)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return applyCORSHeaders(NextResponse.next(), origin);
  }

  // 🆕 2b) Bypass por x-admin-key para rutas whitelisted
  if (isApi && ADMIN_KEY_BYPASS_PATHS.has(pathname)) {
    const normalize = (v: string | null | undefined) =>
      (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
    const hdr = normalize(req.headers.get("x-admin-key"));
    const qp = normalize(req.nextUrl.searchParams.get("x-admin-key") || req.nextUrl.searchParams.get("admin_key") || req.nextUrl.searchParams.get("adminKey"));
    const envKey = normalize(process.env.ADMIN_API_KEY);
    const provided = hdr || qp;
    // si hay key y coincide con la env (tolerando comillas/espacios), dejamos pasar (sin exigir cookie)
    if (provided && envKey && provided === envKey) {
      return applyCORSHeaders(NextResponse.next(), origin);
    }
    // si viene una key pero no coincide, devolvemos 401 explícito (no redirigir a /auth/login)
    if (provided) {
      const res = NextResponse.json({ error: "Unauthorized (invalid x-admin-key)" }, { status: 401 });
      return applyCORSHeaders(res, origin);
    }
    // si no vino key, continúa flujo normal (pedirá login por cookie)
  }

  // 3) Auth por cookie JWT
  const token = req.cookies.get("token")?.value;
  if (!token) {
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    return isApi ? applyCORSHeaders(res, origin) : res;
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    return isApi ? applyCORSHeaders(res, origin) : res;
  }

  // 4) Gateo /admin ÚNICAMENTE con canAccessAdminRoute
  if (pathname.startsWith("/admin")) {
    const ok = canAccessAdminRoute(payload.roleLevel, pathname);
    if (!ok) {
      const res = NextResponse.redirect(new URL("/auth/login", req.url));
      return isApi ? applyCORSHeaders(res, origin) : res;
    }
  }

  // 5) OK
  return applyCORSHeaders(NextResponse.next(), origin);
}

// ✅ Middleware para /admin y /api
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
