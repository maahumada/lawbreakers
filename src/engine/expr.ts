// Law expressions: AST, constructors, evaluator, pretty-printer, module count.
// Everything stays in linear integer arithmetic plus modulo by a positive constant.

export type CmpOp = "=" | "!=" | "<" | "<=" | ">" | ">=";

export type NumExpr =
  | { k: "var"; name: string }
  | { k: "const"; value: number }
  | { k: "add" | "sub"; l: NumExpr; r: NumExpr }
  | { k: "scale"; factor: number; e: NumExpr } // constant × expr (keeps it linear)
  | { k: "mod"; divisor: number; e: NumExpr }; // divisor > 0, constant

export type BoolExpr =
  | { k: "bool"; value: boolean }
  | { k: "cmp"; op: CmpOp; l: NumExpr; r: NumExpr }
  | { k: "and" | "or"; l: BoolExpr; r: BoolExpr }
  | { k: "not"; e: BoolExpr };

export type Expr = NumExpr | BoolExpr;

export type State = Record<string, number>;

export type ExprType = "num" | "bool";

export const CMP_OPS: readonly CmpOp[] = ["=", "!=", "<", "<=", ">", ">="];

// ---------------------------------------------------------------------------
// Constructors. They validate the invariants the TS types cannot express.

function assertInt(n: number, what: string): void {
  if (!Number.isSafeInteger(n)) throw new RangeError(`${what} must be a safe integer, got ${n}`);
}

export const v = (name: string): NumExpr => ({ k: "var", name });

export const c = (value: number): NumExpr => {
  assertInt(value, "constant");
  return { k: "const", value };
};

export const add = (l: NumExpr, r: NumExpr): NumExpr => ({ k: "add", l, r });
export const sub = (l: NumExpr, r: NumExpr): NumExpr => ({ k: "sub", l, r });

export const scale = (factor: number, e: NumExpr): NumExpr => {
  assertInt(factor, "scale factor");
  return { k: "scale", factor, e };
};

export const mod = (e: NumExpr, divisor: number): NumExpr => {
  assertInt(divisor, "mod divisor");
  if (divisor <= 0) throw new RangeError(`mod divisor must be positive, got ${divisor}`);
  return { k: "mod", divisor, e };
};

export const bool = (value: boolean): BoolExpr => ({ k: "bool", value });
export const cmp = (op: CmpOp, l: NumExpr, r: NumExpr): BoolExpr => ({ k: "cmp", op, l, r });
export const eq = (l: NumExpr, r: NumExpr): BoolExpr => cmp("=", l, r);
export const ne = (l: NumExpr, r: NumExpr): BoolExpr => cmp("!=", l, r);
export const lt = (l: NumExpr, r: NumExpr): BoolExpr => cmp("<", l, r);
export const le = (l: NumExpr, r: NumExpr): BoolExpr => cmp("<=", l, r);
export const gt = (l: NumExpr, r: NumExpr): BoolExpr => cmp(">", l, r);
export const ge = (l: NumExpr, r: NumExpr): BoolExpr => cmp(">=", l, r);
export const and = (l: BoolExpr, r: BoolExpr): BoolExpr => ({ k: "and", l, r });
export const or = (l: BoolExpr, r: BoolExpr): BoolExpr => ({ k: "or", l, r });
export const not = (e: BoolExpr): BoolExpr => ({ k: "not", e });

// ---------------------------------------------------------------------------
// Typing

export function typeOf(e: Expr): ExprType {
  switch (e.k) {
    case "var":
    case "const":
    case "add":
    case "sub":
    case "scale":
    case "mod":
      return "num";
    case "bool":
    case "cmp":
    case "and":
    case "or":
    case "not":
      return "bool";
  }
}

export const isNumExpr = (e: Expr): e is NumExpr => typeOf(e) === "num";
export const isBoolExpr = (e: Expr): e is BoolExpr => typeOf(e) === "bool";

/** Variable names referenced by `e`, in first-occurrence order. */
export function freeVars(e: Expr): string[] {
  const seen = new Set<string>();
  const walk = (x: Expr): void => {
    switch (x.k) {
      case "var":
        seen.add(x.name);
        return;
      case "const":
      case "bool":
        return;
      case "add":
      case "sub":
      case "and":
      case "or":
      case "cmp":
        walk(x.l);
        walk(x.r);
        return;
      case "scale":
      case "mod":
      case "not":
        walk(x.e);
        return;
    }
  };
  walk(e);
  return [...seen];
}

/**
 * Replace every variable that has an entry in `map` by that expression (simultaneously).
 * Used to express "Law after control t" as `I[update_t / vars]` over the pre-state.
 */
export function substNum(e: NumExpr, map: Readonly<Record<string, NumExpr>>): NumExpr {
  switch (e.k) {
    case "var":
      return map[e.name] ?? e;
    case "const":
      return e;
    case "add":
    case "sub":
      return { k: e.k, l: substNum(e.l, map), r: substNum(e.r, map) };
    case "scale":
      return { k: "scale", factor: e.factor, e: substNum(e.e, map) };
    case "mod":
      return { k: "mod", divisor: e.divisor, e: substNum(e.e, map) };
  }
}

