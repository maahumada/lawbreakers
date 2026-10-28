// Dafny export for Show the Proof (DESIGN §7): the facility becomes a loop that fires any enabled
// control, the player's Law becomes its `invariant`, and "no meltdown" becomes an `assert`.
// Output is checked against a real Dafny install by `npm run dafny-check` (not part of `npm test`).

import type { BoolExpr, CmpOp, Expr, NumExpr } from "./expr.ts";
import type { Level } from "./level.ts";

// ---------------------------------------------------------------------------
// Names

// Dafny keywords and built-in type names a level variable could collide with.
const RESERVED = new Set(
  (
    "abstract allocated as assert assume bool break by calc case char class codatatype const " +
    "constructor continue datatype decreases else ensures exists expect export extends false " +
    "forall fresh function ghost if imap import in include int invariant is iset iterator label " +
    "lemma map match method modifies modify module multiset nat new newtype null object old " +
    "opaque opened ORDINAL predicate print real reads refines requires return returns reveal " +
    "seq set static string then this trait true twostate type unchanged var while witness yield " +
    "yields"
  ).split(" "),
);

/** A Dafny-legal identifier for a level variable (Dafny reserves keywords and leading `_`). */
export function dafnyName(name: string): string {
  const base = name.startsWith("_") ? `v${name}` : name;
  return RESERVED.has(base) ? `${base}_` : base;
}

/** `THE LAST REACTOR` → `TheLastReactor`. */
function methodName(title: string): string {
  const words = title.match(/[A-Za-z0-9]+/g) ?? [];
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
  return /^[A-Za-z]/.test(name) ? name : `Mission${name}`;
}

// ---------------------------------------------------------------------------
// Expressions. Dafny's precedence, loosest to tightest: `&&`/`||` (which may not be mixed without
// parentheses), comparisons, `+ -`, `* %`, prefix `- !`. Dafny's `%` on `int` is Euclidean (result
// in [0, k) for k > 0), the same as the engine's `mod`.

const P_ADD = 1;
const P_MUL = 2;
const P_PREFIX = 3;
const P_ATOM = 4;

const CMP: Record<CmpOp, string> = {
  "=": "==",
  "!=": "!=",
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
};

/** Negative literals and `-e` read badly as right operands (`x - -3`), so they get parentheses. */
const isNegative = (e: NumExpr) =>
  (e.k === "const" && e.value < 0) || (e.k === "scale" && e.factor === -1);

function numPrec(e: NumExpr): number {
  switch (e.k) {
    case "var":
      return P_ATOM;
    case "const":
      return e.value < 0 ? P_PREFIX : P_ATOM;
    case "add":
    case "sub":
      return P_ADD;
    case "scale":
      return e.factor === -1 ? P_PREFIX : P_MUL;
    case "mod":
      return P_MUL;
  }
}

function numAt(e: NumExpr, min: number, rename: (n: string) => string): string {
  const text = num(e, rename);
  return numPrec(e) >= min ? text : `(${text})`;
}

/** Operand that follows a binary operator: also parenthesizes negatives. */
function operand(e: NumExpr, min: number, rename: (n: string) => string): string {
  return isNegative(e) ? `(${num(e, rename)})` : numAt(e, min, rename);
}

function num(e: NumExpr, rename: (n: string) => string): string {
  switch (e.k) {
    case "var":
      return rename(e.name);
    case "const":
      return String(e.value);
    case "add":
    case "sub":
      return `${numAt(e.l, P_ADD, rename)} ${e.k === "add" ? "+" : "-"} ${operand(e.r, P_MUL, rename)}`;
    case "scale":
      if (e.factor === -1) return `-${operand(e.e, P_PREFIX, rename)}`;
      return `${e.factor < 0 ? `(${e.factor})` : e.factor} * ${operand(e.e, P_PREFIX, rename)}`;
    case "mod":
      return `${operand(e.e, P_PREFIX, rename)} % ${e.divisor}`;
  }
}

