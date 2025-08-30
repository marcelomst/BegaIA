// Path: /root/begasist/components/ui/Sidebar.tsx
"use client";
import { useSidebar } from "@/lib/context/SidebarContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarLogout } from "@/components/ui/SidebarLogout";
import { SidebarLink } from "@/components/ui/SidebarLink";
import { SidebarGroup } from "@/components/ui/SidebarGroup";
import {
  Users, KeyRound, Hotel, Upload, Brain, BookOpen, FileText
} from "lucide-react";
import Image from "next/image";
import { useContext } from "react";
import { useCurrentUser } from "@/lib/context/UserContext";
import {
  canAccessHotelsSection, canAccessUploadSection, canAccessEmbeddingsSection,
  canAccessPromptsSection, canAccessChannelsSection, canAccessLogsSection,
  canAccessUsersSection, canAccessChangePasswordSection,
} from "@/lib/auth/roles";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { user } = useCurrentUser();

  if (!user) return null;

  return (
    <aside className={`relative transition-all duration-200 bg-gray-900 p-4 flex flex-col justify-between text-foreground ${sidebarOpen ? "w-64" : "w-14"} overflow-x-hidden`}>
      <button
        className="absolute top-2 right-[-16px] z-10 bg-gray-200 dark:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center border"
        title={sidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
        onClick={toggleSidebar}
      >
        {sidebarOpen ? "⟨" : "⟩"}
      </button>
      <div>
        <div className="flex items-center justify-between mb-4">
          {sidebarOpen && <h1 className="text-2xl font-bold">BegAI Admin</h1>}
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
            <>
              <SidebarLink
                href="/admin/channels"
                label={sidebarOpen ? "Canales" : ""}
                icon={<Image src="/icons/overview.svg" alt="" width={20} height={20} className="w-5 h-5" />}
              />
              <SidebarLink
                href="/admin/channels/web"
                label={sidebarOpen ? "Web" : ""}
                icon={<Image src="/icons/web.svg" alt="" width={20} height={20} className="w-5 h-5" />}
              />
              <SidebarLink
                href="/admin/channels/email"
                label={sidebarOpen ? "Email" : ""}
                icon={<Image src="/icons/email.svg" alt="" width={20} height={20} className="w-5 h-5" />}
              />
              <SidebarLink
                href="/admin/channels/whatsapp"
                label={sidebarOpen ? "WhatsApp" : ""}
                icon={<Image src="/icons/whatsapp.svg" alt="" width={20} height={20} className="w-5 h-5" />}
              />
              <SidebarLink
                href="/admin/channels/channelManager"
                label={sidebarOpen ? "Channel Manager" : ""}
                icon={<Image src="/icons/channelManager.svg" alt="" width={20} height={20} className="w-5 h-5" />}
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
  );
}
