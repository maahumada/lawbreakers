import { describe, expect, it } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import { gaugeScale } from "../src/ui/machine/format.ts";
import {
  clampToFrame,
  DIAL_START_DEG,
  DIAL_SWEEP_DEG,
  fillFraction,
  MAJOR_EVERY,
  needleAngle,
  readingLabel,
  ticks,
  tickStep,
  trailOpacity,
  trayLayout,
} from "../src/ui/machine/skins/geometry.ts";

describe("fillFraction", () => {
  it("fills in proportion inside the range", () => {
    expect(fillFraction(5, 10)).toEqual({ frac: 0.5, over: 0, under: 0 });
    expect(fillFraction(0, 10)).toEqual({ frac: 0, over: 0, under: 0 });
  });
  it("clamps the picture but reports how far out a value is (never silently)", () => {
    expect(fillFraction(12, 10)).toEqual({ frac: 1, over: 2, under: 0 });
    expect(fillFraction(-3, 10)).toEqual({ frac: 0, over: 0, under: 3 });
  });
});

describe("ticks", () => {
  it("one per unit up to 20, a tenth of the scale beyond", () => {
    expect(tickStep(10)).toBe(1);
    expect(tickStep(20)).toBe(1);
    expect(tickStep(50)).toBe(5);
    expect(ticks(10).map((t) => t.at)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("are uniform, and the emphasis never groups by a modulus a mission uses", () => {
    const moduli = new Set<number>();
    for (const l of loadBundledLevels()) {
      for (const card of Object.keys(l.hand.cards)) {
        if (card.startsWith("mod")) moduli.add(Number(card.slice(3)));
      }
    }
    expect(moduli.size).toBeGreaterThan(0);
    for (const k of moduli) expect(MAJOR_EVERY % k, `modulus ${k}`).not.toBe(0);
    for (const full of [10, 20, 50, 100, 200]) {
      const ts = ticks(full);
      const gaps = ts.slice(1).map((t, i) => t.at - (ts[i]?.at ?? 0));
      expect(new Set(gaps).size).toBe(1);
      expect(
        ts.filter((t) => t.major).every((t) => (t.at / tickStep(full)) % MAJOR_EVERY === 0),
      ).toBe(true);
    }
  });

  it("gaugeScale keeps the full scale a whole number of ticks", () => {
    for (const v of [0, 7, 11, 23, 77, 140, 999]) {
      const full = gaugeScale(v);
      expect(Number.isInteger(full / tickStep(full))).toBe(true);
    }
  });
});

describe("needleAngle", () => {
  it("sweeps the printed notches plus two unprinted units each side", () => {
    expect(needleAngle(-2, 0, 10).deg).toBe(DIAL_START_DEG);
    expect(needleAngle(12, 0, 10).deg).toBe(DIAL_START_DEG + DIAL_SWEEP_DEG);
    expect(needleAngle(11, 0, 10).pegged).toBeNull();
    expect(needleAngle(12, 0, 10).pegged).toBeNull();
  });
  it("pegs (and says so) past the drawn range", () => {
    expect(needleAngle(40, 0, 10)).toEqual({
      deg: DIAL_START_DEG + DIAL_SWEEP_DEG,
      pegged: "high",
    });
    expect(needleAngle(-9, 0, 10)).toEqual({ deg: DIAL_START_DEG, pegged: "low" });
  });
});

describe("clampToFrame", () => {
  it("keeps points inside, clamps and flags the ones outside", () => {
    expect(clampToFrame(3, 4, 0, 10)).toEqual({ x: 3, y: 4, outX: 0, outY: 0 });
    expect(clampToFrame(14, -2, 0, 10)).toEqual({ x: 10, y: 0, outX: 1, outY: -1 });
  });
});

describe("trailOpacity", () => {
  it("fades from old to new", () => {
    const n = 7;
    const ops = Array.from({ length: n }, (_, i) => trailOpacity(i, n));
    expect(ops[0]).toBeCloseTo(0.15);
    for (let i = 1; i < n; i++) expect(ops[i]).toBeGreaterThan(ops[i - 1] ?? 1);
    expect(trailOpacity(0, 1)).toBe(1);
  });
});

describe("trayLayout", () => {
  it("draws up to the slots, badges the rest", () => {
    expect(trayLayout(5, 12)).toEqual({ shown: 5, ghosts: 0, more: 0 });
    expect(trayLayout(15, 12)).toEqual({ shown: 12, ghosts: 0, more: 3 });
  });
  it("draws negatives as owed ghosts", () => {
    expect(trayLayout(-2, 12)).toEqual({ shown: 0, ghosts: 2, more: 0 });
    expect(trayLayout(-20, 12)).toEqual({ shown: 0, ghosts: 12, more: 8 });
  });
});

describe("readingLabel", () => {
  it("is the nixie gauge's label, plus out-of-range words", () => {
    expect(readingLabel("CELL A", 2)).toBe("CELL A reads 2");
    expect(readingLabel("TANK A", 11, "over capacity 9")).toBe("TANK A reads 11, over capacity 9");
  });
});