function bool(e: BoolExpr, rename: (n: string) => string): string {
  switch (e.k) {
    case "bool":
      return e.value ? "true" : "false";
    case "cmp":
      return `${numAt(e.l, P_ADD, rename)} ${CMP[e.op]} ${numAt(e.r, P_ADD, rename)}`;
    case "and":
    case "or": {
      const op = e.k === "and" ? "&&" : "||";
      // Same connective chains to the left without parentheses; anything else of `&&`/`||` is
      // wrapped (Dafny rejects `a && b || c`, and a right-nested chain keeps the tree's shape).
      const side = (x: BoolExpr, left: boolean) =>
        (x.k === "and" || x.k === "or") && (x.k !== e.k || !left)
          ? `(${bool(x, rename)})`
          : bool(x, rename);
      return `${side(e.l, true)} ${op} ${side(e.r, false)}`;
    }
    case "not":
      // Always `!(…)` except on a literal: `!` binds tighter than comparisons, and `!!` is a
      // Dafny operator of its own.
      return e.e.k === "bool" ? `!${bool(e.e, rename)}` : `!(${bool(e.e, rename)})`;
  }
}

/** Print a Law-language expression in Dafny syntax. `rename` maps variable names (default: as is). */
export function dafnyExpr(e: Expr, rename: (n: string) => string = (n) => n): string {
  switch (e.k) {
    case "var":
    case "const":
    case "add":
    case "sub":
    case "scale":
    case "mod":
      return num(e, rename);
    default:
      return bool(e, rename);
  }
}

// ---------------------------------------------------------------------------
// Program

const isTrue = (e: BoolExpr) => e.k === "bool" && e.value;

/**
 * A Dafny method modelling `level` with `law` as the loop invariant.
 *
 * - `nat` gauges are declared with Dafny's `nat` type, so the domain is part of the type and no
 *   extra invariant is needed; nothing but the player's Law is assumed about the loop.
 * - Each iteration first asserts that the state is not a meltdown, then fires any enabled control
 *   (an alternative `if`, one `case` per control, simultaneous assignment for the update).
 * - Dafny requires an alternative `if` to cover every state, so when no control is unconditional an
 *   explicit "idle" case covers states where every control is disabled.
 * - The loop never ends (`while true`), hence `decreases *` on the loop and the method.
 */
export function toDafny(level: Level, law: BoolExpr): string {
  const ex = (e: Expr) => dafnyExpr(e, dafnyName);
  const nameWidth = Math.max(...level.vars.map((x) => dafnyName(x.name).length));
  const hasNat = level.vars.some((x) => x.domain === "nat");

  const lines: string[] = [
    `// LAWBREAKERS · Mission ${level.id.slice(0, 2)}: ${level.title}`,
    "// Generated from the facility and your Law. Check it with `dafny verify`.",
    "//",
    "//   the facility = a loop that fires any enabled control, forever",
    "//   your Law     = the loop invariant",
    "//   meltdown     = an assertion that must never fail",
    "//   ARGUS        = the verifier, hunting for a counterexample",
  ];
  if (hasNat)
    lines.push("//", "// `nat` gauges can never go below zero: Dafny checks every update.");

  lines.push("", `method ${methodName(level.title)}()`, "  decreases *  // runs forever", "{");

  for (const x of level.vars) {
    const decl = `var ${dafnyName(x.name)}: ${x.domain}`.padEnd(nameWidth + 9);
    lines.push(`  ${decl} := ${x.init};  // ${x.label}`);
  }

  lines.push(
    "",
    "  while true",
    `    invariant ${ex(law)}  // YOUR LAW`,
    "    decreases *",
    "  {",
    `    assert !(${ex(level.meltdown)});  // no meltdown, ever`,
    "    if",
  );

  for (const ctl of level.controls) {
    lines.push(`    case ${ex(ctl.guard)} =>  // ${ctl.label}`);
    // Declaration order, identity assignments dropped.
    const changes = level.vars.flatMap((x) => {
      const e = ctl.update[x.name];
      return e === undefined || (e.k === "var" && e.name === x.name) ? [] : [{ name: x.name, e }];
    });
    if (changes.length === 0) {
      lines.push("      // no effect");
    } else {
      const lhs = changes.map((x) => dafnyName(x.name)).join(", ");
      const rhs = changes.map((x) => ex(x.e)).join(", ");
      lines.push(`      ${lhs} := ${rhs};`);
    }
  }

  if (!level.controls.some((ctl) => isTrue(ctl.guard))) {
    const anyEnabled = level.controls
      .map((ctl) => ctl.guard)
      .reduce((acc, g): BoolExpr => ({ k: "or", l: acc, r: g }));
    lines.push(`    case ${ex({ k: "not", e: anyEnabled })} =>  // nothing enabled: idle`);
  }

  lines.push("  }", "}", "");
  return lines.join("\n");
}
