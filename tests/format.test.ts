import { describe, expect, it } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import { describeControl, formatEffect, formatExpr } from "../src/ui/machine/format.ts";

const levels = loadBundledLevels();
const control = (levelIdx: number, id: string) => {
  const ctl = levels[levelIdx]?.controls.find((c) => c.id === id);
  if (!ctl) throw new Error(`missing control ${id}`);
  return ctl;
};

describe("machine view text", () => {
  it("describes Mission 01 controls", () => {
    expect(describeControl(control(0, "a2b"))).toBe("IF A ≥ 1: A −1, B +1");
    expect(describeControl(control(0, "b2a"))).toBe("IF B ≥ 1: A +1, B −1");
  });

  it("shows unconditional guards and variable increments", () => {
    expect(describeControl(control(2, "push"))).toBe("ALWAYS: x +1, y +2");
    expect(formatEffect(control(4, "cycle"))).toBe("x +y, y +1");
  });

  it("uses typographic operators", () => {
    expect(formatExpr(parseBool("A = 0 && B = 0"))).toBe("A = 0 AND B = 0");
    expect(formatExpr(parseBool("(A = 0 && B = 0) || A = 3"))).toBe("A = 0 AND B = 0 OR A = 3");
    expect(formatExpr(parseBool("!(x != -1) || 2 * x - 3 <= x mod 2"))).toBe(
      "NOT (x ≠ −1) OR 2×x − 3 ≤ x MOD 2",
    );
  });
});
