import { useEffect, useRef } from "react";
import type { Level } from "../../engine/level.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";
import { revealElement } from "../motion.ts";
import { rebuild } from "./engage.ts";
import { verdictCopy } from "./verdictText.ts";

export function VerdictBanner({ level }: { level: Level }) {
  const verdict = useEngage((s) => s.verdict);
  const law = useEngage((s) => s.law);
  const delta = useEngage((s) => s.breachDelta);
  const hasResult = useEngage((s) => s.result !== null);
  const setPhase = useEngage((s) => s.setPhase);
  const breach = useMission((m) => m.breach);
  const failures = useMission((m) => m.failures);
  const ref = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    actionRef.current?.focus({ preventScroll: true });
    revealElement(ref.current);
  }, []);

  if (!verdict || !law) return null;
  // The banner shows once the verdict is recorded, so `failures` already counts this one.
  const copy = verdictCopy(level, law, verdict, failures);
  const holds = verdict.kind === "holds";

  return (
    <section
      ref={ref}
      className="verdict"
      data-kind={verdict.kind}
      data-testid="verdict"
      aria-labelledby="verdict-title"
    >
      <p className="verdict__tag">{copy.tag}</p>
      <h2 className="verdict__title" id="verdict-title">
        {copy.title}
      </h2>
      <p className="verdict__body">{copy.body}</p>
      {copy.hint && <p className="verdict__hint">{copy.hint}</p>}
      <div className="verdict__foot">
        {delta > 0 && (
          <p className="verdict__breach" data-testid="verdict-breach">
            AI breach +{delta}% <b>{breach}%</b>
          </p>
        )}
        {holds ? (
          hasResult && (
            <button
              ref={actionRef}
              type="button"
              className="verdict__action"
              onClick={() => setPhase("results")}
              data-testid="show-results"
            >
              View results
            </button>
          )
        ) : (
          <button
            ref={actionRef}
            type="button"
            className="verdict__action"
            onClick={rebuild}
            data-testid="rebuild"
          >
            Rebuild Law
          </button>
        )}
      </div>
    </section>
  );
}
