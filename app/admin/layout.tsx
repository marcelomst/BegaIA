// Path: /root/begasist/app/admin/layout.tsx
"use client";

import { SidebarLogout } from "@/components/ui/SidebarLogout";
import { ReactNode, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/client/fetchWithAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarLink } from "@/components/ui/SidebarLink";
import {
  Users,
  KeyRound,
  Hotel,
  Upload,
  Brain,
  BookOpen,
  Server,
  FileText,
  Settings
} from "lucide-react";
import { UserProvider } from "@/lib/context/UserContext";
import { Toaster } from "@/components/ui/toaster";
import { SidebarGroup } from "@/components/ui/SidebarGroup";
import {
  canAccessHotelsSection,
  canAccessUploadSection,
  canAccessEmbeddingsSection,
  canAccessPromptsSection,
  canAccessChannelsSection,
  canAccessLogsSection,
  canAccessUsersSection,
  canAccessChangePasswordSection,
} from "@/lib/auth/roles";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { SidebarProvider } from "@/lib/context/SidebarContext";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{
    email: string;
    hotelId: string;
    hotelName: string;
    roleLevel: number;
    userId?: string;
  } | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <SidebarProvider>
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
          {/* Sidebar SIEMPRE visible, colapsable */}
          <aside className={`relative transition-all duration-200 bg-gray-900 p-4 flex flex-col justify-between text-foreground ${sidebarOpen ? "w-64" : "w-14"} overflow-x-hidden`}>
            <button
              className="absolute top-2 right-[-16px] z-10 bg-gray-200 dark:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center border"
              title={sidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
              onClick={() => setSidebarOpen((o) => !o)}
            >
              {sidebarOpen ? "⟨" : "⟩"}
            </button>
            <div>
              <div className="flex items-center justify-between mb-4">
                {sidebarOpen && <h1 className="text-2xl font-bold">Begasist Admin</h1>}
                <ThemeToggle />
              </div>
              {sidebarOpen && (
                <div className="text-xs text-muted-foreground mb-2 leading-snug">
                  {user.email}
                  <br />
                  {user.hotelName} <span className="text-[10px] text-gray-400">(ID: {user.hotelId})</span>
                </div>
              )}
              <nav className="space-y-2">
                {canAccessHotelsSection(user.roleLevel) && (
                  <SidebarLink href="/admin/hotels" label={sidebarOpen ? "Hoteles" : ""} icon={<Hotel className="w-5 h-5" />} />
                )}
                {canAccessUploadSection(user.roleLevel) && (
                  <SidebarLink href="/admin/upload" label={sidebarOpen ? "Carga de Datos" : ""} icon={<Upload className="w-5 h-5" />} />
                )}
                {canAccessEmbeddingsSection(user.roleLevel) && (
                  <SidebarLink href="/admin/embeddings" label={sidebarOpen ? "Embeddings" : ""} icon={<Brain className="w-5 h-5" />} />
                )}
                {canAccessPromptsSection(user.roleLevel) && (
                  <SidebarLink href="/admin/prompts" label={sidebarOpen ? "Prompts Curados" : ""} icon={<BookOpen className="w-5 h-5" />} />
                )}
                {canAccessChannelsSection(user.roleLevel) && (
                  // 👇 Aquí, iconos reales de los canales:
                  <>
                    <SidebarLink
                      href="/admin/channels"
                      label={sidebarOpen ? "Canales" : ""}
                      icon={
                        <Image src="/icons/overview.svg" alt="" width={20} height={20} className="w-5 h-5" />
                      }
                    />
                    <SidebarLink
                      href="/admin/channels/web"
                      label={sidebarOpen ? "Web" : ""}
                      icon={
                        <Image src="/icons/web.svg" alt="" width={20} height={20} className="w-5 h-5" />
                      }
                    />
                    <SidebarLink
                      href="/admin/channels/email"
                      label={sidebarOpen ? "Email" : ""}
                      icon={
                        <Image src="/icons/email.svg" alt="" width={20} height={20} className="w-5 h-5" />
                      }
                    />
                    <SidebarLink
                      href="/admin/channels/whatsapp"
                      label={sidebarOpen ? "WhatsApp" : ""}
                      icon={
                        <Image src="/icons/whatsapp.svg" alt="" width={20} height={20} className="w-5 h-5" />
                      }
                    />
                    <SidebarLink
                      href="/admin/channels/channelManager"
                      label={sidebarOpen ? "Channel Manager" : ""}
                      icon={
                        <Image src="/icons/channelManager.svg" alt="" width={20} height={20} className="w-5 h-5" />
                      }
                    />
                  </>
                )}
                {canAccessLogsSection(user.roleLevel) && (
                  <SidebarLink href="/admin/logs" label={sidebarOpen ? "Logs y Debug" : ""} icon={<FileText className="w-5 h-5" />} />
                )}
                {canAccessUsersSection(user.roleLevel) && (
                  <SidebarGroup icon={<Users className="w-5 h-5" />} label={sidebarOpen ? "Usuarios" : ""}>
                    <SidebarLink href="/admin/users/manage" label={sidebarOpen ? "Administración" : ""} icon={<Users className="w-4 h-4" />} />
                  </SidebarGroup>
                )}
                {canAccessChangePasswordSection(user.roleLevel) && (
                  <SidebarLink href="/auth/change-password" icon={<KeyRound className="w-5 h-5" />} label={sidebarOpen ? "Cambiar contraseña" : ""} />
                )}
              </nav>
              <SidebarLogout />
            </div>
          </aside>

          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
        <Toaster />
      </SidebarProvider>
    </UserProvider>
  );
}
