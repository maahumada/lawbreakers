import type { MouseEvent } from "react";
import { useSound } from "../../audio/sound.ts";
import "./fx.css";

/** The global mute switch, in every screen's top bar. */
export function SoundToggle() {
  const muted = useSound((s) => s.muted);
  const toggle = useSound((s) => s.toggle);
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={!muted}
      onClick={(e: MouseEvent) => {
        // The intro treats a click anywhere as "skip"; the switch is not part of that.
        e.stopPropagation();
        toggle();
      }}
      data-testid="sound-toggle"
      data-sfx="off"
    >
      <svg className="sound-toggle__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
        {muted ? (
          <path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        ) : (
          <path
            d="M11 5.5c1 .8 1 4.2 0 5M13 4c2 1.6 2 6.4 0 8"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
        )}
      </svg>
      Sound {muted ? "off" : "on"}
    </button>
  );
}
