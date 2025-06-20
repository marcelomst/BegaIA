// /root/begasist/components/ui/SidebarLink.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarLinkProps = {
  href: string;
  label: string;
  icon?: ReactNode; // 👈 ahora es opcional
};


export function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 transition",
        isActive && "bg-gray-800 font-semibold"
      )}
    >
      {/* Si no hay icono, no se renderiza el span */}
      {icon && <span className="text-lg">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}
