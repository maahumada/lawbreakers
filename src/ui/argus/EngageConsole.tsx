import type { Level } from "../../engine/level.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useRack } from "../../game/rackStore.ts";
import { engage } from "./engage.ts";
import { VerdictBanner } from "./VerdictBanner.tsx";

/** The slot under the rack: ENGAGE, then ARGUS's progress, then the verdict banner. */
export function EngageConsole({ level }: { level: Level }) {
  const phase = useEngage((s) => s.phase);
  const lastLine = useEngage((s) => s.lines.at(-1));
  const lawComplete = useRack((r) => r.law !== null);

  if (phase === "idle") {
    return (
      <button
        type="button"
        className="engage"
        disabled={!lawComplete}
        data-ready={lawComplete || undefined}
        onClick={() => engage(level)}
        data-testid="engage"
      >
        Engage interlock
      </button>
    );
  }

  if (phase === "attacking" || phase === "replaying") {
    // Mirrors ARGUS's terminal for phones, where the terminal sits below the fold.
    return (
      <div className="engage-status" data-testid="engage-status">
        <span className="engage-status__tag">
          <span className="engage-status__dot" aria-hidden />
          {phase === "attacking" ? "ARGUS is attacking your Law" : "Replaying the attack"}
        </span>
        <span className="engage-status__line" aria-hidden>
          {lastLine?.text}
        </span>
      </div>
    );
  }

  return <VerdictBanner level={level} />;
}
