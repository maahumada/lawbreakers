import { describe, expect, it } from "vitest";
import type { Expr } from "../src/engine/expr.ts";
import { pretty } from "../src/engine/expr.ts";
import type { CardId, Level } from "../src/engine/level.ts";
import { CARD_IDS, cardOf, lawCost, loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import type { HandItem, Rack, SlotPath } from "../src/game/rack.ts";
import {
  CONST_MAX,
  CONST_MIN,
  canPlace,
  cardLabel,
  cardShape,
  cardsLeft,
  cardsUsed,
  isWithin,
  itemKey,
  moveTo,
  nodeAt,
  parseItemKey,
  parsePathKey,
  pathKey,
  placeAt,
  rackCost,
  rackText,
  rackToLaw,
  removeAt,
  setConstAt,
  slotPaths,
  slotType,
} from "../src/game/rack.ts";
import { useRack } from "../src/game/rackStore.ts";
import { layoutRack, METRICS, METRICS_COMPACT } from "../src/ui/rack/layout.ts";

const LEVELS = loadBundledLevels();
const byNumber = (n: string): Level => {
  const level = LEVELS.find((l) => l.id.startsWith(n));
  if (!level) throw new Error(`mission ${n} missing`);
  return level;
};
const m01 = byNumber("01");
const m06 = byNumber("06");

/** Hand item that builds the root node of `e` (test helper mirroring a player's choice). */
function itemFor(e: Expr): HandItem {
  if (e.k === "var") return { kind: "sensor", name: e.name };
  if (e.k === "const") return { kind: "const" };
  const card = cardOf(e);
  if (card === null || card === "unavailable") throw new Error(`no hand item for ${pretty(e)}`);
  return { kind: "card", card };
}

/** Build `law` in an empty rack through the public API only, depth-first. */
function build(level: Level, law: Expr): Rack {
  let rack: Rack = null;
  const walk = (e: Expr, path: SlotPath): void => {
    rack = placeAt(level, rack, path, itemFor(e));
    if (e.k === "const") rack = setConstAt(rack, path, e.value);
    const kids: Expr[] =
      e.k === "add" || e.k === "sub" || e.k === "cmp" || e.k === "and" || e.k === "or"
        ? [e.l, e.r]
        : e.k === "scale" || e.k === "mod" || e.k === "not"
          ? [e.e]
          : [];
    kids.forEach((k, i) => walk(k, [...path, i]));
  };
  walk(law, []);
  return rack;
}

describe("rack: reference solutions", () => {
  for (const level of LEVELS) {
    const buildable = level.solutions.filter((s) => lawCost(s) <= level.hand.budget);
    for (const solution of buildable) {
      it(`${level.id}: builds ${pretty(solution)} within hand and budget`, () => {
        const rack = build(level, solution);
        const law = rackToLaw(rack);
        expect(law).not.toBeNull();
        expect(pretty(law ?? solution)).toBe(pretty(solution));
        expect(rackText(rack)).toBe(pretty(solution));
        expect(rackCost(rack)).toBe(lawCost(solution));
        const used = cardsUsed(rack);
        for (const [card, n] of Object.entries(used) as [CardId, number][]) {
          expect(n).toBeLessThanOrEqual(level.hand.cards[card] ?? 0);
        }
      });
    }
    it(`${level.id}: the first reference Law costs exactly the budget`, () => {
      const [reference] = level.solutions;
      if (!reference) throw new Error("no reference");
      expect(rackCost(build(level, reference))).toBe(level.hand.budget);
    });
  }

  it("builds Mission 06's 10-module Law and exhausts the right cards", () => {
    const rack = build(m06, parseBool("A + B = 6 && A mod 2 = 0"));
    expect(rackCost(rack)).toBe(17);
    expect(cardsLeft(m06.hand, rack)).toEqual({ add: 0, mod2: 0, eq: 0, and: 0, or: 1 });
  });
});

describe("rack: typed sockets", () => {
  it("the SHIELD takes signals only", () => {
    expect(slotType(null, [])).toBe("bool");
    expect(canPlace(m01, null, [], { kind: "sensor", name: "A" })).toBe("wrong-type");
    expect(canPlace(m01, null, [], { kind: "const" })).toBe("wrong-type");
    expect(canPlace(m01, null, [], { kind: "card", card: "add" })).toBe("wrong-type");
    expect(canPlace(m01, null, [], { kind: "card", card: "eq" })).toBe("ok");
  });

  it("comparator sockets take numbers, logic sockets take signals", () => {
    const eq = placeAt(m01, null, [], { kind: "card", card: "eq" });
    expect(slotType(eq, [0])).toBe("num");
    expect(canPlace(m01, eq, [0], { kind: "card", card: "ge" })).toBe("wrong-type");
    expect(canPlace(m01, eq, [0], { kind: "sensor", name: "A" })).toBe("ok");
    const and = placeAt(m06, null, [], { kind: "card", card: "and" });
    expect(slotType(and, [1])).toBe("bool");
    expect(canPlace(m06, and, [1], { kind: "const" })).toBe("wrong-type");
    expect(canPlace(m06, and, [1], { kind: "card", card: "eq" })).toBe("ok");
  });

  it("rejects occupied, missing and unknown targets", () => {
    const eq = placeAt(m01, null, [], { kind: "card", card: "eq" });
    expect(canPlace(m01, eq, [], { kind: "card", card: "ge" })).toBe("occupied");
    expect(canPlace(m01, eq, [2], { kind: "const" })).toBe("no-socket");
    expect(canPlace(m01, eq, [0, 0], { kind: "const" })).toBe("no-socket");
    expect(canPlace(m01, eq, [0], { kind: "sensor", name: "Z" })).toBe("unknown");
    expect(() => placeAt(m01, eq, [], { kind: "card", card: "ge" })).toThrow(/occupied/);
  });

  it("cards run out at their multiplicity; sensors and dials never do", () => {
    let rack = placeAt(m01, null, [], { kind: "card", card: "eq" });
    rack = placeAt(m01, rack, [0], { kind: "card", card: "add" });
    expect(canPlace(m01, rack, [1], { kind: "card", card: "add" })).toBe("exhausted");
    expect(canPlace(m01, rack, [1], { kind: "card", card: "sub" })).toBe("exhausted"); // not dealt
    expect(cardsLeft(m01.hand, rack)).toEqual({ add: 0, eq: 0, ge: 1 });
    rack = placeAt(m01, rack, [0, 0], { kind: "sensor", name: "A" });
    rack = placeAt(m01, rack, [0, 1], { kind: "sensor", name: "A" });
    rack = placeAt(m01, rack, [1], { kind: "const" });
    expect(rackText(rack)).toBe("A + A = 0");
  });

  it("every card has a shape and a face", () => {
    for (const card of CARD_IDS) {
      expect(cardShape(card).inputs.length).toBeGreaterThan(0);
      expect(cardLabel(card)).not.toBe("");
    }
    expect(cardLabel("scale3")).toBe("×3");
    expect(cardLabel("mod2")).toBe("MOD 2");
    expect(cardLabel("ge")).toBe("≥");
    expect(cardShape("mod3")).toEqual({ out: "num", inputs: ["num"] });
    expect(cardShape("not")).toEqual({ out: "bool", inputs: ["bool"] });
  });
});

describe("rack: editing", () => {
  const full = () => build(m01, parseBool("A + B = 6"));

  it("removing a module returns its subtree's cards to the hand", () => {
    const rack = removeAt(full(), [0]);
    expect(rackText(rack)).toBe("? = 6");
    expect(rackToLaw(rack)).toBeNull();
    expect(rackCost(rack)).toBe(3); // = and the dial
    expect(cardsLeft(m01.hand, rack)).toEqual({ add: 1, eq: 0, ge: 1 });
    expect(removeAt(full(), [])).toBeNull();
    const same = full();
    expect(removeAt(same, [0, 0, 0])).toBe(same);
  });

  it("is persistent: edits never mutate the old rack", () => {
    const before = full();
    const text = rackText(before);
    removeAt(before, [0, 1]);
    setConstAt(before, [1], 9);
    expect(rackText(before)).toBe(text);
  });

  it("constant dials are adjustable and clamped", () => {
    const rack = full();
    expect(rackText(setConstAt(rack, [1], -3))).toBe("A + B = -3");
    expect(nodeAt(setConstAt(rack, [1], 99), [1])?.mod).toEqual({
      kind: "const",
      value: CONST_MAX,
    });
    expect(nodeAt(setConstAt(rack, [1], -99), [1])?.mod).toEqual({
      kind: "const",
      value: CONST_MIN,
    });
    expect(setConstAt(rack, [0], 5)).toBe(rack); // not a dial
  });

  it("moves a subtree into a compatible empty socket only", () => {
    let rack = placeAt(m01, null, [], { kind: "card", card: "eq" });
    rack = placeAt(m01, rack, [0], { kind: "card", card: "add" });
    rack = placeAt(m01, rack, [0, 0], { kind: "sensor", name: "B" });
    const moved = moveTo(rack, [0], [1]);
    expect(rackText(moved)).toBe("? = B + ?");
    expect(moveTo(rack, [0], [0, 1])).toBe(rack); // into itself
    expect(moveTo(rack, [0, 0], [0])).toBe(rack); // occupied
    expect(moveTo(rack, [0], [])).toBe(rack); // occupied (and wrong type)
    expect(moveTo(rack, [1], [0, 1])).toBe(rack); // nothing to move
  });

  it("assigns unique ids", () => {
    const ids: number[] = [];
    const walk = (n: Rack): void => {
      if (!n) return;
      ids.push(n.id);
      n.inputs.forEach(walk);
    };
    walk(build(m06, parseBool("A + B = 6 && A mod 2 = 0")));
    expect(new Set(ids).size).toBe(10);
  });
});

describe("rack: readout", () => {
  it("prints ? for empty sockets with pretty's parentheses", () => {
    expect(rackText(null)).toBe("?");
    let rack = placeAt(m06, null, [], { kind: "card", card: "or" });
    expect(rackText(rack)).toBe("? || ?");
    rack = placeAt(m06, rack, [1], { kind: "card", card: "and" });
    expect(rackText(rack)).toBe("? || ? && ?");
    expect(rackText(rack, { bracketMixed: true })).toBe("? || (? && ?)");
    rack = placeAt(m06, removeAt(rack, [1]), [0], { kind: "card", card: "and" });
    expect(rackText(rack)).toBe("? && ? || ?");
  });

  it("matches pretty on complete racks, including parentheses and negatives", () => {
    const level: Level = {
      ...m06,
      hand: {
        cards: Object.fromEntries(CARD_IDS.map((id) => [id, 4])) as Level["hand"]["cards"],
        budget: 99,
      },
    };
    for (const src of [
      "A - (B - 1) = -2",
      "!(A = 0) || !(B = 0 && A >= 1)",
      "(A = 0 || B = 1) && A < 3",
      "2 * (A + B) <= (A - 3) mod 3",
      "3 * -4 != A mod 2",
      "!!(A > B)",
    ]) {
      const law = parseBool(src);
      const rack = build(level, law);
      expect(rackText(rack)).toBe(pretty(law));
      expect(pretty(rackToLaw(rack) ?? law)).toBe(pretty(law));
      expect(rackCost(rack)).toBe(lawCost(law));
    }
  });
});

describe("rack: keys and paths", () => {
  it("round-trips item keys and path keys", () => {
    const items: HandItem[] = [
      { kind: "sensor", name: "A" },
      { kind: "const" },
      { kind: "card", card: "mod2" },
    ];
    for (const item of items) expect(parseItemKey(itemKey(item))).toEqual(item);
    expect(parseItemKey("card:bogus")).toBeNull();
    expect(parseItemKey("nope")).toBeNull();
    for (const path of [[], [0], [1, 0, 1]]) expect(parsePathKey(pathKey(path))).toEqual(path);
    expect(parsePathKey("x-1")).toBeNull();
    expect(isWithin([0, 1], [0])).toBe(true);
    expect(isWithin([1], [0])).toBe(false);
  });

  it("lists every socket, SHIELD first", () => {
    const rack = placeAt(m01, null, [], { kind: "card", card: "eq" });
    expect(slotPaths(rack)).toEqual([[], [0], [1]]);
  });
});

describe("rack layout", () => {
  it("flows into the SHIELD without overlapping plates", () => {
    const rack = build(m06, parseBool("A + B = 6 && A mod 2 = 0"));
    for (const m of [METRICS, METRICS_COMPACT]) {
      const layout = layoutRack(rack, m);
      expect(layout.cells).toHaveLength(10);
      expect(layout.wires).toHaveLength(10); // 9 inner + SHIELD
      for (const a of layout.cells) {
        expect(a.x + m.cellW).toBeLessThanOrEqual(layout.shield.x);
        expect(a.y + m.cellH).toBeLessThanOrEqual(layout.height);
        for (const b of layout.cells) {
          if (a === b) continue;
          const apart =
            a.x + m.cellW <= b.x ||
            b.x + m.cellW <= a.x ||
            a.y + m.cellH <= b.y ||
            b.y + m.cellH <= a.y;
          expect(apart).toBe(true);
        }
      }
      expect(layout.wires.every((w) => w.from.x < w.to.x)).toBe(true);
    }
  });

  it("an empty rack is one socket wired to the SHIELD", () => {
    const layout = layoutRack(null);
    expect(layout.cells).toEqual([expect.objectContaining({ path: [], type: "bool", node: null })]);
    expect(layout.wires).toEqual([expect.objectContaining({ plugged: false })]);
  });
});

describe("rack store", () => {
  it("click-to-place builds Mission 01 and exposes law and cost", () => {
    const s = useRack.getState;
    s().reset(m01);
    s().select({ kind: "card", card: "eq" });
    expect(s().place([])).toBe(true);
    expect(s().selected).toBeNull();
    expect(s().place([0])).toBe(false); // nothing selected
    s().select({ kind: "card", card: "add" });
    s().select({ kind: "card", card: "add" }); // toggles off
    expect(s().selected).toBeNull();
    s().select({ kind: "sensor", name: "A" });
    expect(s().place([])).toBe(false); // occupied, keeps selection
    expect(s().selected).toEqual({ kind: "sensor", name: "A" });
    s().select({ kind: "card", card: "add" });
    s().place([0]);
    s().place([0, 0], { kind: "sensor", name: "A" });
    s().place([0, 1], { kind: "sensor", name: "B" });
    expect(s().law).toBeNull();
    s().place([1], { kind: "const" });
    s().setConst([1], 6);
    expect(pretty(s().law ?? parseBool("false"))).toBe("A + B = 6");
    expect(s().cost).toBe(7);
    s().move([0, 1], [0, 0]); // occupied: no-op
    s().remove([0]);
    expect(s().law).toBeNull();
    expect(s().cost).toBe(3); // = and the dial
    s().reset(m06);
    expect(s().rack).toBeNull();
    expect(s().cost).toBe(0);
    expect(s().level?.id).toBe(m06.id);
  });
});
