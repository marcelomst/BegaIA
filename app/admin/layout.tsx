// /app/admin/layout.tsx
"use client";

import { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarLink } from "@/components/ui/SidebarLink";
import {
  Home,
  Hotel,
  Upload,
  Brain,
  FileText,
} from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 p-4 flex flex-col justify-between text-foreground">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Begasist Admin</h1>
            <ThemeToggle />
          </div>
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
  );
}
