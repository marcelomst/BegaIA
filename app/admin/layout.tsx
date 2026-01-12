// Path: /root/begasist/app/admin/layout.tsx

"use client";

import { SidebarLogout } from "@/components/ui/SidebarLogout";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/client/fetchWithAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarLink } from "@/components/ui/SidebarLink";
import { SidebarGroup } from "@/components/ui/SidebarGroup";
import {
  Users,
  KeyRound,
  Hotel,
  Upload,
  Brain,
  BookOpen,
  Server,
  FileText,
  Settings,
  MessageSquare,
} from "lucide-react";
import { UserProvider } from "@/lib/context/UserContext";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import { HotelContext } from "@/lib/context/HotelContext";
import type { HotelConfig } from "@/types/channel";
import Image from "next/image";
import {
  canAccessHotelsSection,
  canAccessHotelSection,
  canAccessUploadSection,
  canAccessEmbeddingsSection,
  canAccessPromptsSection,
  canAccessChannelsSection,
  canAccessLogsSection,
  canAccessUsersSection,
  canAccessChangePasswordSection,
} from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/getDictionary"; // 👈🏼 Helper central i18n

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{
    email: string;
    hotelId: string;
    hotelName: string;
    defaultLanguage?: string;
    roleLevel: number;
    userId?: string;
  } | null>(null);

  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [t, setT] = useState<any>(null);
  const [loadingDict, setLoadingDict] = useState(true);

  useEffect(() => {
    async function loadUserAndDict() {
      try {
        const res = await fetchWithAuth("/api/me");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setUser(data);

        const hotelConf = {
          hotelId: data.hotelId,
          hotelName: data.hotelName,
          defaultLanguage: data.defaultLanguage || "en",
        } as HotelConfig;
        setHotel(hotelConf);

        setLoadingDict(true);
        const dict = await getDictionary(hotelConf.defaultLanguage || "en");
        setT(dict);
      } catch {
        setUser(null);
        setHotel(null);
        setT(null);
      } finally {
        setLoadingDict(false);
      }
    }
    loadUserAndDict();
  }, []);

  if (loadingDict || !t) {
    return <p className="p-4 text-gray-500">Cargando diccionario...</p>;
  }

  if (!user) {
    return <p className="p-4 text-gray-500">{t.layout.checkingSession}</p>;
  }

  return (
    <UserProvider>
      <HotelContext.Provider value={{ hotel }}>
        <SidebarProvider>
          <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
            <aside
              className={`
                relative transition-all duration-200 bg-gray-900 border-r border-border p-4 flex flex-col
                justify-between text-foreground
                ${sidebarOpen ? "w-64" : "w-0"}
                overflow-x-hidden
              `}
              style={{ minWidth: sidebarOpen ? 200 : 0 }}
            >
              {sidebarOpen && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">{t.layout.panelTitle}</h1>
                    <ThemeToggle />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 leading-snug">
                    {user.email}
                    <br />
                    {user.hotelName}{" "}
                    <span className="text-[10px] text-gray-400">(ID: {user.hotelId})</span>
                  </div>
                  <nav className="space-y-2">
                    <SidebarLink
                      href="/admin"
                      label={sidebarOpen ? t.layout.home : ""}
                      icon={
                        <Image
                          src="/icons/home.svg"
                          alt="Home"
                          width={20}
                          height={20}
                          className="w-5 h-5"
                        />
                      }
                    />
                    {canAccessHotelsSection(user.roleLevel) && (
                      <SidebarLink
                        href="/admin/hotels"
                        label={sidebarOpen ? t.layout.hotels : ""}
                        icon={<Hotel className="w-5 h-5" />}
                      />
                    )}
                    {canAccessHotelSection(user.roleLevel) && (
                      <SidebarLink
                        href="/admin/hotel/edit"
                        // Renombrado: foco claro en configuración base del hotel
                        label={t.layout.myHotelEdit || "Hotel Config"}
                        icon={<Hotel className="w-5 h-5" />}
                      />
                    )}
                    {/* Acceso rápido al generador de Snippet para el hotel del usuario */}
                    {canAccessHotelSection(user.roleLevel) && (
                      <SidebarLink
                        href={`/admin/hotels/${user.hotelId}/widget`}
                        label="Widget"
                        icon={<MessageSquare className="w-5 h-5" />}
                      />
                    )}
                    {canAccessUploadSection(user.roleLevel) && (
                      <SidebarLink
                        href="/admin/upload"
                        // Modo avanzado: ingesta manual de documentos sueltos
                        label={sidebarOpen ? (t.layout.uploadAdvanced || "Ingesta Manual") : ""}
                        icon={<Upload className="w-5 h-5" />}
                      />
                    )}
                    {canAccessUploadSection(user.roleLevel) && (
                      <SidebarLink
                        href="/admin/kb/templates"
                        // Punto único de generación/preview de KB
                        label={sidebarOpen ? (t.layout?.kbGenerate || "Generar KB") : ""}
                        icon={<BookOpen className="w-5 h-5" />}
                      />
                    )}
                    {canAccessChannelsSection(user.roleLevel) && (
                      <SidebarLink
                        href="/admin/channels"
                        label={sidebarOpen ? t.layout.channels : ""}
                        icon={<Server className="w-5 h-5" />}
                      />
                    )}
                    {canAccessUsersSection(user.roleLevel) && (
                      <SidebarGroup
                        label={sidebarOpen ? t.layout.users : ""}
                        icon={<Users className="w-5 h-5" />}
                      >
                        <SidebarLink
                          href="/admin/users/manage"
                          label={sidebarOpen ? t.layout.usersManage : ""}
                          icon={<Users className="w-4 h-4" />}
                        />
                      </SidebarGroup>
                    )}
                    {(canAccessPromptsSection(user.roleLevel) ||
                      canAccessEmbeddingsSection(user.roleLevel) ||
                      canAccessLogsSection(user.roleLevel)) && (
                      <SidebarGroup
                        label={sidebarOpen ? t.layout.development : ""}
                        icon={<Settings className="w-5 h-5" />}
                      >
                        {canAccessPromptsSection(user.roleLevel) && (
                          <SidebarLink
                            href="/admin/prompts"
                            label={sidebarOpen ? t.layout.prompts : ""}
                            icon={<BookOpen className="w-5 h-5" />}
                          />
                        )}
                        {canAccessEmbeddingsSection(user.roleLevel) && (
                          <SidebarLink
                            href="/admin/embeddings"
                            label={sidebarOpen ? t.layout.embeddings : ""}
                            icon={<Brain className="w-5 h-5" />}
                          />
                        )}
                        {canAccessLogsSection(user.roleLevel) && (
                          <SidebarLink
                            href="/admin/logs"
                            label={sidebarOpen ? t.layout.logs : ""}
                            icon={<FileText className="w-5 h-5" />}
                          />
                        )}
                      </SidebarGroup>
                    )}
                    {canAccessChangePasswordSection(user.roleLevel) && (
                      <SidebarLink
                        href="/auth/change-password"
                        label={sidebarOpen ? t.layout.changePassword : ""}
                        icon={<KeyRound className="w-5 h-5" />}
                      />
                    )}
                  </nav>
                  <SidebarLogout />
                </div>
              )}
            </aside>
            <button
              className={`
                fixed top-6 left-0 z-40
                bg-gray-200 dark:bg-zinc-700 border rounded-full w-8 h-8 flex
                items-center justify-center shadow
                transition
                ${sidebarOpen ? "translate-x-60" : "translate-x-2"}
              `}
              style={{ transition: "transform 0.2s" }}
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? t.layout.hideSidebar : t.layout.showSidebar}
            >
              {sidebarOpen ? "⟨" : "⟩"}
            </button>
            <main className="flex-1 p-6 overflow-y-auto">{children}</main>
          </div>
          <Toaster />
        </SidebarProvider>
      </HotelContext.Provider>
    </UserProvider>
  );
}
