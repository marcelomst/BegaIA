// Path: /root/begasist/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { canAccessHotelsSection, canAccessAdminRoute } from "@/lib/auth/roles";

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

  // 🔓 Webhooks externos (no deben pasar por login)
  "/api/integrations/beds24/webhooks",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Preflights/health checks
  if (req.method === "OPTIONS" || req.method === "HEAD") {
    return NextResponse.next();
  }

  // 1) Bypass explícito para integraciones (evita 307 y evita auth)
  if (pathname.startsWith("/api/integrations/")) {
    return NextResponse.next();
  }

  // 2) Bypass para rutas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 3) Auth por cookie JWT
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/auth/login", req.url));

  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.redirect(new URL("/auth/login", req.url));

  // 4) Restricciones por rol en /admin/*
  if (pathname.startsWith("/admin") && !canAccessAdminRoute(payload.roleLevel, pathname)) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (
    (pathname.startsWith("/admin/hotels") ||
      pathname.startsWith("/admin/data") ||
      pathname.startsWith("/admin/prompts") ||
      pathname.startsWith("/admin/logs")) &&
    !canAccessHotelsSection(payload.roleLevel)
  ) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

// ✅ Matcher simple (sin lookaheads). El bypass de integraciones se hace arriba.
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
