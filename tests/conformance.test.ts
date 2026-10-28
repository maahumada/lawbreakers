// M1-T7: every bundled mission is checked against the real engine. A level cannot regress silently:
// Safe(s0), nat-domain preservation, every solution holds and fits the hand and budget, and every
// known-wrong Law gets exactly its documented verdict.

import { afterAll, describe, expect, it } from "vitest";
import type { Expr } from "../src/engine/expr.ts";
import {
  and,
  c,
  evalBool,
  ge,
  not,
  pretty,
  scale,
  size,
  substBool,
  v,
} from "../src/engine/expr.ts";
import type { CardId, Level } from "../src/engine/level.ts";
import { cardOf, initialState, loadBundledLevels } from "../src/engine/level.ts";
import { findModel, shutdownZ3 } from "../src/engine/smt.ts";
import { domainConstraints, verify } from "../src/engine/verify.ts";

afterAll(shutdownZ3);

const levels = loadBundledLevels();

/** Every node of `e`, pre-order. */
function nodes(e: Expr): Expr[] {
  switch (e.k) {
    case "var":
    case "const":
    case "bool":
      return [e];
    case "add":
    case "sub":
    case "cmp":
    case "and":
    case "or":
      return [e, ...nodes(e.l), ...nodes(e.r)];
    case "scale":
    case "mod":
    case "not":
      return [e, ...nodes(e.e)];
  }
}

/** Cards `e` consumes, with multiplicity; `"unavailable"` counts nodes no card can build. */
function cardsUsed(e: Expr): Partial<Record<CardId | "unavailable", number>> {
  const used: Partial<Record<CardId | "unavailable", number>> = {};
  for (const n of nodes(e)) {
    const card = cardOf(n);
    if (card !== null) used[card] = (used[card] ?? 0) + 1;
  }
  return used;
}

/** Cards the Law needs beyond what the hand deals, e.g. `["ge: 1 > 0"]`; empty when buildable. */
function missingCards(level: Level, e: Expr): string[] {
  return Object.entries(cardsUsed(e)).flatMap(([card, n]) => {
    const have = card === "unavailable" ? 0 : (level.hand.cards[card as CardId] ?? 0);
    return n > have ? [`${card}: ${n} > ${have}`] : [];
  });
}

describe.each(levels.map((l) => [l.id, l] as const))("%s", (_id, level) => {
  it("power-on state is safe", () => {
    expect(evalBool(level.meltdown, initialState(level))).toBe(false);
  });

  it("every control keeps nat variables in their domain", async () => {
    const domain = domainConstraints(level);
    if (domain.length === 0) return;
    const allInDomain = domain.reduce((acc, d) => and(acc, d));
    const vars = level.vars.map((x) => x.name);
    for (const ctl of level.controls) {
      // D(s) ∧ guard(s) ∧ ¬D(s') must be unsatisfiable.
      const escape = await findModel(
        [...domain, ctl.guard, not(substBool(allInDomain, ctl.update))],
        vars,
      );
      expect(escape, `control '${ctl.id}' leaves the nat domain`).toBeNull();
    }
  });

  it.each(level.solutions.map((s) => [pretty(s), s] as const))(
    "solution %s holds",
    async (_law, law) => {
      expect(await verify(level, law)).toEqual({ kind: "holds" });
    },
  );

  it.each(level.solutions.map((s) => [pretty(s), s] as const))(
    "solution %s fits the hand and budget",
    (_law, law) => {
      expect(missingCards(level, law)).toEqual([]);
      expect(size(law)).toBeLessThanOrEqual(level.hand.budget);
    },
  );

  it.each(level.knownWrong.map((w) => [pretty(w.law), w.verdict, w] as const))(
    "known-wrong %s → %s",
    async (_law, verdict, w) => {
      expect((await verify(level, w.law)).kind).toBe(verdict);
    },
  );
});

describe("conformance helpers", () => {
  it("counts cards with multiplicity and flags unbuildable modules", () => {
    const [m06] = levels.slice(5);
    if (!m06) throw new Error("Mission 06 missing");
    const law = m06.solutions[0];
    if (!law) throw new Error("Mission 06 has no solution");
    expect(cardsUsed(law)).toEqual({ and: 1, add: 1, eq: 2, mod2: 1 });
    expect(missingCards(m06, and(law, law)).sort()).toEqual([
      "add: 2 > 1",
      "and: 3 > 1",
      "eq: 4 > 2",
      "mod2: 2 > 1",
    ]);
    expect(cardsUsed(scale(5, v("A")))).toEqual({ unavailable: 1 });
    expect(missingCards(m06, ge(scale(5, v("A")), c(0))).sort()).toEqual([
      "ge: 1 > 0",
      "unavailable: 1 > 0",
    ]);
  });
});
