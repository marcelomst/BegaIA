// Path: /root/begasist/components/admin/ChannelSidebar.tsx
import React from "react";

interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
  unread?: number;
}

export function ChannelSidebar({
  channels,
  activeChannel,
  onSelectChannel,
}: {
  channels: Channel[];
  activeChannel: string;
  onSelectChannel: (id: string) => void;
}) {
  return (
    <aside className="w-44 md:w-56 bg-muted border-r border-border h-full flex flex-col">
      <div className="px-4 py-5 border-b border-border font-bold text-lg">
        Panel de Canales
      </div>
      <nav className="flex-1 overflow-y-auto mt-2">
        <button
          className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition
            ${activeChannel === "overview"
              ? "bg-primary/10 text-primary font-bold"
              : "hover:bg-muted/70 text-foreground"
            }`}
          onClick={() => onSelectChannel("overview")}
        >
          <span className="text-xl">📊</span>
          <span>Visión general</span>
        </button>
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onSelectChannel(ch.id)}
            className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition
              ${ch.id === activeChannel
                ? "bg-primary/10 text-primary font-bold"
                : "hover:bg-muted/70 text-foreground"
              }`}
          >
            <span className="text-xl">{ch.icon}</span>
            <span>{ch.name}</span>
            {ch.unread ? (
              <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {ch.unread}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
