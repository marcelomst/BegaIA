// /middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";

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

  // 🔒 Accesos especiales
  // Recepcionistas (>=20) no pueden entrar a nada en /admin excepto canales, cambiar contraseña y home
  if (pathname.startsWith("/admin") && payload.roleLevel >= 20) {
    if (
      !pathname.startsWith("/admin/channels") &&
      !pathname.startsWith("/auth/change-password") &&
      !pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  // Gerentes (>=10) no pueden entrar a /admin/hotels, /admin/data, /admin/prompts, /admin/logs
  if (
    pathname.startsWith("/admin/hotels") ||
    pathname.startsWith("/admin/data") ||
    pathname.startsWith("/admin/prompts") ||
    pathname.startsWith("/admin/logs")
  ) {
    if (payload.roleLevel > 0) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
