import { describe, expect, it } from "vitest";
import { add, and, c, eq, ge, mod, not, or, scale, sub, v } from "../src/engine/expr.ts";
import { dafnyExpr, dafnyName, toDafny } from "../src/engine/dafny.ts";
import { loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";

const levels = loadBundledLevels();
const level = (prefix: string) => {
  const l = levels.find((x) => x.id.startsWith(prefix));
  if (!l) throw new Error(`missing level ${prefix}`);
  return l;
};
const law = (src: string) => dafnyExpr(parseBool(src));

describe("dafnyExpr", () => {
  it("prints comparisons with Dafny operators", () => {
    expect(law("A + B = 6")).toBe("A + B == 6");
    expect(law("x != 11 && y <= 2")).toBe("x != 11 && y <= 2");
  });

  it("prints mod as % and parenthesizes compound operands", () => {
    expect(law("n mod 2 = 1")).toBe("n % 2 == 1");
    expect(dafnyExpr(mod(add(v("x"), v("y")), 3))).toBe("(x + y) % 3");
    expect(dafnyExpr(mod(scale(2, v("x")), 3))).toBe("(2 * x) % 3");
    expect(dafnyExpr(scale(2, mod(v("x"), 3)))).toBe("2 * (x % 3)");
  });

  it("prints scale and keeps subtraction trees exact", () => {
    expect(law("y = 2 * x")).toBe("y == 2 * x");
    expect(dafnyExpr(scale(3, add(v("x"), c(1))))).toBe("3 * (x + 1)");
    expect(dafnyExpr(sub(v("a"), sub(v("b"), v("c"))))).toBe("a - (b - c)");
    expect(dafnyExpr(sub(sub(v("a"), v("b")), v("c")))).toBe("a - b - c");
  });

  it("parenthesizes negatives after an operator", () => {
    expect(dafnyExpr(c(-3))).toBe("-3");
    expect(dafnyExpr(sub(v("x"), c(-3)))).toBe("x - (-3)");
    expect(dafnyExpr(add(v("x"), scale(-1, v("y"))))).toBe("x + (-y)");
    expect(dafnyExpr(scale(-2, v("x")))).toBe("(-2) * x");
    expect(dafnyExpr(eq(scale(-1, add(v("x"), v("y"))), c(0)))).toBe("-(x + y) == 0");
  });

  it("never mixes && and || without parentheses", () => {
    const [a, b, d] = [ge(v("a"), c(0)), ge(v("b"), c(0)), ge(v("d"), c(0))];
    expect(dafnyExpr(or(and(a, b), d))).toBe("(a >= 0 && b >= 0) || d >= 0");
    expect(dafnyExpr(and(a, or(b, d)))).toBe("a >= 0 && (b >= 0 || d >= 0)");
    expect(dafnyExpr(and(and(a, b), d))).toBe("a >= 0 && b >= 0 && d >= 0");
    expect(dafnyExpr(and(a, and(b, d)))).toBe("a >= 0 && (b >= 0 && d >= 0)");
  });

  it("wraps negations (and never emits !!)", () => {
    expect(law("!(A = 0 && B = 0)")).toBe("!(A == 0 && B == 0)");
    expect(law("!A = 0")).toBe("!(A == 0)");
    expect(dafnyExpr(not(not(eq(v("x"), c(1)))))).toBe("!(!(x == 1))");
  });

  it("renames Dafny keywords and leading underscores", () => {
    expect(dafnyName("x")).toBe("x");
    expect(dafnyName("old")).toBe("old_");
    expect(dafnyName("_t")).toBe("v_t");
  });
});

describe("toDafny", () => {
  const m01 = level("01");
  const src = toDafny(m01, parseBool("A + B = 6"));
  const lines = src.split("\n").map((l) => l.trim());

  it("ties game terms to verification terms in the header", () => {
    expect(src).toMatch(/^\/\/ LAWBREAKERS · Mission 01: THE LAST REACTOR/);
    expect(src).toContain("your Law     = the loop invariant");
    expect(src).toContain("meltdown     = an assertion that must never fail");
  });

  it("declares the gauges as nat with their initial values", () => {
    expect(lines).toContain("method TheLastReactor()");
    expect(lines).toContain("var A: nat := 2;  // CELL A");
    expect(lines).toContain("var B: nat := 4;  // CELL B");
  });

  it("puts the Law as the only invariant and asserts no meltdown", () => {
    expect(lines.filter((l) => l.startsWith("invariant"))).toEqual([
      "invariant A + B == 6  // YOUR LAW",
    ]);
    expect(lines).toContain("assert !(A == 0 && B == 0);  // no meltdown, ever");
    expect(lines.filter((l) => l.startsWith("decreases *"))).toHaveLength(2);
  });

  it("fires any enabled control with a simultaneous assignment", () => {
    expect(lines).toContain("case A >= 1 =>  // TRANSFER A→B");
    expect(lines).toContain("A, B := A - 1, B + 1;");
    expect(lines).toContain("case B >= 1 =>  // TRANSFER B→A");
    expect(lines).toContain("A, B := A + 1, B - 1;");
    expect(lines).toContain("case !(A >= 1 || B >= 1) =>  // nothing enabled: idle");
  });

  it("omits the idle case when a control is always enabled, and uses int gauges", () => {
    const m03 = toDafny(level("03"), parseBool("y = 2 * x"));
    expect(m03).toContain("var x: int := 0;");
    expect(m03).toContain("case true =>  // PUSH");
    expect(m03).toContain("x, y := x + 1, y + 2;");
    expect(m03).not.toContain("idle");
    expect(m03).not.toContain("nat");
  });

  it("is deterministic and balanced for every mission's solutions", () => {
    for (const l of levels) {
      for (const s of l.solutions) {
        const out = toDafny(l, s);
        expect(out).toBe(toDafny(l, s));
        expect(out.split("{").length).toBe(out.split("}").length);
        const code = out
          .split("\n")
          .filter((line) => /^\s*(invariant|assert|case)\b/.test(line))
          .map((line) => line.replace(/\s*\/\/.*$/, ""));
        for (const line of code) expect(line).not.toMatch(/\bmod\b|[^=!<>:]=[^=>]/);
      }
    }
  });
});
