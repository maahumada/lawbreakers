import type { KeyboardEvent, SyntheticEvent } from "react";
import { CONST_MAX, CONST_MIN } from "../../game/rack.ts";

interface DialProps {
  value: number;
  onChange: (value: number) => void;
  testId: string;
}

// Keep pointer/touch presses on the dial from starting a drag of the module it sits on.
const stop = (e: SyntheticEvent) => e.stopPropagation();

const KEY_STEP: Record<string, (v: number) => number> = {
  ArrowUp: (v) => v + 1,
  ArrowRight: (v) => v + 1,
  ArrowDown: (v) => v - 1,
  ArrowLeft: (v) => v - 1,
  PageUp: (v) => v + 5,
  PageDown: (v) => v - 5,
  Home: () => CONST_MIN,
  End: () => CONST_MAX,
};

/** Constant dial: −/+ buttons around a keyboard-operable spinbutton. */
export function Dial({ value, onChange, testId }: DialProps) {
  const onKey = (e: KeyboardEvent) => {
    const next = KEY_STEP[e.key];
    if (!next) return;
    e.preventDefault();
    onChange(next(value));
  };

  return (
    <span className="dial" onMouseDown={stop} onTouchStart={stop} onPointerDown={stop}>
      <button
        type="button"
        className="dial__btn"
        tabIndex={-1}
        aria-hidden
        disabled={value <= CONST_MIN}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span
        className="dial__value"
        role="spinbutton"
        tabIndex={0}
        aria-label="Constant"
        aria-valuemin={CONST_MIN}
        aria-valuemax={CONST_MAX}
        aria-valuenow={value}
        onKeyDown={onKey}
        data-testid={testId}
      >
        {value < 0 ? `−${-value}` : value}
      </span>
      <button
        type="button"
        className="dial__btn"
        tabIndex={-1}
        aria-hidden
        disabled={value >= CONST_MAX}
        onClick={() => onChange(value + 1)}
        data-testid={`${testId}-up`}
      >
        +
      </button>
    </span>
  );
}
