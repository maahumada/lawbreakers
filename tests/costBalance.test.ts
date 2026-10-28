// M3-T7: no mission has a holding Law cheaper than its reference. Every Law the hand can build up
// to the reference cost (dial values −2…12) is enumerated and the survivors of cheap refutation go
// through the real `verify`. `npm run cost-search` prints the full report with a wider bound.

import { afterAll, describe, expect, it } from "vitest";
import { pretty } from "../src/engine/expr.ts";
import { evalBool } from "../src/engine/expr.ts";
import { initialState, lawCost, loadBundledLevels } from "../src/engine/level.ts";
import { shutdownZ3 } from "../src/engine/smt.ts";
import { buildableLaws, searchHolding } from "./fixtures/lawSearch.ts";

afterAll(shutdownZ3);

const CONSTS = Array.from({ length: 15 }, (_, i) => i - 2);

describe("cost balance", () => {
  it.each(loadBundledLevels().map((l) => [l.id, l] as const))(
    "%s: the reference Law is the cheapest that holds",
    async (_id, level) => {
      const [reference] = level.solutions;
      if (!reference) throw new Error("no reference");
      const refCost = lawCost(reference);
      const { holding } = await searchHolding(level, refCost, CONSTS);
      expect(holding.length).toBeGreaterThan(0);
      // The reference itself (or its mirror image) is among them; conformance checks it holds.
      expect(holding.map((h) => h.cost)).toEqual(holding.map(() => refCost));
    },
    30_000,
  );

  it("enumerates within the hand: Mission 01 has no Law needing two ADD cards", () => {
    const [m01] = loadBundledLevels();
    if (!m01) throw new Error("Mission 01 missing");
    const laws = buildableLaws(m01, 9, [0, 6]).map(pretty);
    expect(laws).toContain("A + B = 6");
    expect(laws).toContain("A >= 0");
    expect(laws.some((l) => (l.match(/\+/g) ?? []).length > 1)).toBe(false);
    expect(laws.every((l) => l.includes("A") || l.includes("B"))).toBe(true);
  });

  it("sample pruning drops exactly the Laws that disagree with a sample (Mission 06)", () => {
    const m06 = loadBundledLevels()[5];
    if (!m06) throw new Error("Mission 06 missing");
    const samples = [
      { state: initialState(m06), want: true },
      { state: { A: 4, B: 2 }, want: true },
      { state: { A: 3, B: 3 }, want: false },
      { state: { A: 0, B: 0 }, want: false },
    ];
    const agrees = (law: Parameters<typeof evalBool>[0]) =>
      samples.every((x) => evalBool(law, x.state) === x.want);
    const all = buildableLaws(m06, 17, [0, 6]);
    const pruned = buildableLaws(m06, 17, [0, 6], samples);
    expect(pruned.map(pretty).sort()).toEqual(all.filter(agrees).map(pretty).sort());
    expect(pruned.map(pretty)).toContain("A + B = 6 && A mod 2 = 0");
  });
});
