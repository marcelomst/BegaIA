// components/ui/button.tsx
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
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
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-500 text-white bg-transparent hover:bg-gray-800",
    ghost: "bg-transparent text-white hover:bg-gray-700",
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
