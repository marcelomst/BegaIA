// /app/admin/layout.tsx
"use client";

import { ReactNode } from "react";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/client/fetchWithAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarLink } from "@/components/ui/SidebarLink";
import {
  Home,
  Hotel,
  Upload,
  Brain,
  FileText,
} from "lucide-react";
import { UserProvider } from "@/lib/context/UserContext";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{
      email: string;
      hotelId: string;
      roleLevel: number;
    } | null>(null);
  
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetchWithAuth("/api/me");
        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        setUser(data);
      } catch (err) {
        setUser(null); // opcional, podría quitarse si redirige
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
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 p-4 flex flex-col justify-between text-foreground">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Begasist Admin</h1>
              <ThemeToggle />
            </div>
            {user && (
              <div className="text-xs text-muted-foreground mb-2">
                {user.email} – Hotel {user.hotelId}
              </div>
            )}          
            <nav className="space-y-2">
              <SidebarLink href="/admin" icon={<Home className="w-5 h-5" />} label="Inicio" />
              <SidebarLink href="/admin/hotels" icon={<Hotel className="w-5 h-5" />} label="Hoteles" />
              <SidebarLink href="/admin/upload" icon={<Upload className="w-5 h-5" />} label="Carga de datos" />
              <SidebarLink href="/admin/prompts" icon={<Brain className="w-5 h-5" />} label="Prompts" />
              <SidebarLink href="/admin/logs" icon={<FileText className="w-5 h-5" />} label="Logs" />
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </UserProvider>
  );
}
