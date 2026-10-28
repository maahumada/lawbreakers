// The Law Engine rack as a *partial* expression tree. Pure functions only (no React, no store):
// the rack store and the UI are thin layers over these.
//
// A rack is the content of the SHIELD socket: either empty (`null`) or a module whose input
// sockets hold more modules or nothing. Sockets are addressed by a `SlotPath`: `[]` is the SHIELD
// socket, `[i]` is input `i` of the module in the SHIELD, `[i, j]` input `j` of that one, etc.

import type { BoolExpr, Expr, ExprType, NumExpr } from "../engine/expr.ts";
import { add, and, c, cmp, mod, not, or, scale, sub, v } from "../engine/expr.ts";
import type { CardId, Level } from "../engine/level.ts";
import { CARD_IDS, cardCost, MODULE_COST } from "../engine/level.ts";

/** A constant dial's range. */
export const CONST_MIN = -20;
export const CONST_MAX = 20;

export type RackModule =
  | { kind: "sensor"; name: string }
  | { kind: "const"; value: number }
  | { kind: "card"; card: CardId };

export interface RackNode {
  /** Stable id for React keys and drag handles; unique within a rack. */
  id: number;
  mod: RackModule;
  /** One entry per input socket; `null` is an empty socket. */
  inputs: (RackNode | null)[];
}

export type Rack = RackNode | null;
export type SlotPath = readonly number[];

/** What the hand offers: a sensor, a fresh constant dial, or an operator card. */
export type HandItem =
  { kind: "sensor"; name: string } | { kind: "const" } | { kind: "card"; card: CardId };

// ---------------------------------------------------------------------------
// Module catalogue

export interface ModuleShape {
  /** Plug type: round = number, square = signal. */
  out: ExprType;
  /** Socket types, left to right in the formula. */
  inputs: readonly ExprType[];
}

const NUM2: ModuleShape = { out: "num", inputs: ["num", "num"] };
const NUM1: ModuleShape = { out: "num", inputs: ["num"] };
const CMP: ModuleShape = { out: "bool", inputs: ["num", "num"] };
const LOGIC2: ModuleShape = { out: "bool", inputs: ["bool", "bool"] };
const LOGIC1: ModuleShape = { out: "bool", inputs: ["bool"] };
const LEAF: ModuleShape = { out: "num", inputs: [] };

