// The verification pipeline: init → live (BFS) → lab (Z3, per control) → safety (Z3) → holds.
// See docs/ARCHITECTURE.md "Verification pipeline". Never looks at level.solutions/knownWrong.

import type { BoolExpr, State } from "./expr.ts";
import { c, evalBool, ge, not, substBool, v } from "./expr.ts";
import type { Level } from "./level.ts";
import { initialState } from "./level.ts";
import type { BfsOptions } from "./simulate.ts";
import { applyUpdate, bfsAttack } from "./simulate.ts";
import { findModel } from "./smt.ts";
import type { Verdict } from "./types.ts";

/** Small-model escalation: try `|v| ≤ 10`, then `≤ 100`, then unbounded. */
export const MODEL_BOUNDS: readonly (number | undefined)[] = [10, 100, undefined];

/** D(s): every `nat` variable is ≥ 0. */
export function domainConstraints(level: Level): BoolExpr[] {
  return level.vars.filter((x) => x.domain === "nat").map((x) => ge(v(x.name), c(0)));
}

/** Smallest-bound model of `constraints` over the level's variables, or `null` if unsat. */
async function findSmallModel(level: Level, constraints: BoolExpr[]): Promise<State | null> {
  const vars = level.vars.map((x) => x.name);
  for (const bound of MODEL_BOUNDS) {
    const model = await findModel(constraints, vars, bound);
    if (model) return model;
  }
  return null;
}

export interface VerifyOptions {
  bfs?: BfsOptions;
}

export async function verify(
  level: Level,
  law: BoolExpr,
  opts: VerifyOptions = {},
): Promise<Verdict> {
  // 1. Init
  const s0 = initialState(level);
  if (!evalBool(law, s0)) return { kind: "init_failure", state: s0 };

  // 2. Live attack (fast path, unsound alone)
  const trace = bfsAttack(level, law, opts.bfs);
  if (trace) return { kind: "live_breach", trace };

  // 3. Lab: D(s) ∧ I(s) ∧ guard_t(s) ∧ D(s') ∧ ¬I(s'), with s' = update_t(s) substituted in.
  const domain = domainConstraints(level);
  for (const ctl of level.controls) {
    const post = ctl.update;
    const constraints = [
      ...domain,
      law,
      ctl.guard,
      ...domain.map((d) => substBool(d, post)),
      not(substBool(law, post)),
    ];
    const before = await findSmallModel(level, constraints);
    if (before) {
      const after = applyUpdate(level, ctl, before);
      // Z3 and the evaluator must agree; a mismatch is an engine bug, not a verdict.
      if (!evalBool(ctl.guard, before) || !evalBool(law, before) || evalBool(law, after)) {
        throw new Error(`verify: Z3 model disagrees with evaluator on control '${ctl.id}'`);
      }
      return { kind: "lab_breach", before, control: ctl.id, after };
    }
  }

  // 4. Safety: D(s) ∧ I(s) ∧ meltdown(s)
  const melt = await findSmallModel(level, [...domain, law, level.meltdown]);
  if (melt) {
    if (!evalBool(law, melt) || !evalBool(level.meltdown, melt)) {
      throw new Error("verify: Z3 model disagrees with evaluator on safety");
    }
    return { kind: "insufficient", state: melt };
  }

  return { kind: "holds" };
}
