// Player-facing text for verdicts: the banner under the rack and the values ARGUS's lines quote.
// Pure (no React) so it can be unit-tested.

import type { BoolExpr, State } from "../../engine/expr.ts";
import type { Level } from "../../engine/level.ts";
import type { Verdict } from "../../engine/types.ts";
import { formatExpr } from "../machine/format.ts";

const num = (n: number) => (n < 0 ? `−${-n}` : String(n));

/** `A = 0, B = 6` in declaration order. */
export function formatState(level: Level, s: State): string {
  return level.vars.map((x) => `${x.name} = ${num(s[x.name] ?? 0)}`).join(", ");
}

const stateText = formatState;

/** Non-breaking spaces; with `atCommas`, still allow a break after each comma. */
const keep = (text: string, atCommas = false) =>
  atCommas
    ? text
        .split(", ")
        .map((p) => p.replace(/ /g, "\u00a0"))
        .join(", ")
    : text.replace(/ /g, "\u00a0");

export const controlLabel = (level: Level, id: string): string =>
  level.controls.find((c) => c.id === id)?.label ?? id;

/** Controls of a live trace, in order: `TRANSFER A→B, TRANSFER A→B`. */
export function formatMoves(level: Level, verdict: Verdict): string {
  if (verdict.kind !== "live_breach") return "";
  return verdict.trace
    .slice(1)
    .map((t) => controlLabel(level, t.control))
    .join(", ");
}

export interface VerdictCopy {
  /** Big title: `LAW BREACHED`, `THE LAW HOLDS`, … */
  title: string;
  /** Which attack: `LIVE ATTACK`, `LAB SIMULATION`, … */
  tag: string;
  /** What happened, with the concrete states. */
  body: string;
  /** What to do about it. */
  hint: string;
}

/** Banner text for `verdict` on `law`. */
export function verdictCopy(level: Level, law: BoolExpr, verdict: Verdict): VerdictCopy {
  // Formulas and states never break across lines (narrow phones).
  const lawText = keep(formatExpr(law));
  const formatState = (lv: Level, s: State) => keep(stateText(lv, s), true);
  switch (verdict.kind) {
    case "init_failure":
      return {
        title: "Initialization failure",
        tag: "Power-on check",
        body: `The machine starts at ${formatState(level, verdict.state)}, and there your Law ${lawText} is already false.`,
        hint: "A Law must be true before the first cycle. Check it against the power-on gauges.",
      };
    case "live_breach": {
      const last = verdict.trace.at(-1)?.state ?? {};
      const n = verdict.trace.length - 1;
      return {
        title: "Law breached",
        tag: "Live attack",
        body: `From power-on, ${n} legal ${n === 1 ? "move reaches" : "moves reach"} ${formatState(level, last)}, where ${lawText} is false. Your Law is simply not true on the real machine.`,
        hint: "Watch the telemetry: what stays the same no matter which control fires?",
      };
    }
    case "lab_breach":
      return {
        title: "Law breached",
        tag: "Lab simulation",
        body: `${lawText} may be true on every real run, but it does not protect itself: at ${formatState(level, verdict.before)} it holds, and one ${controlLabel(level, verdict.control)} gives ${formatState(level, verdict.after)}, where it fails.`,
        hint: "A Law must survive every control from every state it allows, not only the ones you have seen. Make it stronger.",
      };
    case "insufficient":
      return {
        title: "Insufficient protection",
        tag: "Safety check",
        body: `${lawText} protects itself, but it allows ${formatState(level, verdict.state)}, which is a meltdown.`,
        hint: "Your Law must rule out every meltdown state. Tighten it.",
      };
    case "holds":
      return {
        title: "The Law holds",
        tag: "Interlock sealed",
        body: `${lawText} is true at power-on, survives every control, and rules out meltdown. ARGUS found no way in.`,
        hint: "",
      };
  }
}
