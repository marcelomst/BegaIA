// /components/ui/badge.tsx
import { cn } from "@/lib/utils";
import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
        variant === "success" && "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
        variant === "destructive" && "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
        className
      )}
      {...props}
    />
  );
}
