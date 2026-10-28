import type { Control } from "../../engine/level.ts";
import { describeControl, formatEffect, formatGuard } from "./format.ts";

interface ControlCardProps {
  control: Control;
  armed: boolean;
  onFire: (id: string) => void;
}

export function ControlCard({ control, armed, onFire }: ControlCardProps) {
  return (
    <button
      type="button"
      className="control-card"
      disabled={!armed}
      onClick={() => onFire(control.id)}
      data-testid={`control-${control.id}`}
      aria-label={`${control.label}. ${describeControl(control)}${armed ? "" : " (locked)"}`}
    >
      <span className="control-card__head">
        <span className="control-card__lamp" aria-hidden />
        <span className="control-card__label">{control.label}</span>
        <span className="control-card__state">{armed ? "ARMED" : "LOCKED"}</span>
      </span>
      <span className="control-card__guard">{formatGuard(control.guard)}</span>
      <span className="control-card__effect">{formatEffect(control)}</span>
    </button>
  );
}
