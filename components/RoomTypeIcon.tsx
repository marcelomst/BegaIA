"use client";

import React from "react";
import { Bed, Crown, Home, Sparkles, Star, User, Users } from "lucide-react";

export type RoomBase = "SINGLE" | "DOUBLE" | "TWIN" | "TRIPLE" | "SUITE";
export type RoomModifier = "SUPERIOR" | "DELUXE" | "VIP";

type RoomTypeIconProps = {
  base: RoomBase;
  modifiers?: RoomModifier[];
  className?: string;
};

const BASE_ICON: Record<RoomBase, React.ComponentType<{ className?: string }>> = {
  SINGLE: User,
  DOUBLE: Users,
  TWIN: Bed,
  TRIPLE: Users,
  SUITE: Home,
};

const OVERLAY_ICON: Record<RoomModifier, React.ComponentType<{ className?: string }>> = {
  VIP: Crown,
  SUPERIOR: Star,
  DELUXE: Sparkles,
};

function pickOverlay(modifiers?: RoomModifier[]) {
  if (!modifiers || modifiers.length === 0) return null;
  if (modifiers.includes("VIP")) return "VIP" as const;
  if (modifiers.includes("SUPERIOR")) return "SUPERIOR" as const;
  if (modifiers.includes("DELUXE")) return "DELUXE" as const;
  return null;
}

export function RoomTypeIcon({ base, modifiers, className }: RoomTypeIconProps) {
  const BaseIcon = BASE_ICON[base];
  const overlayKey = pickOverlay(modifiers);
  const OverlayIcon = overlayKey ? OVERLAY_ICON[overlayKey] : null;

  return (
    <div className={`relative inline-flex items-center justify-center ${className || ""}`}>
      <BaseIcon className="h-10 w-10 text-slate-800" />
      {OverlayIcon ? (
        <span className="absolute -top-1 -right-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
          <OverlayIcon className="h-4 w-4 text-slate-800" />
        </span>
      ) : null}
    </div>
  );
}
