import type { CSSProperties } from "react";
import { BREACH_MAX } from "../../engine/score.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";

const SEGMENTS = 20;

/** AI BREACH: 20 cells of 5%. The last verdict's delta flashes next to the value. */
export function BreachMeter() {
  const breach = useMission((m) => m.breach);
  const delta = useEngage((s) => s.breachDelta);
  const lit = Math.round((breach / BREACH_MAX) * SEGMENTS);
  const fresh = Math.round(((breach - delta) / BREACH_MAX) * SEGMENTS);

  return (
    <div
      className="breach"
      role="meter"
      aria-label="AI breach"
      aria-valuemin={0}
      aria-valuemax={BREACH_MAX}
      aria-valuenow={breach}
      data-testid="breach-meter"
      data-value={breach}
      data-critical={breach >= 60 || undefined}
    >
      <div className="breach__label">
        <span>AI breach</span>
        <span className="breach__value">
          {delta > 0 && (
            <span key={`${breach}`} className="breach__delta">
              +{delta}%
            </span>
          )}
          {breach}%
        </span>
      </div>
      <div className="breach__track" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="breach__cell"
            data-lit={i < lit || undefined}
            data-new={(i >= fresh && i < lit) || undefined}
            style={{ "--i": i - fresh } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
