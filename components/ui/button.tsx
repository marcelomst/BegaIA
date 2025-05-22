// components/ui/button.tsx
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive" | "success" | "secondary" | "warning" | "info";
type Size = "default" | "sm" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const variantClasses: Record<Variant, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-500 text-white bg-transparent hover:bg-gray-800",
    ghost: "bg-transparent text-white hover:bg-gray-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    warning: "bg-yellow-500 text-black hover:bg-yellow-600",
    info: "bg-cyan-600 text-white hover:bg-cyan-700",
  };
  

  const sizeClasses = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1 text-sm",
    lg: "px-5 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "rounded transition-colors duration-200 focus:outline-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
``
