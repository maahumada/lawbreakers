// Infix text → Expr. Used by level files, tests and the dev console; players never type.
//
// Grammar, loosest to tightest (all binary operators left-associative except comparisons,
// which do not chain):
//   or    := and ("||" and)*
//   and   := not ("&&" not)*
//   not   := "!" not | cmp
//   cmp   := add (("=" | "!=" | "<" | "<=" | ">" | ">=") add)?
//   add   := mul (("+" | "-") mul)*
//   mul   := unary (("*" | "mod") unary)*
//   unary := "-" unary | atom
//   atom  := INT | IDENT | "true" | "false" | "(" or ")"
//
// Typing is checked while building: `a * b` needs a constant on one side (→ `scale`),
// `e mod k` needs a positive integer literal `k`. A unary minus on a literal folds into a
// negative constant; on anything else it becomes `scale(-1, e)`.

import type { BoolExpr, Expr, ExprType, NumExpr } from "./expr.ts";
import { CMP_OPS, isBoolExpr, isNumExpr, typeOf } from "./expr.ts";

export class ParseError extends Error {
  constructor(
    readonly reason: string,
    readonly source: string,
    /** 0-based offset into `source`. */
    readonly pos: number,
  ) {
    super(`${reason} at column ${pos + 1}\n  ${source}\n  ${" ".repeat(pos)}^`);
    this.name = "ParseError";
  }
}

type TokKind = "int" | "ident" | "op" | "eof";
interface Token {
  kind: TokKind;
  text: string;
  pos: number;
}

const KEYWORDS = new Set(["mod", "true", "false"]);
// Longest first so `<=` wins over `<`.
const OPERATORS = ["&&", "||", "!=", "<=", ">=", "=", "<", ">", "!", "+", "-", "*", "(", ")"];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src.charAt(i);
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = /^\d+/.exec(src.slice(i));
    if (num) {
      tokens.push({ kind: "int", text: num[0], pos: i });
      i += num[0].length;
      continue;
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (ident) {
      const text = ident[0];
      tokens.push({ kind: KEYWORDS.has(text) ? "op" : "ident", text, pos: i });
      i += text.length;
      continue;
    }
    const op = OPERATORS.find((o) => src.startsWith(o, i));
    if (op) {
      tokens.push({ kind: "op", text: op, pos: i });
      i += op.length;
      continue;
    }
    throw new ParseError(`unexpected character '${ch}'`, src, i);
  }
  tokens.push({ kind: "eof", text: "end of input", pos: src.length });
  return tokens;
}

/** A parsed node plus where it started, for error messages. */
interface Node {
  e: Expr;
  pos: number;
}

class Parser {
  private readonly tokens: Token[];
  private i = 0;

  constructor(private readonly src: string) {
    this.tokens = tokenize(src);
  }

  parseAll(): Expr {
    const node = this.or();
    const t = this.peek();
    if (t.kind !== "eof") this.fail(`unexpected '${t.text}'`, t.pos);
    return node.e;
  }

  // -- helpers --------------------------------------------------------------

  private peek(): Token {
    // tokenize always ends with eof, and we never advance past it.
    return this.tokens[this.i] as Token;
  }

  private next(): Token {
    const t = this.peek();
    if (t.kind !== "eof") this.i++;
    return t;
  }

  private isOp(text: string): boolean {
    const t = this.peek();
    return t.kind === "op" && t.text === text;
  }

  private fail(reason: string, pos: number): never {
    throw new ParseError(reason, this.src, pos);
  }

  private typeError(node: Node, want: ExprType, context: string): never {
    const describe = (t: ExprType) => (t === "num" ? "a number" : "a true/false signal");
    return this.fail(
      `${context} expects ${describe(want)}, got ${describe(typeOf(node.e))}`,
      node.pos,
    );
  }

  private num(node: Node, context: string): NumExpr {
    return isNumExpr(node.e) ? node.e : this.typeError(node, "num", context);
  }

  private bool(node: Node, context: string): BoolExpr {
    return isBoolExpr(node.e) ? node.e : this.typeError(node, "bool", context);
  }

  // -- grammar --------------------------------------------------------------

  private or(): Node {
    let left = this.and();
    while (this.isOp("||")) {
      this.next();
      const right = this.and();
      left = {
        e: { k: "or", l: this.bool(left, "'||'"), r: this.bool(right, "'||'") },
        pos: left.pos,
      };
    }
    return left;
  }

