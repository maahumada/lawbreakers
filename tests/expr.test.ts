import { describe, expect, it } from "vitest";
import {
  add,
  and,
  bool,
  c,
  eq,
  euclidMod,
  evalBool,
  evalNum,
  freeVars,
  ge,
  mod,
  ne,
  not,
  or,
  pretty,
  scale,
  size,
  sub,
  v,
} from "../src/engine/expr.ts";

describe("evalNum / evalBool", () => {
  const s = { A: 2, B: 4, x: -3 };

  it("evaluates arithmetic", () => {
    expect(evalNum(add(v("A"), v("B")), s)).toBe(6);
    expect(evalNum(sub(v("A"), c(5)), s)).toBe(-3);
    expect(evalNum(scale(-2, v("B")), s)).toBe(-8);
  });

  it("uses Euclidean modulo on negative operands", () => {
    expect(evalNum(mod(v("x"), 2), s)).toBe(1); // JS: -3 % 2 === -1
    expect(evalNum(mod(c(-4), 3), s)).toBe(2);
    expect(evalNum(mod(c(-6), 3), s)).toBe(0);
    expect(euclidMod(7, 3)).toBe(1);
  });

  it("evaluates logic", () => {
    expect(evalBool(eq(add(v("A"), v("B")), c(6)), s)).toBe(true);
    expect(evalBool(and(ge(v("A"), c(1)), ne(v("B"), c(4))), s)).toBe(false);
    expect(evalBool(or(bool(false), not(eq(v("A"), c(3)))), s)).toBe(true);
  });

  it("throws on a variable missing from the state", () => {
    expect(() => evalNum(v("Z"), s)).toThrow(/unknown variable 'Z'/);
  });
});

describe("constructors", () => {
  it("reject a non-positive mod divisor and non-integer constants", () => {
    expect(() => mod(v("x"), 0)).toThrow(RangeError);
    expect(() => c(1.5)).toThrow(RangeError);
    expect(() => scale(0.5, v("x"))).toThrow(RangeError);
  });
});

describe("pretty", () => {
  it("prints with minimal parentheses", () => {
    expect(pretty(eq(add(v("A"), v("B")), c(6)))).toBe("A + B = 6");
    expect(pretty(sub(v("a"), sub(v("b"), v("c"))))).toBe("a - (b - c)");
    expect(pretty(sub(sub(v("a"), v("b")), v("c")))).toBe("a - b - c");
    expect(pretty(scale(2, add(v("x"), c(1))))).toBe("2 * (x + 1)");
    expect(pretty(eq(mod(v("n"), 2), c(1)))).toBe("n mod 2 = 1");
    expect(pretty(and(or(bool(true), bool(false)), bool(true)))).toBe("(true || false) && true");
    expect(pretty(not(eq(v("A"), c(0))))).toBe("!(A = 0)");
    expect(pretty(eq(v("x"), c(-3)))).toBe("x = -3");
  });
});

describe("size (module count)", () => {
  it("counts one module per node; ×k and MOD k include their constant", () => {
    expect(size(eq(add(v("A"), v("B")), c(6)))).toBe(5);
    expect(size(eq(v("y"), scale(2, v("x"))))).toBe(4);
    expect(size(eq(mod(v("n"), 2), c(1)))).toBe(4);
    expect(size(and(ge(v("x"), c(0)), ge(v("y"), c(0))))).toBe(7);
    expect(size(not(bool(true)))).toBe(2);
  });
});

describe("freeVars", () => {
  it("lists variables once, in order", () => {
    expect(freeVars(and(eq(v("B"), v("A")), ge(v("B"), c(0))))).toEqual(["B", "A"]);
  });
});
