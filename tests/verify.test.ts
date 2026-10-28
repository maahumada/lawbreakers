import { afterAll, describe, expect, it } from "vitest";
import { evalBool } from "../src/engine/expr.ts";
import { loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import { step, TRACE_START } from "../src/engine/simulate.ts";
import { shutdownZ3 } from "../src/engine/smt.ts";
import { verify } from "../src/engine/verify.ts";
import { counter, mkLevel } from "./fixtures/levels.ts";

afterAll(shutdownZ3);

const [m01] = loadBundledLevels();
if (!m01) throw new Error("Mission 01 missing");

const check = (src: string, level = m01) => verify(level, parseBool(src));

describe("verify: one fixture per verdict kind", () => {
  it("init_failure", async () => {
    expect(await check("A + B = 7")).toEqual({ kind: "init_failure", state: { A: 2, B: 4 } });
  });

  it("live_breach with the shortest trace from init", async () => {
    const verdict = await check("A >= 1");
    expect(verdict).toEqual({
      kind: "live_breach",
      trace: [
        { control: TRACE_START, state: { A: 2, B: 4 } },
        { control: "a2b", state: { A: 1, B: 5 } },
        { control: "a2b", state: { A: 0, B: 6 } },
      ],
    });
  });

  it("lab_breach from an unreachable state", async () => {
    // Reachable states keep y = 2x, so BFS never breaks `y >= 0`; but from (x=1, y=0) PULL
    // takes y below zero (y is int, so the domain allows it).
    const pistons = mkLevel("pistons", {
      vars: [
        { name: "x", init: 0 },
        { name: "y", domain: "int", init: 0 },
      ],
      controls: [
        { id: "push", guard: "x < 5", update: { x: "x + 1", y: "y + 2" } },
        { id: "pull", guard: "x > 0", update: { x: "x - 1", y: "y - 2" } },
      ],
      meltdown: "y < 0",
    });
    const verdict = await check("y >= 0", pistons);
    expect(verdict.kind).toBe("lab_breach");
    if (verdict.kind !== "lab_breach") return;
    expect(verdict.control).toBe("pull");
    expect(step(pistons, verdict.before, "pull")).toEqual(verdict.after);
    expect(evalBool(parseBool("y >= 0"), verdict.before)).toBe(true);
    expect(evalBool(parseBool("y >= 0"), verdict.after)).toBe(false);
  });

  it("insufficient", async () => {
    expect(await check("A >= 0")).toEqual({ kind: "insufficient", state: { A: 0, B: 0 } });
  });

  it("holds", async () => {
    expect(await check("A + B = 6")).toEqual({ kind: "holds" });
  });
});

describe("verify: lab catches what the BFS bound misses", () => {
  it("bfs depth too small, model found under |v| <= 100", async () => {
    const verdict = await verify(counter(1000), parseBool("x != 50"));
    expect(verdict).toEqual({
      kind: "lab_breach",
      before: { x: 49 },
      control: "inc",
      after: { x: 50 },
    });
  });

  it("escalates to the unbounded query", async () => {
    const verdict = await verify(counter(1000), parseBool("x != 500"));
    expect(verdict).toEqual({
      kind: "lab_breach",
      before: { x: 499 },
      control: "inc",
      after: { x: 500 },
    });
  });

  it("same law is a live breach when BFS is allowed to go deep enough", async () => {
    const verdict = await verify(counter(1000), parseBool("x != 50"), { bfs: { depth: 60 } });
    expect(verdict.kind).toBe("live_breach");
  });

  it("the lab model is the boundary state when the bad region is narrow", async () => {
    const verdict = await verify(counter(1000), parseBool("x < 900 || x > 950"));
    expect(verdict).toMatchObject({ kind: "lab_breach", before: { x: 899 }, after: { x: 900 } });
  });

  it("D(s) rules out pre-states outside the nat domain", async () => {
    // Without D(s), x = -2 satisfies `x != -1` and inc breaks it.
    expect(await verify(counter(3), parseBool("x != -1"))).toEqual({ kind: "holds" });
  });
});

describe("Mission 01 pipeline (sanity check; full suite is M1-T7)", () => {
  for (const law of m01.solutions) {
    it(`solution ${JSON.stringify(law)} holds`, async () => {
      expect(await verify(m01, law)).toEqual({ kind: "holds" });
    });
  }
  for (const w of m01.knownWrong) {
    it(`known wrong → ${w.verdict}`, async () => {
      expect((await verify(m01, w.law)).kind).toBe(w.verdict);
    });
  }
});
