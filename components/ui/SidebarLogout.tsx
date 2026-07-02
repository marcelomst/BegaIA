// Path: /root/begasist/components/ui/SidebarLogout.tsx
"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

export function SidebarLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/auth/login");
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      className="mt-5 w-full justify-start border border-transparent text-[#FCA5A5] hover:border-[#FCA5A5]/20 hover:bg-[#4A1028] hover:text-red-100"
    >
      <LogOut className="w-5 h-5 mr-2" />
      <span className="truncate">Cerrar sesión</span>
    </Button>
  );
}
