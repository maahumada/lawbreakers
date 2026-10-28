import type { Level } from "../../engine/level.ts";
import { rackText } from "../../game/rack.ts";
import { useRack } from "../../game/rackStore.ts";
import { typeset } from "../machine/format.ts";

/** Live formula under the rack (`?` for empty sockets) and the cost against the budget. */
export function Readout({ level }: { level: Level }) {
  const rack = useRack((s) => s.rack);
  const cost = useRack((s) => s.cost);
  const complete = useRack((s) => s.law !== null);
  const text = typeset(rackText(rack));
  const over = cost > level.hand.budget;

  return (
    <div className="readout">
      <p className="readout__law" data-complete={complete || undefined}>
        <span className="readout__tag">Law</span>
        <output className="readout__expr" data-testid="rack-readout" aria-label="Law formula">
          {text.split("?").map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="readout__hole">?</span>}
              {part}
            </span>
          ))}
        </output>
      </p>
      <p className="readout__cost" data-over={over || undefined} data-testid="rack-cost">
        Cost <b>{cost}</b> / Budget <b>{level.hand.budget}</b>
      </p>
    </div>
  );
}
