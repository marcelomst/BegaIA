// /app/admin/layout.tsx
"use client";

import { SidebarLogout } from "@/components/ui/SidebarLogout";
import { ReactNode, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/client/fetchWithAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarLink } from "@/components/ui/SidebarLink";
import { Users, KeyRound } from "lucide-react";
import { UserProvider } from "@/lib/context/UserContext";
import { Toaster } from "@/components/ui/toaster";
import { SidebarGroup } from "@/components/ui/SidebarGroup";
import { ADMIN_MENU_ITEMS } from "@/lib/constants/adminMenu";

export default function AdminLayout({ children }: { children: ReactNode }) {
const [user, setUser] = useState<{
  email: string;
  hotelId: string;
  hotelName: string; // 👈 agregá esto
  roleLevel: number;
  userId?: string; // opcional si lo necesitás
} | null>(null);


  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetchWithAuth("/api/me");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setUser(data);
      } catch {
        setUser(null);
      }
    }
    loadUser();
  }, []);

  if (!user) {
    return <p className="p-4 text-gray-500">Verificando sesión...</p>;
  }

  return (
    <UserProvider>
      <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
        <aside className="w-64 bg-gray-900 p-4 flex flex-col justify-between text-foreground">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Begasist Admin</h1>
              <ThemeToggle />
            </div>
            <div className="text-xs text-muted-foreground mb-2 leading-snug">
              {user.email}
              <br />
              {user.hotelName} <span className="text-[10px] text-gray-400">(ID: {user.hotelId})</span>
            </div>
            <nav className="space-y-2">
              {ADMIN_MENU_ITEMS.filter(
                (item) =>
                  user.roleLevel >= item.minRole &&
                  (item.maxRole === undefined || user.roleLevel <= item.maxRole)
              ).map((item) => (
                <SidebarLink 
                  key={item.href} 
                  href={item.href} 
                  icon={<item.icon className="w-5 h-5" />}
                  label={item.label} />
              ))}

              {(user.roleLevel < 20 || user.roleLevel === 0) && (
                <SidebarGroup icon={<Users className="w-5 h-5" />} label="Usuarios">
                  <SidebarLink href="/admin/users/manage" label="Administración" />
                  <SidebarLink href="/auth/change-password" icon={<KeyRound className="w-4 h-4" />} label="Cambiar contraseña" />
                </SidebarGroup>
              )}

              {user.roleLevel >= 20 && (
                <SidebarLink href="/auth/change-password" icon={<KeyRound className="w-5 h-5" />} label="Cambiar contraseña" />
              )}
            </nav>
            <SidebarLogout />
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
      <Toaster />
    </UserProvider>
  );
}
