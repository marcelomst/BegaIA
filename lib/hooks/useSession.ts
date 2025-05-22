// /lib/hooks/useSession.ts
"use client";

import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";


interface JWTPayload {
  email: string;
  hotelId: string;
  roleLevel: number;
  userId: string;
  exp?: number;
}

export function useSession(): JWTPayload | null {
  const [session, setSession] = useState<JWTPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const payload = jwtDecode<JWTPayload>(token);
      setSession(payload);
    } catch (err) {
      console.warn("❌ Token de acceso inválido o corrupto", err);
      setSession(null);
    }
  }, []);

  return session;
}
