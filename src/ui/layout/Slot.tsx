import type { ReactNode } from "react";

interface SlotProps {
  /** Stable name of the feature that will fill this slot (`data-slot`). */
  name: string;
  className?: string;
  children?: ReactNode;
}

/** Reserved area of the mission layout for a feature that lands in a later task. */
export function Slot({ name, className = "", children }: SlotProps) {
  return (
    <div className={`slot ${className}`} data-slot={name}>
      {children}
    </div>
  );
}
