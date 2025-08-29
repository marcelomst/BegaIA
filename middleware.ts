// Path: /root/begasist/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { canAccessHotelsSection, canAccessAdminRoute } from "@/lib/auth/roles";

// Orígenes permitidos para el widget
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

function buildCorsHeaders(origin: string | null) {
  const h = new Headers();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}
function withCORS(res: NextResponse, req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = buildCorsHeaders(origin);
  cors.forEach((v, k) => res.headers.set(k, v));
  return res;
}

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-account",

  "/api/login",
  "/api/users/hotels-for-user",
  "/api/users/send-recovery-email",
  "/api/users/verify-account",
  "/api/users/validate-reset-token",
  "/api/test",
  "/api/chat",
  "/api/upload-hotel-document",
  "/api/hotel-documents",
  "/api/conversations/list",
  "/api/messages/by-conversation",
  "/api/whatsapp/qr",
  "/api/debug/list-user-passwords",
  "/api/users/reset-password",
  "/api/channel-status",
  "/api/email/polling",

  "/api/simulate",

  "/api/integrations/beds24/webhooks",
  "/api/health",
  "/api/reservations/by-id",

  // SSE del widget
  "/api/web/events",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Preflight CORS
  if (req.method === "OPTIONS" && isApi) {
    return withCORS(new NextResponse(null, { status: 204 }), req);
  }

  // Integraciones → bypass
  if (pathname.startsWith("/api/integrations/")) {
    return withCORS(NextResponse.next(), req);
  }

  // Rutas públicas (incluye /api/chat y /api/web/events)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return withCORS(NextResponse.next(), req);
  }

  // Auth (JWT en cookie)
  const token = req.cookies.get("token")?.value;
  if (!token) {
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    return isApi ? withCORS(res, req) : res;
  }
  const payload = await verifyJWT(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    return isApi ? withCORS(res, req) : res;
  }

  // ✅ Cualquier ruta bajo /admin/hotels/** (incluye /widget) se valida SOLO con canAccessHotelsSection
  if (pathname.startsWith("/admin/hotels/")) {
    if (!canAccessHotelsSection(payload.roleLevel)) {
      const res = NextResponse.redirect(new URL("/auth/login", req.url));
      return isApi ? withCORS(res, req) : res;
    }
    return withCORS(NextResponse.next(), req); // ← EARLY RETURN, no cae al check genérico
  }

  // Resto de /admin/** con regla general
  if (pathname.startsWith("/admin")) {
    if (!canAccessAdminRoute(payload.roleLevel, pathname)) {
      const res = NextResponse.redirect(new URL("/auth/login", req.url));
      return isApi ? withCORS(res, req) : res;
    }
  }

  // OK
  return withCORS(NextResponse.next(), req);
}

// Aplica en /admin y /api
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
