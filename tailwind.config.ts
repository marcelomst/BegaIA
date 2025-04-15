/** @type {import('tailwindcss').Config} */
import type { Config } from "tailwindcss";

export default {
  darkMode: "class", // 👈 AGREGAR ESTA LÍNEA

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)", 
        "muted-foreground": "var(--muted-foreground)", 
      },
    },
  },
  plugins: [],
} satisfies Config;
