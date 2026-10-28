// Level files: zod schema for the raw JSON, loader that parses every expression string,
// and static checks that do not need the solver.

import { z } from "zod";
import type { BoolExpr, Expr, NumExpr, State } from "./expr.ts";
import { freeVars } from "./expr.ts";
import { ParseError, parseBool, parseNum } from "./parse.ts";
import type { BreachKind } from "./score.ts";
import type { VerdictKind } from "./types.ts";
import { VERDICT_KINDS } from "./types.ts";

import level01 from "../levels/01-last-reactor.json";
import level02 from "../levels/02-coolant-valve.json";
import level03 from "../levels/03-mirror-pistons.json";
import level04 from "../levels/04-parity-lock.json";
import level05 from "../levels/05-counterweight.json";
import level06 from "../levels/06-final-breach.json";
import level07 from "../levels/07-the-splitter.json";
import level08 from "../levels/08-twin-jacks.json";
import level09 from "../levels/09-the-airlock.json";

// ---------------------------------------------------------------------------
// Cards

/**
 * Operator cards a mission can deal. Sensors and constant dials are unlimited and have no card.
 * `scaleK` is the `×k` card (builds `scale(k, e)`); `modK` is the `MOD k` card (builds
 * `mod(e, k)`). Add more `scaleK` / `modK` ids here when a mission needs another constant.
 */
export const CARD_IDS = [
  "add",
  "sub",
  "scale2",
  "scale3",
  "mod2",
  "mod3",
  "eq",
  "ne",
  "lt",
  "le",
  "gt",
  "ge",
  "and",
  "or",
  "not",
] as const;

export type CardId = (typeof CARD_IDS)[number];

const CMP_CARD = { "=": "eq", "!=": "ne", "<": "lt", "<=": "le", ">": "gt", ">=": "ge" } as const;

/**
 * The card a node consumes from the hand, `null` for free modules (sensors, constants, and the
 * `true`/`false` literals), or `"unavailable"` when no card can build it (e.g. `×5`).
 */
export function cardOf(e: Expr): CardId | null | "unavailable" {
  switch (e.k) {
    case "var":
    case "const":
    case "bool":
      return null;
    case "add":
    case "sub":
    case "and":
    case "or":
    case "not":
      return e.k;
    case "cmp":
      return CMP_CARD[e.op];
    case "scale":
    case "mod": {
      const id = `${e.k}${e.k === "scale" ? e.factor : e.divisor}`;
      return (CARD_IDS as readonly string[]).includes(id) ? (id as CardId) : "unavailable";
    }
  }
}

// ---------------------------------------------------------------------------
// Costs (DESIGN.md §4/§6). Cheap readings, pricier structure: a Law pays for every idea in it.

/** Cost of one module, by family. Sensors and constant dials are the cheap leaves. */
export const MODULE_COST = {
  sensor: 1,
  constant: 1,
  arithmetic: 2,
  scale: 2,
  comparator: 2,
  not: 2,
  modulo: 3,
  logic: 3,
} as const;

/** Cost of an operator card (`add` 2, `mod2` 3, `and` 3, …). */
export function cardCost(card: CardId): number {
  if (card === "add" || card === "sub") return MODULE_COST.arithmetic;
  if (card === "and" || card === "or") return MODULE_COST.logic;
  if (card === "not") return MODULE_COST.not;
  if (card.startsWith("scale")) return MODULE_COST.scale;
  if (card.startsWith("mod")) return MODULE_COST.modulo;
  return MODULE_COST.comparator;
}

/** Cost of the module at the root of `e` alone (an unbuildable `×5` is priced like `×2`). */
function nodeCost(e: Expr): number {
  switch (e.k) {
    case "var":
      return MODULE_COST.sensor;
    case "const":
    case "bool":
      return MODULE_COST.constant;
    case "scale":
      return MODULE_COST.scale;
    case "mod":
      return MODULE_COST.modulo;
    default: {
      const card = cardOf(e);
      return card === null || card === "unavailable" ? MODULE_COST.constant : cardCost(card);
    }
  }
}

