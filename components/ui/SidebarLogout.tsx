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
      className="w-full justify-start mt-4 text-red-500 hover:bg-red-500/10"
    >
      <LogOut className="w-5 h-5 mr-2" />
      <span className="truncate">Cerrar sesión</span>
    </Button>
  );
}
