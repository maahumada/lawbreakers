// Human-readable control and meltdown text for the machine view, e.g. "IF A ≥ 1: A −1, B +1".
// Pure (no React) so it can be unit-tested.

import type { BoolExpr, NumExpr } from "../../engine/expr.ts";
import { pretty } from "../../engine/expr.ts";
import type { Control } from "../../engine/level.ts";

const SYMBOLS: [RegExp, string][] = [
  [/>=/g, "≥"],
  [/<=/g, "≤"],
  [/!=/g, "≠"],
  [/&&/g, "AND"],
  [/\|\|/g, "OR"],
  [/!/g, "NOT "],
  [/ \* /g, "×"],
  [/\bmod\b/g, "MOD"],
  [/ - /g, " − "],
  [/^-|(?<=[\s(])-/g, "−"],
  [/\btrue\b/g, "TRUE"],
  [/\bfalse\b/g, "FALSE"],
];

/** Typographic operators for `pretty`-syntax text: `A >= 1 && !(B = 0)` → `A ≥ 1 AND NOT (B = 0)`. */
export function typeset(text: string): string {
  return SYMBOLS.reduce((acc, [re, sym]) => acc.replace(re, sym), text);
}

/** `pretty` with typographic operators. */
export function formatExpr(e: BoolExpr | NumExpr): string {
  return typeset(pretty(e));
}

/** Guard line of a control card: `IF A ≥ 1`, or `ALWAYS` for an unconditional control. */
export function formatGuard(guard: BoolExpr): string {
  return guard.k === "bool" && guard.value ? "ALWAYS" : `IF ${formatExpr(guard)}`;
}

/** One assignment: `A −1` for `A := A - 1`, `x +y` for `x := x + y`, else `A := …`. */
function formatAssign(name: string, e: NumExpr): string {
  if ((e.k === "add" || e.k === "sub") && e.l.k === "var" && e.l.name === name) {
    const sign = e.k === "add" ? "+" : "−";
    if (e.r.k === "const" && e.r.value < 0) {
      return `${name} ${e.k === "add" ? "−" : "+"}${-e.r.value}`;
    }
    return `${name} ${sign}${formatExpr(e.r)}`;
  }
  return `${name} := ${formatExpr(e)}`;
}

/** Effect line of a control card: `A −1, B +1`. Assignments that keep a value are omitted. */
export function formatEffect(ctl: Control): string {
  const parts = Object.entries(ctl.update)
    .filter(([name, e]) => !(e.k === "var" && e.name === name))
    .map(([name, e]) => formatAssign(name, e));
  return parts.length > 0 ? parts.join(", ") : "NO EFFECT";
}

/** Guard and effect on one line: `IF A ≥ 1: A −1, B +1`. */
export function describeControl(ctl: Control): string {
  return `${formatGuard(ctl.guard)}: ${formatEffect(ctl)}`;
}

/**
 * Full scale of the gauge bars: the smallest of 10, 20, 50, 100, 200, 500, … that covers
 * `maxAbs`. Rounded steps keep the bars from rescaling on every cycle when a ℤ gauge runs away
 * (Mission 05's momentum grows quadratically).
 */
export function gaugeScale(maxAbs: number): number {
  let scale = 10;
  for (;;) {
    for (const k of [1, 2, 5]) {
      if (maxAbs <= scale * k) return scale * k;
    }
    scale *= 10;
  }
}
