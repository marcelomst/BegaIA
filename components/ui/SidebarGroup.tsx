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
          "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#F4DDF0] transition-colors hover:bg-[#3A123F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBE8F7]",
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
      <div className={cn("mt-1 space-y-1 border-l border-[#6F3A68] pl-3 ml-4", !open && "hidden")}>{children}</div>
    </div>
  );
}