/** Total cost of a Law: the sum of its modules' costs. `A + B = 6` → 1 + 1 + 2 + 1 + 2 = 7. */
export function lawCost(e: Expr): number {
  switch (e.k) {
    case "var":
    case "const":
    case "bool":
      return nodeCost(e);
    case "add":
    case "sub":
    case "cmp":
    case "and":
    case "or":
      return nodeCost(e) + lawCost(e.l) + lawCost(e.r);
    case "scale":
    case "mod":
    case "not":
      return nodeCost(e) + lawCost(e.e);
  }
}

// ---------------------------------------------------------------------------
// Raw schema (the JSON on disk)

const identifier = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "must be an identifier");
const nonEmpty = z.string().min(1);
const lines = z.array(nonEmpty).min(1);
const BREACH_KINDS = [
  "init_failure",
  "live_breach",
  "lab_breach",
  "insufficient",
] as const satisfies readonly BreachKind[];

const rawVar = z.strictObject({
  name: identifier,
  label: nonEmpty,
  domain: z.enum(["nat", "int"]),
  init: z.int(),
});

const rawControl = z.strictObject({
  id: identifier,
  label: nonEmpty,
  guard: nonEmpty,
  update: z.record(z.string(), nonEmpty),
});

export const rawLevelSchema = z.strictObject({
  id: z.string().regex(/^\d{2}-[a-z0-9-]+$/, "must look like '01-some-name'"),
  title: nonEmpty,
  concept: nonEmpty,
  briefing: nonEmpty,
  vars: z.array(rawVar).min(1),
  controls: z.array(rawControl).min(1),
  meltdown: nonEmpty,
  hand: z.strictObject({
    cards: z.partialRecord(z.enum(CARD_IDS), z.int().positive()),
    budget: z.int().positive(),
  }),
  solutions: z.array(nonEmpty).min(1),
  knownWrong: z.array(z.strictObject({ law: nonEmpty, verdict: z.enum(VERDICT_KINDS) })),
  argus: z.strictObject({
    intro: z.array(nonEmpty).min(1),
    /** Extra closing lines per failed verdict, mixed into ARGUS's global pools. */
    taunts: z.partialRecord(z.enum(BREACH_KINDS), lines).optional(),
    /** Extra closing lines when the Law holds. */
    rattled: lines.optional(),
    /** Banner hints after failures, least to most specific; per-kind lists replace `default`. */
    hints: z.strictObject({
      default: lines,
      init_failure: lines.optional(),
      live_breach: lines.optional(),
      lab_breach: lines.optional(),
      insufficient: lines.optional(),
    }),
  }),
});

export type RawLevel = z.infer<typeof rawLevelSchema>;

// ---------------------------------------------------------------------------
// Loaded level (expressions parsed)

export type Domain = "nat" | "int";

export interface VarDecl {
  name: string;
  label: string;
  domain: Domain;
  init: number;
}

export interface Control {
  id: string;
  label: string;
  guard: BoolExpr;
  /** Simultaneous assignment; variables not listed keep their value. */
  update: Record<string, NumExpr>;
}

export interface Level {
  id: string;
  title: string;
  concept: string;
  briefing: string;
  vars: VarDecl[];
  controls: Control[];
  meltdown: BoolExpr;
  hand: { cards: Partial<Record<CardId, number>>; budget: number };
  /** Test-only: reference Laws that must verify. Never used to decide a verdict. */
  solutions: BoolExpr[];
  /** Test-only: wrong Laws with the verdict the engine must return. */
  knownWrong: { law: BoolExpr; verdict: VerdictKind }[];
  argus: MissionArgus;
}

/** Mission-specific ARGUS text (see `game/argusLines.ts` for placeholders). */
export type MissionArgus = RawLevel["argus"];

