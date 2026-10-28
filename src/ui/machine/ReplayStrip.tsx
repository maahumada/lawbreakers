import { evalBool } from "../../engine/expr.ts";
import type { Level } from "../../engine/level.ts";
import type { Verdict } from "../../engine/types.ts";
import { useEngage } from "../../game/engageStore.ts";
import type { Display } from "../../game/missionStore.ts";
import { useMission } from "../../game/missionStore.ts";
import { controlLabel, formatState } from "../argus/verdictText.ts";
import { formatExpr } from "./format.ts";

const TITLE: Record<Display["mode"], string> = {
  live: "Live attack on the real machine",
  lab: "Lab simulation",
  meltdown: "Meltdown allowed by your Law",
  init: "Power-on state",
  holds: "Interlock sealed",
};

function subtitle(level: Level, display: Display, cycle: number, verdict: Verdict | null): string {
  switch (display.mode) {
    case "live":
      return cycle === 0
        ? "Power-on, cycle 0"
        : `Cycle ${cycle}: ${controlLabel(level, display.firing ?? "")}`;
    case "lab":
      if (verdict?.kind !== "lab_breach") return "";
      return display.firing
        ? `${formatState(level, verdict.before)}, then ${controlLabel(level, verdict.control)}`
        : "A state ARGUS invented where your Law is true";
    case "meltdown":
      return "Your Law is true here, and so is the meltdown";
    case "init":
      return "Before any control fires";
    case "holds":
      return "No state breaks the Law";
  }
}

/** What the gauges show right now, and how the engaged Law and the meltdown read on it. */
export function ReplayStrip({ level, display }: { level: Level; display: Display }) {
  const state = useMission((m) => m.state);
  const cycle = useMission((m) => m.log.at(-1)?.cycle ?? 0);
  const law = useEngage((s) => s.law);
  const verdict = useEngage((s) => s.verdict);
  const lawOk = law ? evalBool(law, state) : null;
  const melt = evalBool(level.meltdown, state);

  return (
    <div className="replay" data-testid="replay-strip" data-mode={display.mode}>
      <p className="replay__head">
        <span className="replay__title">{TITLE[display.mode]}</span>
        <span className="replay__sub">{subtitle(level, display, cycle, verdict)}</span>
      </p>
      <dl className="probe">
        {law && (
          <div className="probe__row" data-ok={lawOk || undefined} data-testid="probe-law">
            <dt>Your Law</dt>
            <dd className="probe__expr">{formatExpr(law)}</dd>
            <dd className="probe__value">{lawOk ? "True" : "False"}</dd>
          </div>
        )}
        <div
          className="probe__row probe__row--melt"
          data-ok={!melt || undefined}
          data-testid="probe-meltdown"
        >
          <dt>Meltdown</dt>
          <dd className="probe__expr">{formatExpr(level.meltdown)}</dd>
          <dd className="probe__value">{melt ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}
