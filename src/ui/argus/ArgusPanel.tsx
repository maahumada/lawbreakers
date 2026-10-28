import type { Level } from "../../engine/level.ts";
import { Slot } from "../layout/Slot.tsx";
import "./argus.css";

const BREACH_SEGMENTS = 20;

export function ArgusPanel({ level }: { level: Level }) {
  return (
    <aside className="argus fx-hexgrid" aria-label="ARGUS">
      <header className="argus__head">
        <h2 className="argus__name fx-glitch" data-text="ARGUS">
          ARGUS
        </h2>
        <p className="argus__status">
          <span className="argus__dot" aria-hidden /> Hostile process attached
        </p>
      </header>

      <Slot name="breach-meter" className="breach">
        <div className="breach__label">
          <span>AI breach</span>
          <span className="breach__value">0%</span>
        </div>
        <div className="breach__track" aria-hidden>
          {Array.from({ length: BREACH_SEGMENTS }, (_, i) => (
            <span key={i} className="breach__cell" />
          ))}
        </div>
      </Slot>

      <Slot name="argus-terminal" className="terminal fx-raster">
        <ol className="terminal__lines">
          {level.argus.intro.map((line) => (
            <li key={line}>
              <span className="terminal__prompt">&gt; ARGUS:</span> {line}
            </li>
          ))}
          <li className="fx-cursor" aria-hidden />
        </ol>
      </Slot>
    </aside>
  );
}
