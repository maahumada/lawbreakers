import { useCallback, useEffect, useRef, useState } from "react";
import type { Level } from "../../engine/level.ts";
import {
  SCORE_PER_FAILED_ATTEMPT,
  SCORE_PER_INTEGRITY_POINT,
  SCORE_PER_COST_POINT,
} from "../../engine/score.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";
import { retry } from "../argus/engage.ts";
import { useCountUp } from "../argus/useCountUp.ts";
import { formatExpr } from "../machine/format.ts";
import { ShowTheProof } from "../proof/ShowTheProof.tsx";

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

const clock = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

interface Props {
  level: Level;
  /** The mission after this one, if any. */
  next: Level | undefined;
}

/**
 * THE LAW HOLDS: score breakdown, the Law, retry / next mission. A training win records no score,
 * so its variant drops the tubes, the breakdown and the breach, and says why.
 */
export function ResultsOverlay({ level, next }: Props) {
  const training = useMission((m) => m.training);
  const result = useEngage((s) => s.result);
  const law = useEngage((s) => s.law);
  const setPhase = useEngage((s) => s.setPhase);
  const firstRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const total = useCountUp(result?.score.total ?? 0);
  const [proofOpen, setProofOpen] = useState(false);
  const closeProof = useCallback(() => setProofOpen(false), []);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhase("verdict");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPhase]);

  if (!result || !law) return null;
  const { score } = result;
  const rows = [
    { label: "Law holds", how: "base", value: score.base },
    {
      label: "Efficiency",
      how: `${SCORE_PER_COST_POINT} × (budget ${result.budget} − cost ${result.cost})`,
      value: score.efficiency,
    },
    {
      label: "Integrity",
      how: `${SCORE_PER_INTEGRITY_POINT} × (100 − breach ${result.breach})`,
      value: score.integrity,
    },
    {
      label: "Failed attempts",
      how: `${SCORE_PER_FAILED_ATTEMPT} × ${result.attempts - 1}`,
      value: score.attempts,
    },
    { label: "Time bonus", how: `solved in ${clock(result.elapsedMs)}`, value: score.time },
  ];
  const digits = String(total).padStart(4, "0").split("");

  return (
    <div className="overlay" data-testid="results" data-training={training || undefined}>
      <section
        className="results panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="results-title"
      >
        <div className="results__head">
          <p className="results__mission">
            Mission {level.id.slice(0, 2)}: {level.title}
          </p>
          <h2 className="results__title fx-glow" id="results-title">
            The Law holds
          </h2>
          {training && (
            <p className="results__training" data-testid="results-training">
              Training run: the mission counts as secured, but no score is recorded.
            </p>
          )}
        </div>

        {!training && (
          <>
            <div className="results__score">
              <div className="results__tubes" role="img" aria-label={`Score ${score.total}`}>
                {digits.map((d, i) => (
                  <span key={`${i}-${d}`} className="tube" aria-hidden>
                    {d}
                  </span>
                ))}
              </div>
              <p className="results__best" data-testid="results-best">
                {result.newBest ? "New best for this mission" : `Best ${result.best}`}
              </p>
            </div>

            <table className="results__table">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    <td className="results__how">{r.how}</td>
                    <td className="results__value" data-negative={r.value < 0 || undefined}>
                      {signed(r.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Score</th>
                  <td className="results__how" />
                  <td className="results__value" data-testid="results-total">
                    {score.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        <dl className="results__facts">
          <div className="results__law">
            <dt>Your Law</dt>
            <dd>{formatExpr(law)}</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd data-over={result.cost > result.budget || undefined}>
              {result.cost} / {result.budget}
            </dd>
          </div>
          <div>
            <dt>Attempts</dt>
            <dd>{result.attempts}</dd>
          </div>
          {!training && (
            <div>
              <dt>AI breach</dt>
              <dd>{result.breach}%</dd>
            </div>
          )}
        </dl>

        <div className="results__actions">
          {next ? (
            <a
              ref={firstRef}
              className="results__btn results__btn--primary"
              href={`?mission=${next.id.slice(0, 2)}`}
              data-testid="next-mission"
            >
              Next mission
            </a>
          ) : (
            <p className="results__end">Last mission cleared.</p>
          )}
          <button
            type="button"
            className="results__btn results__btn--proof"
            onClick={() => setProofOpen(true)}
            data-testid="show-proof"
          >
            Show the proof
          </button>
          <button
            ref={next ? undefined : firstRef}
            type="button"
            className="results__btn"
            onClick={() => retry(level)}
            data-testid="retry"
          >
            Retry mission
          </button>
          <button
            type="button"
            className="results__btn results__btn--quiet"
            onClick={() => setPhase("verdict")}
          >
            Back to console
          </button>
        </div>
      </section>
      {proofOpen && <ShowTheProof level={level} law={law} onClose={closeProof} />}
    </div>
  );
}