  private and(): Node {
    let left = this.not();
    while (this.isOp("&&")) {
      this.next();
      const right = this.not();
      left = {
        e: { k: "and", l: this.bool(left, "'&&'"), r: this.bool(right, "'&&'") },
        pos: left.pos,
      };
    }
    return left;
  }

  private not(): Node {
    if (this.isOp("!")) {
      const bang = this.next();
      const operand = this.not();
      return { e: { k: "not", e: this.bool(operand, "'!'") }, pos: bang.pos };
    }
    return this.cmp();
  }

  private cmp(): Node {
    const left = this.add();
    const t = this.peek();
    const op = CMP_OPS.find((o) => t.kind === "op" && t.text === o);
    if (!op) return left;
    this.next();
    const right = this.add();
    const ctx = `'${op}'`;
    const node: Node = {
      e: { k: "cmp", op, l: this.num(left, ctx), r: this.num(right, ctx) },
      pos: left.pos,
    };
    const after = this.peek();
    if (after.kind === "op" && CMP_OPS.some((o) => o === after.text)) {
      this.fail("comparisons cannot be chained; use '&&'", after.pos);
    }
    return node;
  }

  private add(): Node {
    let left = this.mul();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.next().text;
      const right = this.mul();
      const ctx = `'${op}'`;
      left = {
        e: { k: op === "+" ? "add" : "sub", l: this.num(left, ctx), r: this.num(right, ctx) },
        pos: left.pos,
      };
    }
    return left;
  }

  private mul(): Node {
    let left = this.unary();
    while (this.isOp("*") || this.isOp("mod")) {
      const opTok = this.next();
      const right = this.unary();
      if (opTok.text === "*") {
        const l = this.num(left, "'*'");
        const r = this.num(right, "'*'");
        if (l.k === "const") left = { e: { k: "scale", factor: l.value, e: r }, pos: left.pos };
        else if (r.k === "const")
          left = { e: { k: "scale", factor: r.value, e: l }, pos: left.pos };
        else {
          this.fail(
            "'*' needs a constant on one side (variable × variable is not allowed)",
            opTok.pos,
          );
        }
      } else {
        const l = this.num(left, "'mod'");
        const r = this.num(right, "'mod'");
        if (r.k !== "const" || r.value <= 0) {
          this.fail("'mod' needs a positive integer constant on its right", right.pos);
        }
        left = { e: { k: "mod", divisor: r.value, e: l }, pos: left.pos };
      }
    }
    return left;
  }

  private unary(): Node {
    if (this.isOp("-")) {
      const minus = this.next();
      const operand = this.num(this.unary(), "unary '-'");
      const e: NumExpr =
        operand.k === "const"
          ? { k: "const", value: 0 - operand.value }
          : { k: "scale", factor: -1, e: operand };
      return { e, pos: minus.pos };
    }
    return this.atom();
  }

  private atom(): Node {
    const t = this.next();
    switch (t.kind) {
      case "int": {
        const value = Number(t.text);
        if (!Number.isSafeInteger(value)) this.fail(`integer '${t.text}' is too large`, t.pos);
        return { e: { k: "const", value }, pos: t.pos };
      }
      case "ident":
        return { e: { k: "var", name: t.text }, pos: t.pos };
      case "op":
        if (t.text === "true" || t.text === "false") {
          return { e: { k: "bool", value: t.text === "true" }, pos: t.pos };
        }
        if (t.text === "(") {
          const inner = this.or();
          const close = this.peek();
          if (!this.isOp(")")) this.fail(`expected ')' but found '${close.text}'`, close.pos);
          this.next();
          return { e: inner.e, pos: t.pos };
        }
        return this.fail(`unexpected '${t.text}'`, t.pos);
      case "eof":
        return this.fail("unexpected end of input", t.pos);
    }
  }
}

/** Parse an expression of either type. Throws `ParseError`. */
export function parseExpr(src: string): Expr {
  return new Parser(src).parseAll();
}

/** Parse a number-valued expression (e.g. a control update). Throws `ParseError`. */
export function parseNum(src: string): NumExpr {
  const e = parseExpr(src);
  if (!isNumExpr(e)) throw new ParseError("expected a number expression", src, 0);
  return e;
}

/** Parse a true/false expression (a Law, guard or meltdown). Throws `ParseError`. */
export function parseBool(src: string): BoolExpr {
  const e = parseExpr(src);
  if (!isBoolExpr(e)) throw new ParseError("expected a true/false expression", src, 0);
  return e;
}
