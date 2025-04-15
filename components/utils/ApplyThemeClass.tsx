// /components/utils/ApplyThemeClass.tsx
"use client";

import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export function ApplyThemeClass() {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme]);

  return null;
}
