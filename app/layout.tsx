// /app/layout.tsx
import { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import { ApplyThemeClass } from "@/components/utils/ApplyThemeClass";
import "./globals.css";

export const metadata: Metadata = {
  title: "Begasist",
  description: "Asistente conversacional hotelero",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <ApplyThemeClass />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
