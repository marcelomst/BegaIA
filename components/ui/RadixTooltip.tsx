// Path: /components/ui/RadixTooltip.tsx
import * as Tooltip from "@radix-ui/react-tooltip";

export function RadixTooltip({
  tip,
  children,
  side = "top",
}: {
  tip: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 bg-black text-white text-xs rounded px-2 py-1 shadow-lg animate-fade-in"
        >
          {tip}
          <Tooltip.Arrow className="fill-black" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
