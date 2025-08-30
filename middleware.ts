// /root/begasist/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { canAccessAdminRoute } from "@/lib/auth/roles";

// 🔐 Orígenes permitidos para el widget estático
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

function buildCorsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function withCORS(res: NextResponse, req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = buildCorsHeaders(origin);
  cors.forEach((v, k) => res.headers.set(k, v));
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
  "/api/upload-hotel-document",
  "/api/hotel-documents",
  "/api/conversations/list",
  "/api/messages/by-conversation",
  "/api/whatsapp/qr",
  "/api/debug/list-user-passwords",
  "/api/users/reset-password",
  "/api/channel-status",
  "/api/email/polling",

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

  // 0) Preflight CORS
  if (req.method === "OPTIONS" && isApi) {
    return withCORS(new NextResponse(null, { status: 204 }), req);
  }

  // 1) Integraciones: bypass (pero con CORS)
  if (pathname.startsWith("/api/integrations/")) {
    return withCORS(NextResponse.next(), req);
  }

  // 2) Públicos (incluye /api/chat y /api/web/events)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return withCORS(NextResponse.next(), req);
  }

  // 3) Auth por cookie JWT
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

  // 4) Gateo /admin ÚNICAMENTE con canAccessAdminRoute
  if (pathname.startsWith("/admin")) {
    const ok = canAccessAdminRoute(payload.roleLevel, pathname);
    if (!ok) {
      const res = NextResponse.redirect(new URL("/auth/login", req.url));
      return isApi ? withCORS(res, req) : res;
    }
  }

  // 5) OK
  return withCORS(NextResponse.next(), req);
}

// ✅ Middleware para /admin y /api
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
