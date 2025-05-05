"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/client/fetchWithAuth";

export type CurrentUser = {
  email: string;
  hotelId: string;
  roleLevel: number;
  userId: string;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetchWithAuth("/api/me");
        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, loading };
}
