import { afterAll, describe, expect, it } from "vitest";
import type { NumExpr } from "../src/engine/expr.ts";
import { add, c, eq, evalBool, evalNum, mod, scale, sub, v } from "../src/engine/expr.ts";
import { parseBool, parseNum } from "../src/engine/parse.ts";
import { findModel, shutdownZ3 } from "../src/engine/smt.ts";

afterAll(shutdownZ3);

/** The unique value Z3 assigns to `e` at state `s`, via a fresh variable `r = e`. */
async function z3Value(e: NumExpr, s: Record<string, number>): Promise<number | undefined> {
  const pins = Object.entries(s).map(([n, value]) => eq(v(n), c(value)));
  const model = await findModel([...pins, eq(v("__r"), e)], [...Object.keys(s), "__r"]);
  return model?.__r;
}

describe("NumExpr translation agrees with evalNum", () => {
  const cases: [string, NumExpr][] = [
    ["var", v("x")],
    ["const", c(-7)],
    ["add", add(v("x"), v("y"))],
    ["sub", sub(v("x"), v("y"))],
    ["scale", scale(-3, v("y"))],
    ["mod 2", mod(v("x"), 2)],
    ["mod 3", mod(v("x"), 3)],
    ["mod 5 of sum", mod(add(v("x"), v("y")), 5)],
  ];
  const states = [
    { x: 7, y: 2 },
    { x: -7, y: 3 },
    { x: -3, y: -11 },
    { x: 0, y: -1 },
  ];
  for (const [name, e] of cases) {
    it(name, async () => {
      for (const s of states) expect(await z3Value(e, s)).toBe(evalNum(e, s));
    });
  }

  it("mod is Euclidean on negatives", async () => {
    expect(await z3Value(parseNum("x mod 2"), { x: -3 })).toBe(1);
    expect(await z3Value(parseNum("x mod 3"), { x: -7 })).toBe(2);
  });
});

describe("BoolExpr translation agrees with evalBool", () => {
  const laws = [
    "x = y",
    "x != y",
    "x < y",
    "x <= y",
    "x > y",
    "x >= y",
    "x >= 0 && y >= 0",
    "x > 0 || y > 0",
    "!(x = y)",
    "true",
    "false",
    "(x + y) mod 2 = 1 || !(2 * x - y < 3)",
  ];
  const states = [
    { x: 1, y: 1 },
    { x: -2, y: 5 },
    { x: 4, y: -3 },
  ];
  for (const src of laws) {
    it(src, async () => {
      const law = parseBool(src);
      for (const s of states) {
        const pins = Object.entries(s).map(([n, value]) => eq(v(n), c(value)));
        const sat = (await findModel([...pins, law], ["x", "y"])) !== null;
        expect(sat).toBe(evalBool(law, s));
      }
    });
  }
});

describe("findModel", () => {
  it("returns a satisfying state", async () => {
    const law = parseBool("x + y = 10 && x - y = 4");
    expect(await findModel([law], ["x", "y"])).toEqual({ x: 7, y: 3 });
  });

  it("returns null when unsatisfiable", async () => {
    expect(await findModel([parseBool("x > 0 && x < 1")], ["x"])).toBeNull();
  });

  it("honours the bound", async () => {
    const big = parseBool("x > 50");
    expect(await findModel([big], ["x"], 10)).toBeNull();
    const m = await findModel([big], ["x"], 100);
    expect(m?.x).toBeGreaterThan(50);
    expect(m?.x).toBeLessThanOrEqual(100);
  });

  it("completes unconstrained variables", async () => {
    const m = await findModel([parseBool("x = 3")], ["x", "y"]);
    expect(m).toEqual({ x: 3, y: expect.any(Number) as number });
  });
});
