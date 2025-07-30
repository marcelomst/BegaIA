// /lib/context/UserContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/client/fetchWithAuth";
import type { CurrentUser } from "@/types/user";


type UserContextType = {
  hotelId: string;
  user: CurrentUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/me");
      if (!res.ok) {
        setUser(null);
      } else {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const hotelId = user?.hotelId ?? "";

  return (
    <UserContext.Provider value={{ hotelId, user, loading, refreshUser: loadUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useCurrentUser debe usarse dentro de <UserProvider>");
  return context;
}
