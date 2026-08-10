// Path: /app/layout.tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ApplyThemeClass } from "@/components/utils/ApplyThemeClass";
import { Toaster } from "sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip"; // 👈 IMPORTANTE
import "./globals.css";

export const metadata: Metadata = {
  title: "BegAI",
  description: "Asistente conversacional hotelero",
  icons: {
    icon: "/brand/begaia-favicon-base-512.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <ApplyThemeClass />
          {/* 👇 Envolvé children en el TooltipProvider */}
          <TooltipProvider delayDuration={250}>
            {children}
          </TooltipProvider>
        </ThemeProvider>

        {/* ✅ Toasts globales */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