export function substBool(e: BoolExpr, map: Readonly<Record<string, NumExpr>>): BoolExpr {
  switch (e.k) {
    case "bool":
      return e;
    case "cmp":
      return { k: "cmp", op: e.op, l: substNum(e.l, map), r: substNum(e.r, map) };
    case "and":
    case "or":
      return { k: e.k, l: substBool(e.l, map), r: substBool(e.r, map) };
    case "not":
      return { k: "not", e: substBool(e.e, map) };
  }
}

// ---------------------------------------------------------------------------
// Evaluation

/** Euclidean modulo: result in [0, k) for k > 0, matching Z3's `mod` (JS `%` is not). */
export const euclidMod = (a: number, k: number): number => ((a % k) + k) % k;

export function evalNum(e: NumExpr, s: State): number {
  switch (e.k) {
    case "var": {
      const value = s[e.name];
      if (value === undefined) throw new Error(`unknown variable '${e.name}' in state`);
      return value;
    }
    case "const":
      return e.value;
    case "add":
      return evalNum(e.l, s) + evalNum(e.r, s);
    case "sub":
      return evalNum(e.l, s) - evalNum(e.r, s);
    case "scale":
      return e.factor * evalNum(e.e, s);
    case "mod":
      return euclidMod(evalNum(e.e, s), e.divisor);
  }
}

export function evalBool(e: BoolExpr, s: State): boolean {
  switch (e.k) {
    case "bool":
      return e.value;
    case "cmp": {
      const l = evalNum(e.l, s);
      const r = evalNum(e.r, s);
      switch (e.op) {
        case "=":
          return l === r;
        case "!=":
          return l !== r;
        case "<":
          return l < r;
        case "<=":
          return l <= r;
        case ">":
          return l > r;
        case ">=":
          return l >= r;
      }
      break;
    }
    case "and":
      return evalBool(e.l, s) && evalBool(e.r, s);
    case "or":
      return evalBool(e.l, s) || evalBool(e.r, s);
    case "not":
      return !evalBool(e.e, s);
  }
}

// ---------------------------------------------------------------------------
// Module count

/**
 * Number of rack modules needed to build `e`. Every AST node is exactly one module:
 * a sensor (`var`), a constant dial (`const`), an operator card (`add`, `sub`, comparators,
 * `and`, `or`, `not`). `scale` is one `×k` card (the factor is printed on the card, not a
 * separate constant) and `mod` is one `MOD k` card (divisor included). `bool` literals count 1.
 * Example: `A + B = 6` → A, B, ADD, 6, = → 5.
 */
export function size(e: Expr): number {
  switch (e.k) {
    case "var":
    case "const":
    case "bool":
      return 1;
    case "add":
    case "sub":
    case "cmp":
    case "and":
    case "or":
      return 1 + size(e.l) + size(e.r);
    case "scale":
    case "mod":
    case "not":
      return 1 + size(e.e);
  }
}

// ---------------------------------------------------------------------------
// Pretty-printing. Emits the minimum parentheses needed for `parse` to rebuild the same tree,
// except that `!` always wraps a comparison in parentheses for readability.

// Precedence levels, loosest to tightest. Must match parse.ts.
const P_OR = 1;
const P_AND = 2;
const P_NOT = 3;
const P_CMP = 4;
const P_ADD = 5;
const P_MUL = 6;
const P_UNARY = 7;
const P_ATOM = 8;

function prec(e: Expr): number {
  switch (e.k) {
    case "or":
      return P_OR;
    case "and":
      return P_AND;
    case "not":
      return P_NOT;
    case "cmp":
      return P_CMP;
    case "add":
    case "sub":
      return P_ADD;
    case "scale":
    case "mod":
      return P_MUL;
    case "const":
      // A negative literal is printed with a leading unary minus.
      return e.value < 0 ? P_UNARY : P_ATOM;
    case "var":
    case "bool":
      return P_ATOM;
  }
}

/** Print `e` so that it binds at least as tightly as `min`. */
function at(e: Expr, min: number): string {
  const text = pretty(e);
  return prec(e) >= min ? text : `(${text})`;
}

export function pretty(e: Expr): string {
  switch (e.k) {
    case "var":
      return e.name;
    case "const":
      return String(e.value);
    case "bool":
      return e.value ? "true" : "false";
    case "add":
      return `${at(e.l, P_ADD)} + ${at(e.r, P_MUL)}`;
    case "sub":
      return `${at(e.l, P_ADD)} - ${at(e.r, P_MUL)}`;
    case "scale":
      return `${e.factor} * ${at(e.e, P_UNARY)}`;
    case "mod":
      return `${at(e.e, P_MUL)} mod ${e.divisor}`;
    case "cmp":
      return `${at(e.l, P_ADD)} ${e.op} ${at(e.r, P_ADD)}`;
    case "and":
      return `${at(e.l, P_AND)} && ${at(e.r, P_NOT)}`;
    case "or":
      return `${at(e.l, P_OR)} || ${at(e.r, P_AND)}`;
    case "not":
      return `!${at(e.e, e.e.k === "cmp" ? P_ATOM : P_NOT)}`;
  }
}
