import { describe, expect, it } from "vitest";
import type { BoolExpr, CmpOp, NumExpr } from "../src/engine/expr.ts";
import {
  add,
  and,
  bool,
  c,
  CMP_OPS,
  cmp,
  eq,
  ge,
  mod,
  not,
  or,
  pretty,
  scale,
  sub,
  v,
} from "../src/engine/expr.ts";
import { ParseError, parseBool, parseExpr, parseNum } from "../src/engine/parse.ts";

describe("parse", () => {
  it("parses the level-file syntax", () => {
    expect(parseBool("A + B = 6")).toEqual(eq(add(v("A"), v("B")), c(6)));
    expect(parseBool("y = 2 * x")).toEqual(eq(v("y"), scale(2, v("x"))));
    expect(parseBool("n mod 2 = 1")).toEqual(eq(mod(v("n"), 2), c(1)));
    expect(parseBool("(A = 0 && B = 0) || A = 3")).toEqual(
      or(and(eq(v("A"), c(0)), eq(v("B"), c(0))), eq(v("A"), c(3))),
    );
    expect(parseBool("true")).toEqual(bool(true));
  });

  it("applies standard precedence", () => {
    expect(parseBool("a = 1 || b = 2 && !c = 3")).toEqual(
      or(eq(v("a"), c(1)), and(eq(v("b"), c(2)), not(eq(v("c"), c(3))))),
    );
    expect(parseNum("a - b - c")).toEqual(sub(sub(v("a"), v("b")), v("c")));
    expect(parseNum("a + 2 * b mod 3")).toEqual(add(v("a"), mod(scale(2, v("b")), 3)));
  });

  it("turns `*` with a constant on either side into scale", () => {
    expect(parseNum("x * 3")).toEqual(scale(3, v("x")));
    expect(parseNum("-2 * x")).toEqual(scale(-2, v("x")));
  });

  it("folds unary minus on literals and scales otherwise", () => {
    expect(parseNum("-5")).toEqual(c(-5));
    expect(parseNum("-0")).toEqual(c(0));
    expect(parseNum("-x")).toEqual(scale(-1, v("x")));
  });

  it("rejects variable × variable", () => {
    expect(() => parseNum("x * y")).toThrow(ParseError);
    expect(() => parseNum("x * y")).toThrow(/'\*' needs a constant/);
  });

  it("reports readable errors with a position", () => {
    const err = (src: string): ParseError => {
      try {
        parseExpr(src);
      } catch (e) {
        if (e instanceof ParseError) return e;
        throw e;
      }
      throw new Error(`expected '${src}' to fail`);
    };
    expect(err("x * y").pos).toBe(2);
    expect(err("x * y").message).toContain("at column 3");
    expect(err("A + ").reason).toBe("unexpected end of input");
    expect(err("(A = 1").reason).toMatch(/expected '\)'/);
    expect(err("A # 1").reason).toBe("unexpected character '#'");
    expect(err("x mod y").reason).toMatch(/positive integer constant/);
    expect(err("x mod 0").pos).toBe(6);
    expect(err("1 < x < 3").reason).toMatch(/cannot be chained/);
    expect(err("A = 1 + (B = 2)").reason).toBe("'+' expects a number, got a true/false signal");
    expect(err("!A").reason).toBe("'!' expects a true/false signal, got a number");
    expect(err("A B").reason).toBe("unexpected 'B'");
  });

  it("checks the requested type", () => {
    expect(() => parseBool("A + 1")).toThrow(/true\/false expression/);
    expect(() => parseNum("A = 1")).toThrow(/number expression/);
  });
});

// Deterministic pseudo-random ASTs for the round-trip property.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function genNum(r: () => number, depth: number): NumExpr {
  const pick = Math.floor(r() * (depth <= 0 ? 2 : 6));
  const int = () => Math.floor(r() * 21) - 10;
  switch (pick) {
    case 0:
      return v(["x", "y", "A"][Math.floor(r() * 3)] ?? "x");
    case 1:
      return c(int());
    case 2:
      return add(genNum(r, depth - 1), genNum(r, depth - 1));
    case 3:
      return sub(genNum(r, depth - 1), genNum(r, depth - 1));
    case 4:
      return scale(int(), genNum(r, depth - 1));
    default:
      return mod(genNum(r, depth - 1), 1 + Math.floor(r() * 5));
  }
}

function genBool(r: () => number, depth: number): BoolExpr {
  const pick = Math.floor(r() * (depth <= 0 ? 2 : 5));
  switch (pick) {
    case 0:
      return bool(r() < 0.5);
    case 1:
      return cmp(CMP_OPS[Math.floor(r() * CMP_OPS.length)] as CmpOp, genNum(r, 2), genNum(r, 2));
    case 2:
      return and(genBool(r, depth - 1), genBool(r, depth - 1));
    case 3:
      return or(genBool(r, depth - 1), genBool(r, depth - 1));
    default:
      return not(genBool(r, depth - 1));
  }
}

describe("round trip parse(pretty(e)) ≡ e", () => {
  const cases: (NumExpr | BoolExpr)[] = [
    eq(add(v("A"), v("B")), c(6)),
    and(ge(v("x"), c(0)), ge(v("y"), c(0))),
    sub(v("x"), c(-3)),
    scale(2, scale(3, v("x"))),
    mod(mod(v("x"), 2), 3),
    scale(-1, mod(v("x"), 2)),
    mod(scale(3, v("x")), 2),
    scale(2, c(-3)),
    not(not(bool(false))),
    or(bool(true), and(bool(false), bool(true))),
  ];

  it.each(cases.map((e) => [pretty(e), e]))("%s", (_text, e) => {
    expect(parseExpr(pretty(e))).toEqual(e);
  });

  it("holds on 2000 random expressions", () => {
    const r = rng(424);
    for (let i = 0; i < 1000; i++) {
      const n = genNum(r, 4);
      expect(parseNum(pretty(n))).toEqual(n);
      const b = genBool(r, 3);
      expect(parseBool(pretty(b))).toEqual(b);
    }
  });
});
