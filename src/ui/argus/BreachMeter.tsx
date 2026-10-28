import type { CSSProperties } from "react";
import { BREACH_MAX } from "../../engine/score.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";

const SEGMENTS = 20;
/** Marked on the track; crossing one makes the whole meter pulse. */
const THRESHOLDS = [50, 75] as const;

/** AI BREACH: 20 cells of 5%. The last verdict's delta flashes next to the value. Off in training. */
export function BreachMeter() {
  const breach = useMission((m) => m.breach);
  const delta = useEngage((s) => s.breachDelta);
  const training = useMission((m) => m.training);
  const lit = Math.round((breach / BREACH_MAX) * SEGMENTS);
  const fresh = Math.round(((breach - delta) / BREACH_MAX) * SEGMENTS);
  const crossed = THRESHOLDS.filter((t) => breach - delta < t && breach >= t).at(-1);

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
      data-training={training || undefined}
    >
      <div className="breach__label">
        <span>AI breach{training && <span className="breach__off"> (training: off)</span>}</span>
        <span className="breach__value">
          {delta > 0 && (
            <span key={`${breach}`} className="breach__delta">
              +{delta}%
            </span>
          )}
          {breach}%
        </span>
      </div>
      <div
        className="breach__track"
        aria-hidden
        style={{ "--fill-ms": `${Math.max(0, lit - fresh) * 90}ms` } as CSSProperties}
      >
        {THRESHOLDS.map((t) => (
          <span
            key={t}
            className="breach__mark"
            data-passed={breach >= t || undefined}
            style={{ "--at": `${t}%` } as CSSProperties}
          />
        ))}
        {crossed !== undefined && (
          <span key={breach} className="breach__pulse" data-testid="breach-pulse" />
        )}
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
