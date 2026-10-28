// M3-T3: ARGUS's line pools (global + per mission), the aftermath lines and the escalating hints.

import { describe, expect, it } from "vitest";
import { pretty } from "../src/engine/expr.ts";
import type { Level } from "../src/engine/level.ts";
import { initialState, loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import type { BreachKind } from "../src/engine/score.ts";
import type { Verdict, VerdictKind } from "../src/engine/types.ts";
import { VERDICT_KINDS } from "../src/engine/types.ts";
import {
  aftermathLines,
  ARGUS_LINES,
  fillLine,
  GENERIC_HINTS,
  hintLadder,
  MENACE_HIGH,
  MENACE_MID,
  missionHint,
  pickVerdictLines,
  verdictPools,
} from "../src/game/argusLines.ts";
import { formatExpr } from "../src/ui/machine/format.ts";
import { verdictCopy, verdictVars } from "../src/ui/argus/verdictText.ts";

const levels = loadBundledLevels();
const byNumber = (n: string): Level => {
  const level = levels.find((l) => l.id.startsWith(n));
  if (!level) throw new Error(`mission ${n} missing`);
  return level;
};
const m01 = byNumber("01");

const BREACH_KINDS = VERDICT_KINDS.filter((k): k is BreachKind => k !== "holds");

/** A plausible verdict of `kind` for `level` (the values only feed placeholders). */
function sample(level: Level, kind: VerdictKind): Verdict {
  const s0 = initialState(level);
  const control = level.controls[0]?.id ?? "";
  switch (kind) {
    case "init_failure":
    case "insufficient":
      return { kind, state: s0 };
    case "live_breach":
      return {
        kind,
        trace: [
          { control: "", state: s0 },
          { control, state: s0 },
        ],
      };
    case "lab_breach":
      return { kind, before: s0, control, after: s0 };
    case "holds":
      return { kind };
  }
}

/** Fixed sequence of "random" numbers, cycling. */
const seq =
  (...xs: number[]) =>
  () => {
    const x = xs.shift() ?? 0;
    xs.push(x);
    return x;
  };

describe("ARGUS verdict lines", () => {
  it("mixes the mission's taunts and rattled lines into the global pools", () => {
    for (const level of levels) {
      for (const kind of BREACH_KINDS) {
        const pools = verdictPools(level, kind);
        for (const t of level.argus.taunts?.[kind] ?? []) expect(pools.closing).toContain(t);
        for (const g of ARGUS_LINES.verdict[kind].closing) expect(pools.closing).toContain(g);
      }
      for (const r of level.argus.rattled ?? []) {
        expect(verdictPools(level, "holds").closing).toContain(r);
      }
    }
  });

  it("is deterministic for an injected random source and quotes the counterexample", () => {
    const v: Verdict = {
      kind: "live_breach",
      trace: [
        { control: "", state: { A: 2, B: 4 } },
        { control: "a2b", state: { A: 1, B: 5 } },
        { control: "a2b", state: { A: 0, B: 6 } },
      ],
    };
    const vars = verdictVars(m01, parseBool("A >= 1"), v);
    expect(vars).toMatchObject({
      A: "0",
      B: "6",
      count: "2",
      state: "A = 0, B = 6",
      moves: "TRANSFER A→B, TRANSFER A→B",
      law: "A ≥ 1",
    });
    // 0 → first found line; 0.999 → last closing line, which is the mission's last taunt.
    const lines = pickVerdictLines(m01, "live_breach", vars, seq(0, 0.999));
    expect(lines.found).toBe("VULNERABILITY DETECTED. EXECUTING: TRANSFER A→B, TRANSFER A→B.");
    expect(lines.closing).toBe("2 TRANSFERS. NOTHING CREATED, NOTHING DESTROYED. EXCEPT YOUR LAW.");
    expect(pickVerdictLines(m01, "live_breach", vars, seq(0, 0.999))).toEqual(lines);
  });

  it("uses negative values with a real minus sign in gauge placeholders", () => {
    const m05 = byNumber("05");
    const vars = verdictVars(m05, parseBool("x >= 0"), {
      kind: "lab_breach",
      before: { x: 0, y: 1 },
      control: "pull",
      after: { x: -1, y: 0 },
    });
    expect(vars).toMatchObject({ x: "−1", y: "0", after: "x = −1, y = 0", control: "HOIST" });
  });

  it("every placeholder in every pool resolves for its verdict kind", () => {
    const law = parseBool("true");
    for (const level of levels) {
      for (const kind of VERDICT_KINDS) {
        const vars = verdictVars(level, law, sample(level, kind));
        const pools = verdictPools(level, kind);
        for (const line of [...pools.found, ...pools.closing]) {
          expect(fillLine(line, vars), `${level.id} ${kind}: ${line}`).not.toMatch(/\{\w+\}/);
        }
      }
      for (const line of level.argus.intro) expect(line).not.toMatch(/\{\w+\}/);
    }
  });

  it("keeps ARGUS in capitals and hints in sentence case", () => {
    for (const level of levels) {
      const lines = [
        ...level.argus.intro,
        ...Object.values(level.argus.taunts ?? {}).flat(),
        ...(level.argus.rattled ?? []),
      ];
      for (const line of lines)
        expect(line.replace(/\{\w+\}/g, "")).toBe(line.replace(/\{\w+\}/g, "").toUpperCase());
    }
  });
});

describe("ARGUS aftermath", () => {
  const fail = (breachBefore: number, breachAfter: number, failures = 1) =>
    aftermathLines({ kind: "live_breach", breachBefore, breachAfter, failures }, () => 0);

  it("stays quiet at low breach", () => {
    expect(fail(0, 20)).toEqual([]);
    expect(fail(20, 40)).toEqual([]);
  });

  it("gloats once when the breach first reaches the midpoint", () => {
    expect(fail(40, MENACE_MID)).toEqual([
      `BREACH AT ${MENACE_MID}%. HALF YOUR FACILITY ANSWERS TO ME.`,
    ]);
    expect(fail(MENACE_MID, 65)).toEqual([]);
  });

  it("threatens after every failure from the high mark, but not at 100%", () => {
    expect(fail(65, MENACE_HIGH)).toEqual([`${MENACE_HIGH}%. ONE MORE MISTAKE, LAWSMITH.`]);
    expect(fail(80, 95)).toEqual(["95%. ONE MORE MISTAKE, LAWSMITH."]);
    expect(fail(95, 100)).toEqual([]);
  });

  it("training (breach never moves) gets no threats", () => {
    expect(fail(0, 0, 7)).toEqual([]);
  });

  it("comments on how the win came", () => {
    const win = (failures: number) =>
      aftermathLines({ kind: "holds", breachBefore: 0, breachAfter: 0, failures }, () => 0);
    expect(win(0)).toEqual([ARGUS_LINES.holdsFirstTry[0]]);
    expect(win(1)).toEqual([]);
    expect(win(4)).toEqual(["4 FAILURES, AND STILL YOU WON. I WILL NEED FEWER NEXT TIME."]);
  });
});

describe("mission hints", () => {
  it("climb from generic to specific with failures, then stay on the last rung", () => {
    const ladder = hintLadder(m01, "live_breach");
    expect(missionHint(m01, "live_breach", 1)).toBe(
      "Watch the total of both cells while they move.",
    );
    expect(missionHint(m01, "live_breach", 0)).toBe(ladder[0]);
    expect(missionHint(m01, "live_breach", 3)).toBe(ladder[2]);
    expect(missionHint(m01, "live_breach", 9)).toBe(ladder.at(-1));
    expect(missionHint(byNumber("04"), "live_breach", 1)).toBe("Count by twos.");
  });

  it("explain the verdict kind first when the mission has no list for it", () => {
    expect(missionHint(m01, "lab_breach", 1)).toBe(GENERIC_HINTS.lab_breach);
    expect(missionHint(m01, "lab_breach", 2)).toBe(m01.argus.hints.default[0]);
    expect(missionHint(m01, "init_failure", 5)).toBe(GENERIC_HINTS.init_failure);
  });

  it("replace the generic live-breach hint in the verdict banner", () => {
    const v: Verdict = {
      kind: "live_breach",
      trace: [
        { control: "", state: { A: 2, B: 4 } },
        { control: "a2b", state: { A: 1, B: 5 } },
      ],
    };
    const first = verdictCopy(m01, parseBool("A = 2"), v, 1).hint;
    const third = verdictCopy(m01, parseBool("A = 2"), v, 3).hint;
    expect(first).toBe("Watch the total of both cells while they move.");
    expect(third).not.toBe(first);
    expect(third).toContain("ADD");
  });

  it("never spell out a reference Law", () => {
    const squash = (s: string) => s.toLowerCase().replace(/[\s\u00a0]+/g, "");
    for (const level of levels) {
      const answers = level.solutions.flatMap((s) => [pretty(s), formatExpr(s)]).map(squash);
      for (const kind of BREACH_KINDS) {
        for (const hint of hintLadder(level, kind)) {
          for (const answer of answers)
            expect(squash(hint), `${level.id}: ${hint}`).not.toContain(answer);
          expect(hint).not.toMatch(/\d+\s*[=≥≤<>]|[=≥≤<>]\s*\d+/);
        }
      }
    }
  });

  it("every mission escalates: at least three rungs for a live breach", () => {
    for (const level of levels)
      expect(hintLadder(level, "live_breach").length).toBeGreaterThanOrEqual(3);
  });
});
