import { describe, expect, it } from "vitest";
import { initialState, loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import {
  bfsAttack,
  enabled,
  randomRun,
  SimulationError,
  step,
  TRACE_START,
} from "../src/engine/simulate.ts";
import { counter, mkLevel } from "./fixtures/levels.ts";

const [m01] = loadBundledLevels();
if (!m01) throw new Error("Mission 01 missing");

describe("enabled / step", () => {
  it("lists controls whose guard holds", () => {
    expect(enabled(m01, { A: 2, B: 4 }).map((c) => c.id)).toEqual(["a2b", "b2a"]);
    expect(enabled(m01, { A: 0, B: 4 }).map((c) => c.id)).toEqual(["b2a"]);
    expect(enabled(m01, { A: 0, B: 0 })).toEqual([]);
  });

  it("applies updates simultaneously and keeps unlisted vars", () => {
    const swap = mkLevel("swap", {
      vars: [
        { name: "x", init: 1 },
        { name: "y", init: 2 },
        { name: "z", init: 7 },
      ],
      controls: [{ id: "swap", guard: "true", update: { x: "y", y: "x" } }],
      meltdown: "false",
    });
    expect(step(swap, initialState(swap), "swap")).toEqual({ x: 2, y: 1, z: 7 });
  });

  it("does not mutate its input", () => {
    const s = { A: 2, B: 4 };
    expect(step(m01, s, "a2b")).toEqual({ A: 1, B: 5 });
    expect(s).toEqual({ A: 2, B: 4 });
  });

  it("throws on disabled or unknown controls", () => {
    expect(() => step(m01, { A: 0, B: 4 }, "a2b")).toThrow(SimulationError);
    expect(() => step(m01, { A: 2, B: 4 }, "nope")).toThrow(/unknown control/);
  });

  it("throws when an update leaves the nat domain", () => {
    const bad = mkLevel("bad", {
      vars: [{ name: "x", init: 0 }],
      controls: [{ id: "dec", guard: "true", update: { x: "x - 1" } }],
      meltdown: "false",
    });
    expect(() => step(bad, { x: 0 }, "dec")).toThrow(/drives nat 'x' to -1/);
  });
});

describe("randomRun", () => {
  it("is reproducible for a seed and starts at init", () => {
    const a = randomRun(m01, 50, 42);
    expect(randomRun(m01, 50, 42)).toEqual(a);
    expect(a).toHaveLength(51);
    expect(a[0]).toEqual({ control: TRACE_START, state: { A: 2, B: 4 } });
    for (const { state } of a) expect((state.A ?? 0) + (state.B ?? 0)).toBe(6);
  });

  it("differs between seeds", () => {
    const runs = new Set([1, 2, 3, 4, 5].map((seed) => JSON.stringify(randomRun(m01, 20, seed))));
    expect(runs.size).toBeGreaterThan(1);
  });

  it("stops early when no control is enabled", () => {
    expect(randomRun(counter(3), 10, 7).map((t) => t.state.x)).toEqual([0, 1, 2, 3]);
  });
});

describe("bfsAttack", () => {
  it("Mission 01 `A >= 1`: the 2-step trace", () => {
    expect(bfsAttack(m01, parseBool("A >= 1"))).toEqual([
      { control: TRACE_START, state: { A: 2, B: 4 } },
      { control: "a2b", state: { A: 1, B: 5 } },
      { control: "a2b", state: { A: 0, B: 6 } },
    ]);
  });

  it("returns the init-only trace when init already violates the law", () => {
    expect(bfsAttack(m01, parseBool("A + B = 7"))).toEqual([
      { control: TRACE_START, state: { A: 2, B: 4 } },
    ]);
  });

  it("returns null when the law survives every reachable state", () => {
    expect(bfsAttack(m01, parseBool("A + B = 6"))).toBeNull();
  });

  it("respects the depth bound", () => {
    const law = parseBool("x != 20");
    expect(bfsAttack(counter(100), law)).toBeNull();
    expect(bfsAttack(counter(100), law, { depth: 20 })).toHaveLength(21);
  });

  it("respects the state bound", () => {
    const law = parseBool("x != 5");
    expect(bfsAttack(counter(100), law, { maxStates: 3 })).toBeNull();
    expect(bfsAttack(counter(100), law, { maxStates: 6 })).toHaveLength(6);
  });
});