export class LevelError extends Error {
  constructor(
    readonly levelId: string,
    readonly issues: string[],
  ) {
    super(`Invalid level '${levelId}':\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "LevelError";
  }
}

export function initialState(level: Level): State {
  return Object.fromEntries(level.vars.map((x) => [x.name, x.init]));
}

function pathToString(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (acc, key) =>
      typeof key === "number" ? `${acc}[${key}]` : acc ? `${acc}.${String(key)}` : String(key),
    "",
  );
}

/** Validate and parse a raw level object. Throws `LevelError` listing every problem found. */
export function loadLevel(raw: unknown): Level {
  const fallbackId =
    typeof raw === "object" && raw !== null && "id" in raw && typeof raw.id === "string"
      ? raw.id
      : "<unknown>";

  const parsed = rawLevelSchema.safeParse(raw);
  if (!parsed.success) {
    throw new LevelError(
      fallbackId,
      parsed.error.issues.map((i) => `${pathToString(i.path) || "(root)"}: ${i.message}`),
    );
  }
  const r = parsed.data;
  const issues: string[] = [];
  const declared = new Set(r.vars.map((x) => x.name));

  const parseWith = <T extends Expr>(parse: (s: string) => T, src: string, where: string) => {
    try {
      const e = parse(src);
      for (const name of freeVars(e)) {
        if (!declared.has(name)) issues.push(`${where}: unknown variable '${name}' in "${src}"`);
      }
      return e;
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
      // Source and caret on their own lines, indented to sit under the "  - " bullet text.
      const pad = "      ";
      issues.push(
        `${where}: ${err.reason} at column ${err.pos + 1}\n${pad}${src}\n${pad}${" ".repeat(err.pos)}^`,
      );
      return undefined;
    }
  };

  const seenVars = new Set<string>();
  r.vars.forEach((x, i) => {
    if (seenVars.has(x.name)) issues.push(`vars[${i}]: duplicate variable '${x.name}'`);
    seenVars.add(x.name);
    if (x.domain === "nat" && x.init < 0) {
      issues.push(`vars[${i}]: '${x.name}' is nat but init is ${x.init}`);
    }
  });

  const seenControls = new Set<string>();
  const controls: Control[] = r.controls.map((ctl, i) => {
    const where = `controls[${i}] (${ctl.id})`;
    if (seenControls.has(ctl.id)) issues.push(`${where}: duplicate control id`);
    seenControls.add(ctl.id);
    const guard = parseWith(parseBool, ctl.guard, `${where}.guard`);
    const update: Record<string, NumExpr> = {};
    for (const [name, src] of Object.entries(ctl.update)) {
      if (!declared.has(name))
        issues.push(`${where}.update: assigns undeclared variable '${name}'`);
      const e = parseWith(parseNum, src, `${where}.update.${name}`);
      if (e) update[name] = e;
    }
    return { id: ctl.id, label: ctl.label, guard: guard ?? { k: "bool", value: false }, update };
  });

  const meltdown = parseWith(parseBool, r.meltdown, "meltdown");
  const solutions = r.solutions.map((s, i) => parseWith(parseBool, s, `solutions[${i}]`));
  const knownWrong = r.knownWrong.map((w, i) => ({
    law: parseWith(parseBool, w.law, `knownWrong[${i}].law`),
    verdict: w.verdict,
  }));

  if (issues.length > 0 || !meltdown) throw new LevelError(r.id, issues);

  return {
    id: r.id,
    title: r.title,
    concept: r.concept,
    briefing: r.briefing,
    vars: r.vars,
    controls,
    meltdown,
    hand: r.hand,
    // No issues means every entry parsed.
    solutions: solutions.filter((s) => s !== undefined),
    knownWrong: knownWrong.flatMap((w) => (w.law ? [{ law: w.law, verdict: w.verdict }] : [])),
    argus: r.argus,
  };
}

const BUNDLED: readonly unknown[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
];

/** All shipped missions, in campaign order. Throws `LevelError` if any file is invalid. */
export function loadBundledLevels(): Level[] {
  return BUNDLED.map(loadLevel);
}