const CMP_OP = { eq: "=", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=" } as const;
type CmpCard = keyof typeof CMP_OP;
const isCmpCard = (card: CardId): card is CmpCard => card in CMP_OP;

const CMP_LABEL: Record<CmpCard, string> = { eq: "=", ne: "≠", lt: "<", le: "≤", gt: ">", ge: "≥" };

/** `scale2` → `["scale", 2]`, `mod3` → `["mod", 3]`, else `null`. */
function parametric(card: CardId): ["scale" | "mod", number] | null {
  const m = /^(scale|mod)(\d+)$/.exec(card);
  return m ? [m[1] as "scale" | "mod", Number(m[2])] : null;
}

export function cardShape(card: CardId): ModuleShape {
  if (isCmpCard(card)) return CMP;
  if (card === "add" || card === "sub") return NUM2;
  if (card === "and" || card === "or") return LOGIC2;
  if (card === "not") return LOGIC1;
  return NUM1; // scaleK, modK
}

export function moduleShape(m: RackModule | HandItem): ModuleShape {
  return m.kind === "card" ? cardShape(m.card) : LEAF;
}

/** Face text of a card: `ADD`, `×2`, `MOD 2`, `≥`, `AND`… */
export function cardLabel(card: CardId): string {
  if (isCmpCard(card)) return CMP_LABEL[card];
  const p = parametric(card);
  if (p) return p[0] === "scale" ? `×${p[1]}` : `MOD ${p[1]}`;
  return card.toUpperCase();
}

const CMP_NAME: Record<CmpCard, string> = {
  eq: "equals",
  ne: "not equal",
  lt: "less than",
  le: "at most",
  gt: "greater than",
  ge: "at least",
};

/** Spoken name for screen readers: `equals`, `times 2`, `mod 2`, `add`… */
export function cardName(card: CardId): string {
  if (isCmpCard(card)) return CMP_NAME[card];
  const p = parametric(card);
  if (p) return p[0] === "scale" ? `times ${p[1]}` : `mod ${p[1]}`;
  return card;
}

/** Stable key of a hand item (`sensor:A`, `const`, `card:add`), used for ids and test ids. */
export function itemKey(item: HandItem): string {
  switch (item.kind) {
    case "sensor":
      return `sensor:${item.name}`;
    case "const":
      return "const";
    case "card":
      return `card:${item.card}`;
  }
}

/** Parse `itemKey` back. Returns `null` for anything else. */
export function parseItemKey(key: string): HandItem | null {
  if (key === "const") return { kind: "const" };
  const [kind, rest] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  if (kind === "sensor" && rest) return { kind: "sensor", name: rest };
  if (kind === "card" && (CARD_IDS as readonly string[]).includes(rest)) {
    return { kind: "card", card: rest as CardId };
  }
  return null;
}

export const pathKey = (path: SlotPath): string => (path.length === 0 ? "root" : path.join("-"));

export function parsePathKey(key: string): SlotPath | null {
  if (key === "root") return [];
  if (!/^\d+(-\d+)*$/.test(key)) return null;
  return key.split("-").map(Number);
}

export const samePath = (a: SlotPath, b: SlotPath): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** True when `inner` is `outer` or lies inside its subtree. */
export const isWithin = (inner: SlotPath, outer: SlotPath): boolean =>
  inner.length >= outer.length && outer.every((x, i) => x === inner[i]);

// ---------------------------------------------------------------------------
// Navigation

/** The module plugged at `path`, or `null` (empty socket or no such socket). */
export function nodeAt(rack: Rack, path: SlotPath): RackNode | null {
  let node = rack;
  for (const i of path) {
    if (!node) return null;
    node = node.inputs[i] ?? null;
  }
  return node;
}

/** Type a socket accepts, or `null` if the socket does not exist. The SHIELD takes a signal. */
export function slotType(rack: Rack, path: SlotPath): ExprType | null {
  if (path.length === 0) return "bool";
  const parent = nodeAt(rack, path.slice(0, -1));
  if (!parent) return null;
  return moduleShape(parent.mod).inputs[path.at(-1) ?? -1] ?? null;
}

/** Replace the content of the socket at `path` (which must exist). */
function setAt(rack: Rack, path: SlotPath, value: Rack): Rack {
  const [head, ...rest] = path;
  if (head === undefined) return value;
  if (!rack || head >= rack.inputs.length) throw new RangeError(`no socket at ${pathKey(path)}`);
  const inputs = rack.inputs.slice();
  inputs[head] = setAt(rack.inputs[head] ?? null, rest, value);
  return { ...rack, inputs };
}

// ---------------------------------------------------------------------------
// Hand accounting

/** Operator cards plugged into the rack, by id. */
export function cardsUsed(rack: Rack): Partial<Record<CardId, number>> {
  const used: Partial<Record<CardId, number>> = {};
  const walk = (n: Rack): void => {
    if (!n) return;
    if (n.mod.kind === "card") used[n.mod.card] = (used[n.mod.card] ?? 0) + 1;
    n.inputs.forEach(walk);
  };
  walk(rack);
  return used;
}

/** Cards still in the hand: dealt minus plugged in (never negative). */
export function cardsLeft(hand: Level["hand"], rack: Rack): Partial<Record<CardId, number>> {
  const used = cardsUsed(rack);
  const left: Partial<Record<CardId, number>> = {};
  for (const [card, dealt] of Object.entries(hand.cards) as [CardId, number][]) {
    left[card] = Math.max(0, dealt - (used[card] ?? 0));
  }
  return left;
}

/** What one placed module costs (`MODULE_COST`); the same table as the engine's `lawCost`. */
export function moduleCost(m: RackModule): number {
  if (m.kind === "sensor") return MODULE_COST.sensor;
  if (m.kind === "const") return MODULE_COST.constant;
  return cardCost(m.card);
}

/** Rack cost: the sum of its modules' costs, so for a complete rack it equals `lawCost` of its Law. */
export function rackCost(rack: Rack): number {
  if (!rack) return 0;
  return moduleCost(rack.mod) + rack.inputs.reduce((sum, n) => sum + rackCost(n), 0);
}

export type PlaceCheck = "ok" | "no-socket" | "occupied" | "wrong-type" | "exhausted" | "unknown";

/** Whether `item` can be plugged into the socket at `path` of a rack built for `level`. */
export function canPlace(
  level: Pick<Level, "vars" | "hand">,
  rack: Rack,
  path: SlotPath,
  item: HandItem,
): PlaceCheck {
  const want = slotType(rack, path);
  if (want === null) return "no-socket";
  if (nodeAt(rack, path)) return "occupied";
  if (item.kind === "sensor" && !level.vars.some((x) => x.name === item.name)) return "unknown";
  if (moduleShape(item).out !== want) return "wrong-type";
  if (item.kind === "card" && (cardsLeft(level.hand, rack)[item.card] ?? 0) < 1) {
    return "exhausted";
  }
  return "ok";
}

// ---------------------------------------------------------------------------
// Editing. Every function returns a new rack and leaves the old one untouched.

function maxId(rack: Rack): number {
  if (!rack) return 0;
  return Math.max(rack.id, ...rack.inputs.map(maxId));
}

/** A fresh module for a hand item (constant dials start at 0). */
export function moduleOf(item: HandItem): RackModule {
  return item.kind === "const" ? { kind: "const", value: 0 } : item;
}

/**
 * Plug `item` into the empty socket at `path`. Throws if `canPlace` says no, so callers check
 * first; the UI never offers an illegal drop.
 */
export function placeAt(
  level: Pick<Level, "vars" | "hand">,
  rack: Rack,
  path: SlotPath,
  item: HandItem,
): Rack {
  const check = canPlace(level, rack, path, item);
  if (check !== "ok")
    throw new Error(`cannot place ${itemKey(item)} at ${pathKey(path)}: ${check}`);
  const mod = moduleOf(item);
  const node: RackNode = {
    id: maxId(rack) + 1,
    mod,
    inputs: moduleShape(mod).inputs.map(() => null),
  };
  return setAt(rack, path, node);
}

/** Unplug the module at `path` with its whole subtree (its cards go back to the hand). */
export function removeAt(rack: Rack, path: SlotPath): Rack {
  if (!nodeAt(rack, path)) return rack;
  return setAt(rack, path, null);
}

/**
 * Move the module at `from` (with its subtree) into the empty socket `to`. Returns the rack
 * unchanged when the move is illegal (empty source, occupied or wrong-typed target, or a target
 * inside the moved subtree).
 */
export function moveTo(rack: Rack, from: SlotPath, to: SlotPath): Rack {
  const node = nodeAt(rack, from);
  if (!node || isWithin(to, from) || nodeAt(rack, to)) return rack;
  if (slotType(rack, to) !== moduleShape(node.mod).out) return rack;
  return setAt(setAt(rack, from, null), to, node);
}

export const clampConst = (value: number): number =>
  Math.min(CONST_MAX, Math.max(CONST_MIN, Math.round(value)));

/** Set the dial of the constant at `path` (clamped to the dial range). No-op elsewhere. */
export function setConstAt(rack: Rack, path: SlotPath, value: number): Rack {
  const node = nodeAt(rack, path);
  if (!node || node.mod.kind !== "const") return rack;
  return setAt(rack, path, { ...node, mod: { kind: "const", value: clampConst(value) } });
}

// ---------------------------------------------------------------------------
// Conversion

function nodeExpr(n: RackNode | null): Expr | null {
  if (!n) return null;
  const m = n.mod;
  if (m.kind === "sensor") return v(m.name);
  if (m.kind === "const") return c(m.value);
  const args = n.inputs.map(nodeExpr);
  if (args.some((a) => a === null)) return null;
  const [l, r] = args as Expr[];
  const num = (e: Expr | undefined) => e as NumExpr;
  const sig = (e: Expr | undefined) => e as BoolExpr;
  const card = m.card;
  if (isCmpCard(card)) return cmp(CMP_OP[card], num(l), num(r));
  const p = parametric(card);
  if (p) return p[0] === "scale" ? scale(p[1], num(l)) : mod(num(l), p[1]);
  switch (card) {
    case "add":
      return add(num(l), num(r));
    case "sub":
      return sub(num(l), num(r));
    case "and":
      return and(sig(l), sig(r));
    case "or":
      return or(sig(l), sig(r));
    case "not":
      return not(sig(l));
  }
  throw new Error(`unhandled card ${card}`);
}

/**
 * The Law the rack builds, or `null` while any socket is empty. Typed sockets guarantee the
 * result is well-typed, so the casts above are safe.
 */
export function rackToLaw(rack: Rack): BoolExpr | null {
  return nodeExpr(rack) as BoolExpr | null;
}

// Precedences, loosest to tightest; must match `pretty` in expr.ts.
const P_OR = 1;
const P_AND = 2;
const P_NOT = 3;
const P_CMP = 4;
const P_ADD = 5;
const P_MUL = 6;
const P_UNARY = 7;
const P_ATOM = 8;

function precOf(n: RackNode | null): number {
  if (!n) return P_ATOM;
  const m = n.mod;
  if (m.kind === "sensor") return P_ATOM;
  if (m.kind === "const") return m.value < 0 ? P_UNARY : P_ATOM;
  const card = m.card;
  if (isCmpCard(card)) return P_CMP;
  if (parametric(card)) return P_MUL;
  switch (card) {
    case "add":
    case "sub":
      return P_ADD;
    case "and":
      return P_AND;
    case "or":
      return P_OR;
    case "not":
      return P_NOT;
  }
  return P_ATOM;
}

/**
 * Infix text of the rack in `pretty` syntax, with `?` for every empty socket. For a complete
 * rack it equals `pretty(rackToLaw(rack))`. With `bracketMixed`, an AND under an OR is bracketed
 * too, as the typeset formulas elsewhere do (`formatExpr`): `(p = 0 && a = 4) || ?`.
 */
export function rackText(rack: Rack, opts: { bracketMixed?: boolean } = {}): string {
  const at = (n: RackNode | null, min: number): string => {
    const text = rackText(n, opts);
    const mixed =
      opts.bracketMixed === true &&
      rack?.mod.kind === "card" &&
      rack.mod.card === "or" &&
      n?.mod.kind === "card" &&
      n.mod.card === "and";
    return precOf(n) >= min && !mixed ? text : `(${text})`;
  };
  if (!rack) return "?";
  const m = rack.mod;
  if (m.kind === "sensor") return m.name;
  if (m.kind === "const") return String(m.value);
  const [l = null, r = null] = rack.inputs;
  const card = m.card;
  if (isCmpCard(card)) return `${at(l, P_ADD)} ${CMP_OP[card]} ${at(r, P_ADD)}`;
  const p = parametric(card);
  if (p) return p[0] === "scale" ? `${p[1]} * ${at(l, P_UNARY)}` : `${at(l, P_MUL)} mod ${p[1]}`;
  switch (card) {
    case "add":
      return `${at(l, P_ADD)} + ${at(r, P_MUL)}`;
    case "sub":
      return `${at(l, P_ADD)} - ${at(r, P_MUL)}`;
    case "and":
      return `${at(l, P_AND)} && ${at(r, P_NOT)}`;
    case "or":
      return `${at(l, P_OR)} || ${at(r, P_AND)}`;
    case "not":
      return `!${at(l, l?.mod.kind === "card" && isCmpCard(l.mod.card) ? P_ATOM : P_NOT)}`;
  }
  return "?";
}

/** Every socket of the rack (including empty ones), depth-first, SHIELD first. */
export function slotPaths(rack: Rack): SlotPath[] {
  const out: SlotPath[] = [];
  const walk = (n: Rack, path: SlotPath): void => {
    out.push(path);
    n?.inputs.forEach((child, i) => walk(child, [...path, i]));
  };
  walk(rack, []);
  return out;
}
