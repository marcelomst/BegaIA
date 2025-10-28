// /components/ui/DarkCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

type DarkCardProps = {
  title?: ReactNode;         // Hacelo opcional para usar como contenedor simple también
  description?: string;
  children: ReactNode;
  className?: string;        // ⭐️ Agregá esto
};

export function DarkCard({ title, description, children, className }: DarkCardProps) {
  return (
    <Card className={`bg-background text-foreground border border-border shadow-md rounded-2xl min-h-[220px] h-auto transition-colors duration-300 ${className || ""}`}>
      <CardContent className="p-6 flex flex-col justify-between h-full">
        {/* Solo muestra el título/desc si están */}
        {(title || description) && (
          <div>
            {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
          </div>
        )}
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}
