// /middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { canAccessHotelsSection, canAccessAdminRoute } from "@/lib/auth/roles";

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
  "/api/conversations/list",         // 👈 AGREGÁ ESTAS DOS
  "/api/messages/by-conversation",   // 👈
  "/api/whatsapp/qr",
  "/api/debug/list-user-passwords", 
  "/api/users/reset-password",
  "/api/channel-status",
  "/api/email/polling", // 👈 AGREGÁ ESTA RUTA TAMBIÉN
];


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir rutas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/auth/login", req.url));

  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.redirect(new URL("/auth/login", req.url));

// 🔒 Recepcionistas: sólo canales, cambio de contraseña y home
  if (pathname.startsWith("/admin") && !canAccessAdminRoute(payload.roleLevel, pathname)) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // 🔒 Restricción a /admin/hotels, /admin/data, etc.
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

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};