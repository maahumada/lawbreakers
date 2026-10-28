import { useEffect, useRef } from "react";
import type { Level } from "../../engine/level.ts";
import { useMission } from "../../game/missionStore.ts";
import { retry } from "../argus/engage.ts";

/** Breach reached 100%: the facility falls. Retry restarts the mission from the briefing. */
export function MissionFailedOverlay({ level }: { level: Level }) {
  const attempts = useMission((m) => m.attempts);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="overlay overlay--failed" data-testid="mission-failed">
      <section
        className="failed"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="failed-title"
        aria-describedby="failed-body"
      >
        <h2 className="failed__title fx-glitch" data-text="Mission failed" id="failed-title">
          Mission failed
        </h2>
        <p className="failed__body" id="failed-body">
          ARGUS reached 100% breach after {attempts} failed Laws. The facility has fallen. Retry
          starts the mission over from the briefing, with the breach back at 0%.
        </p>
        <p className="failed__tip">
          Stuck? Training mode (on mission select) turns the breach meter off. Wins still unlock the
          next mission.
        </p>
        <div className="failed__actions">
          <button
            ref={ref}
            type="button"
            className="failed__retry"
            onClick={() => retry(level)}
            data-testid="failed-retry"
          >
            Retry mission
          </button>
          <a className="failed__missions" href="?missions" data-testid="failed-missions">
            Mission select
          </a>
        </div>
      </section>
    </div>
  );
}
