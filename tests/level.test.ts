import { describe, expect, it } from "vitest";
import { evalBool, pretty, size } from "../src/engine/expr.ts";
import {
  CARD_IDS,
  cardOf,
  initialState,
  LevelError,
  loadBundledLevels,
  loadLevel,
} from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import malformed from "./fixtures/malformed-level.json";

const catchLevelError = (raw: unknown): LevelError => {
  try {
    loadLevel(raw);
  } catch (e) {
    if (e instanceof LevelError) return e;
    throw e;
  }
  throw new Error("expected loadLevel to throw");
};

describe("bundled levels", () => {
  const levels = loadBundledLevels();

  it("loads all six missions in order", () => {
    expect(levels.map((l) => l.id)).toEqual([
      "01-last-reactor",
      "02-coolant-valve",
      "03-mirror-pistons",
      "04-parity-lock",
      "05-false-defense",
      "06-final-breach",
    ]);
  });

  it("parses expressions into ASTs", () => {
    const [m01] = levels;
    expect(m01 && pretty(m01.meltdown)).toBe("A = 0 && B = 0");
    expect(m01?.controls[0]?.update["B"]).toEqual({
      k: "add",
      l: { k: "var", name: "B" },
      r: { k: "const", value: 1 },
    });
    expect(m01 && initialState(m01)).toEqual({ A: 2, B: 4 });
  });

  it.each(levels.map((l) => [l.id, l] as const))(
    "%s: budget matches the reference Law",
    (_id, l) => {
      const [reference] = l.solutions;
      expect(reference && size(reference)).toBe(l.hand.budget);
    },
  );

  it.each(levels.map((l) => [l.id, l] as const))("%s: power-on state is safe", (_id, l) => {
    expect(evalBool(l.meltdown, initialState(l))).toBe(false);
  });
});

describe("cards", () => {
  it("maps nodes to card ids", () => {
    const law = parseBool("y = 2 * x && n mod 2 != 1");
    expect(cardOf(law)).toBe("and");
    expect(cardOf({ k: "scale", factor: 2, e: { k: "var", name: "x" } })).toBe("scale2");
    expect(cardOf({ k: "scale", factor: 5, e: { k: "var", name: "x" } })).toBe("unavailable");
    expect(cardOf({ k: "mod", divisor: 3, e: { k: "var", name: "x" } })).toBe("mod3");
    expect(cardOf({ k: "const", value: 6 })).toBeNull();
    expect(CARD_IDS).toContain("ge");
  });
});

describe("loader errors", () => {
  it("lists every problem in a malformed level, readably", () => {
    const err = catchLevelError(malformed);
    expect(err.levelId).toBe("99-malformed");
    expect(err.issues).toHaveLength(4);
    expect(err.message).toContain("Invalid level '99-malformed'");
    expect(err.message).toContain(
      "controls[0] (grow).guard: '*' needs a constant on one side (variable × variable is not allowed) at column 3\n      x * y > 0\n        ^",
    );
    expect(err.message).toContain("controls[0] (grow).update: assigns undeclared variable 'z'");
    expect(err.message).toContain("meltdown: expected a true/false expression");
    expect(err.message).toContain("solutions[0]: unknown variable 'q'");
  });

  it("reports schema violations with their path", () => {
    const broken = {
      ...malformed,
      vars: [{ name: "x", label: "X", domain: "real", init: 0 }],
      hand: { cards: { teleport: 1 }, budget: 0 },
    };
    const err = catchLevelError(broken);
    expect(err.issues.some((i) => i.startsWith("vars[0].domain:"))).toBe(true);
    expect(err.issues.some((i) => i.startsWith("hand.budget:"))).toBe(true);
    expect(err.issues.some((i) => i.startsWith("hand.cards"))).toBe(true);
  });

  it("rejects a nat variable with a negative init and duplicate names", () => {
    const err = catchLevelError({
      ...malformed,
      vars: [
        { name: "x", label: "X", domain: "nat", init: -1 },
        { name: "x", label: "X again", domain: "int", init: 0 },
      ],
      controls: [{ id: "noop", label: "NOOP", guard: "true", update: {} }],
      meltdown: "x < 0",
      solutions: ["x >= 0"],
    });
    expect(err.issues).toEqual([
      "vars[0]: 'x' is nat but init is -1",
      "vars[1]: duplicate variable 'x'",
    ]);
  });
});
