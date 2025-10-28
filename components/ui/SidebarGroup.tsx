// Path: /root/begasist/components/ui/SidebarGroup.tsx
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarGroupProps {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SidebarGroup({ label, icon, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(true);
  // Si no hay label, solo ícono: igualmente permite expandir/collapse (para sidebar compacta)
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center w-full px-3 py-2 rounded hover:bg-gray-800 text-left text-sm font-medium text-white",
          !label && "justify-center"
        )}
        tabIndex={0}
        type="button"
        aria-expanded={open}
      >
        {icon && <span className="mr-2 text-lg">{icon}</span>}
        <span className="flex-1">{label}</span>
        <span>{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
      </button>
      <div className={cn("pl-6 mt-1 space-y-1", !open && "hidden")}>{children}</div>
    </div>
  );
}
