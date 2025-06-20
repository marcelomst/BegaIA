// Path: /root/begasist/components/admin/ChannelSidebar.tsx
"use client";

import { Server, Mail, Smartphone, Globe, LayoutDashboard } from "lucide-react";

const CHANNELS = [
  { id: "overview", label: "Visión General", icon: LayoutDashboard },
  { id: "web",    label: "Web",        icon: Globe },
  { id: "email",  label: "Email",      icon: Mail },
  { id: "whatsapp", label: "WhatsApp", icon: Smartphone },
  { id: "channelManager", label: "Channel Manager", icon: Server },
];

export default function ChannelSidebar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="w-52 flex-shrink-0 border-r bg-muted h-full">
      <nav className="flex flex-col py-4 gap-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            className={`flex items-center gap-2 px-4 py-2 rounded transition 
              ${selected === ch.id
                ? "bg-blue-200 font-semibold dark:bg-primary/20"
                : "hover:bg-blue-50 dark:hover:bg-primary/10"}`}
            onClick={() => onSelect(ch.id)}
          >
            <ch.icon className="w-5 h-5" />
            {ch.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
