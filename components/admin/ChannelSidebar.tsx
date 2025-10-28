// Path: /app/admin/channels/ChannelSidebar.tsx

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { CHANNELS } from "@/lib/config/channelsConfig";
import type { ChannelId } from "@/lib/config/channelsConfig";
import { useCurrentHotel } from "@/lib/context/HotelContext";

// --- i18n: carga dinámica SOLO el idioma del hotel
function getDictionaryAsync(lang: string) {
  const code = lang?.slice(0, 2).toLowerCase();
  switch (code) {
    case "es":
      return import("@/lib/i18n/es").then((mod) => mod.default);
    case "pt":
      return import("@/lib/i18n/pt").then((mod) => mod.default);
    case "en":
    default:
      return import("@/lib/i18n/en").then((mod) => mod.default);
  }
}

interface ChannelSidebarProps {
  selected: ChannelId;
  onSelect: (id: ChannelId) => void;
}

export default function ChannelSidebar({
  selected,
  onSelect,
}: ChannelSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { hotel } = useCurrentHotel();

  // Estado para diccionario y loading
  const [t, setT] = useState<any>(null);
  const [loadingDict, setLoadingDict] = useState(true);

  useEffect(() => {
    setLoadingDict(true);
    getDictionaryAsync(hotel?.defaultLanguage || "en")
      .then(setT)
      .catch(() => setT(null))
      .finally(() => setLoadingDict(false));
  }, [hotel?.defaultLanguage]);

  if (loadingDict || !t) {
    return (
      <div className="relative h-full flex items-center justify-center text-muted-foreground">
        Cargando diccionario...
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Botón ocultar/desocultar sidebar canales */}
      <button
        className={`absolute top-3 right-[-16px] z-20 bg-gray-200 dark:bg-zinc-700 rounded-full w-7 h-7 flex items-center justify-center border shadow transition-all ${
          !sidebarOpen && "left-0 top-3"
        }`}
        title={sidebarOpen ? t.sidebar.hideChannels : t.sidebar.showChannels}
        onClick={() => setSidebarOpen((o) => !o)}
        style={{
          right: sidebarOpen ? "-16px" : "auto",
          left: sidebarOpen ? "auto" : "-10px",
        }}
      >
        {sidebarOpen ? "⟨" : "⟩"}
      </button>

      <aside
        className={`${
          sidebarOpen ? "w-52" : "w-0"
        } flex-shrink-0 border-r border-border bg-muted h-full overflow-x-hidden transition-all duration-200`}
      >
        {sidebarOpen && (
          <>
            {/* Título multilingüe */}
            <div className="flex items-center gap-2 px-4 py-3 border-b font-bold text-base tracking-wide bg-muted/70">
              <Server className="w-5 h-5" />
              <span>{t.sidebar.channelsPanel || "Canales"}</span>
            </div>
            <nav className="flex flex-col py-4 gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  aria-current={selected === ch.id ? "page" : undefined}
                  tabIndex={0}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition select-none
                    ${
                      selected === ch.id
                        ? "bg-blue-200 font-semibold dark:bg-primary/20"
                        : "hover:bg-blue-50 dark:hover:bg-primary/10"
                    }`}
                  onClick={() => onSelect(ch.id)}
                  onKeyDown={e => {
                    if (
                      (e.key === "Enter" || e.key === " ") &&
                      selected !== ch.id
                    )
                      onSelect(ch.id);
                  }}
                  title={t.sidebar[ch.id] || ch.label}
                  type="button"
                >
                  <Image
                    src={ch.icon}
                    alt={t.sidebar[ch.id] || ch.label}
                    width={22}
                    height={22}
                    className="w-5 h-5"
                  />
                  <span className="truncate">
                    {t.sidebar[ch.id] || ch.label}
                  </span>
                </button>
              ))}
            </nav>
          </>
        )}
      </aside>
    </div>
  );
}
