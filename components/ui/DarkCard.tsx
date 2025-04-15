// /components/ui/DarkCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

type DarkCardProps = {
  title: ReactNode;
  description: string;
  children: ReactNode;
};

export function DarkCard({ title, description, children }: DarkCardProps) {
  return (
    <Card className="bg-background text-foreground border border-border shadow-md rounded-2xl min-h-[220px] h-auto transition-colors duration-300">
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div>
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}
