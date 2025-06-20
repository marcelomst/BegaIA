// Path: /root/begasist/components/ui/switch.tsx
import React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  className = "",
}) => {
  return (
    <span
      className={`relative inline-block w-10 h-5 align-middle select-none transition ${className}`}
      tabIndex={0}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span
        className={`block w-10 h-5 rounded-full transition-colors duration-300 ${
          checked ? "bg-green-500" : "bg-gray-300"
        }`}
      ></span>
      <span
        className={`
          absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow
          transition-transform duration-300
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      ></span>
    </span>
  );
};
