// /components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      "px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-500",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
