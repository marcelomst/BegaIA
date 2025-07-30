// Path: /root/begasist/components/ui/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="ml-2 rounded p-1 bg-gray-800 hover:bg-gray-700 text-yellow-400 dark:text-blue-200 transition"
      onClick={toggleTheme}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      type="button"
      tabIndex={0}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
