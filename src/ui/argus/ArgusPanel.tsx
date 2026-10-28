import { Slot } from "../layout/Slot.tsx";
import { BreachMeter } from "./BreachMeter.tsx";
import { Terminal } from "./Terminal.tsx";
import "./argus.css";

export function ArgusPanel() {
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

      <Slot name="breach-meter">
        <BreachMeter />
      </Slot>

      <Slot name="argus-terminal">
        <Terminal />
      </Slot>
    </aside>
  );
}
