// Player-facing text for verdicts: the banner under the rack and the values ARGUS's lines quote.
// Pure (no React) so it can be unit-tested.

import type { BoolExpr, State } from "../../engine/expr.ts";
import type { Level } from "../../engine/level.ts";
import type { Verdict } from "../../engine/types.ts";
import { missionHint } from "../../game/argusLines.ts";
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

/** The state a verdict is about: live → last state, lab → after the control, else the shown one. */
function keyState(v: Verdict): State | null {
  switch (v.kind) {
    case "init_failure":
    case "insufficient":
      return v.state;
    case "live_breach":
      return v.trace.at(-1)?.state ?? null;
    case "lab_breach":
      return v.after;
    case "holds":
      return null;
  }
}

/** Placeholder values for ARGUS's lines about `verdict` (see `game/argusLines.ts`). */
export function verdictVars(level: Level, law: BoolExpr, verdict: Verdict): Record<string, string> {
  const vars: Record<string, string> = {};
  const key = keyState(verdict);
  if (key) for (const x of level.vars) vars[x.name] = num(key[x.name] ?? 0);
  vars.law = formatExpr(law);
  if (key) vars.state = stateText(level, key);
  if (verdict.kind === "live_breach") {
    vars.moves = formatMoves(level, verdict);
    vars.count = String(verdict.trace.length - 1);
  }
  if (verdict.kind === "lab_breach") {
    vars.before = stateText(level, verdict.before);
    vars.after = stateText(level, verdict.after);
    vars.control = controlLabel(level, verdict.control);
  }
  return vars;
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

/**
 * Banner text for `verdict` on `law`. `failures` counts the failed engagements so far, this one
 * included; the hint gets more specific as it grows (`missionHint`).
 */
export function verdictCopy(
  level: Level,
  law: BoolExpr,
  verdict: Verdict,
  failures = 1,
): VerdictCopy {
  // Formulas and states never break across lines (narrow phones).
  const lawText = keep(formatExpr(law));
  const formatState = (lv: Level, s: State) => keep(stateText(lv, s), true);
  switch (verdict.kind) {
    case "init_failure":
      return {
        title: "Initialization failure",
        tag: "Power-on check",
        body: `The machine starts at ${formatState(level, verdict.state)}, and there your Law ${lawText} is already false.`,
        hint: missionHint(level, verdict.kind, failures),
      };
    case "live_breach": {
      const last = verdict.trace.at(-1)?.state ?? {};
      const n = verdict.trace.length - 1;
      return {
        title: "Law breached",
        tag: "Live attack",
        body: `From power-on, ${n} legal ${n === 1 ? "move reaches" : "moves reach"} ${formatState(level, last)}, where ${lawText} is false. Your Law is simply not true on the real machine.`,
        hint: missionHint(level, verdict.kind, failures),
      };
    }
    case "lab_breach":
      return {
        title: "Law breached",
        tag: "Lab simulation",
        body: `${lawText} may be true on every real run, but it does not protect itself: at ${formatState(level, verdict.before)} it holds, and one ${controlLabel(level, verdict.control)} gives ${formatState(level, verdict.after)}, where it fails.`,
        hint: missionHint(level, verdict.kind, failures),
      };
    case "insufficient":
      return {
        title: "Insufficient protection",
        tag: "Safety check",
        body: `${lawText} protects itself, but it allows ${formatState(level, verdict.state)}, which is a meltdown.`,
        hint: missionHint(level, verdict.kind, failures),
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
