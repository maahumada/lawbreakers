import type { Control } from "../../engine/level.ts";
import { describeControl, formatEffect, formatGuard } from "./format.ts";

interface ControlCardProps {
  control: Control;
  armed: boolean;
  /** ARGUS has the controls: nothing can be pressed, the lamps still show ARMED/LOCKED. */
  locked?: boolean;
  /** This control just fired in a replay. */
  firing?: boolean;
  onFire: (id: string) => void;
}

export function ControlCard({
  control,
  armed,
  locked = false,
  firing = false,
  onFire,
}: ControlCardProps) {
  return (
    <button
      type="button"
      className="control-card"
      disabled={!armed || locked}
      data-armed={armed || undefined}
      data-firing={firing || undefined}
      onClick={() => onFire(control.id)}
      data-testid={`control-${control.id}`}
      aria-describedby={`control-desc-${control.id}`}
    >
      <span className="visually-hidden" id={`control-desc-${control.id}`}>
        {describeControl(control)}
      </span>
      <span className="control-card__head">
        <span className="control-card__lamp" aria-hidden />
        <span className="control-card__label">{control.label}</span>
        <span className="control-card__state">{firing ? "FIRED" : armed ? "ARMED" : "LOCKED"}</span>
      </span>
      <span className="control-card__guard">{formatGuard(control.guard)}</span>
      <span className="control-card__effect">{formatEffect(control)}</span>
    </button>
  );
}
