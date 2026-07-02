// Path: /root/begasist/components/ui/SidebarLink.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarLinkProps = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[#F4DDF0] transition-colors hover:bg-[#3A123F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBE8F7]",
        isActive && "bg-[#AB0389] font-semibold text-white shadow-sm",
        !label && "justify-center"
      )}
    >
      {icon && <span className="text-lg text-current">{icon}</span>}
      {label && <span>{label}</span>}
    </Link>
  );
}
