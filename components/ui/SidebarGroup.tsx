// components/ui/SidebarGroup.tsx
"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarGroupProps {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SidebarGroup({ label, icon, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center w-full px-3 py-2 rounded hover:bg-gray-800 text-left text-sm font-medium text-white"
      >
        {icon && <span className="mr-2 text-lg">{icon}</span>}
        <span className="flex-1">{label}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      <div className={cn("pl-6 mt-1 space-y-1", !open && "hidden")}>{children}</div>
    </div>
  );
}
