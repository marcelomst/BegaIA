// Path: /root/begasist/components/ui/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="ml-2 rounded-lg border border-white/15 bg-white/10 p-1.5 text-[#F4DDF0] transition hover:bg-[#3A123F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBE8F7]"
      onClick={toggleTheme}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      type="button"
      tabIndex={0}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
