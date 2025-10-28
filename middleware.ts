// /root/begasist/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { canAccessAdminRoute } from "@/lib/auth/roles";

// 🔐 Orígenes permitidos para el widget estático
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

function applyCORSHeaders(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
