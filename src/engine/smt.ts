// Expr → Z3 terms, and a small solver wrapper that turns a satisfying model into a `State`.
// Z3 is initialized once per process (or worker) and shared.

import type { Arith, Bool, Context } from "z3-solver";
import { init } from "z3-solver";
import type { BoolExpr, NumExpr, State } from "./expr.ts";

type Z3Api = Awaited<ReturnType<typeof init>>;
export type Z3Context = Context<"main">;
export type Z3Int = Arith<"main">;
export type Z3Bool = Bool<"main">;
/** Variable name → Z3 term. Building a second map (e.g. for a post-state) gives a copy of s. */
export type Z3Env = Readonly<Record<string, Z3Int>>;

interface Z3Handle {
  api: Z3Api;
  ctx: Z3Context;
}

let handle: Promise<Z3Handle> | null = null;

/** Emscripten module overrides (`locateFile`, `mainScriptUrlOrBlob`, …) passed to `init`. */
export type Z3ModuleOverrides = NonNullable<Parameters<typeof init>[0]>;

/**
 * Initialize Z3 (once; later calls share the same promise). Safe to call eagerly for warm-up.
 * `overrides` only matter on the first call; the browser worker uses them to tell Emscripten where
 * `z3-built.js` / `.wasm` live (see docs/ARCHITECTURE.md "Z3 in the browser").
 */
export function initZ3(overrides?: Z3ModuleOverrides): Promise<Z3Handle> {
  handle ??= init(overrides)
    .then((api) => ({ api, ctx: api.Context("main") }))
    .catch((err: unknown) => {
      handle = null; // a failed init (e.g. wasm fetch) may be retried
      throw err;
    });
  return handle;
}

/**
 * Terminate Z3's worker threads so a Node process can exit. Z3 is re-initialized on next use.
 * Not needed in the browser worker (it lives as long as the page).
 */
export async function shutdownZ3(): Promise<void> {
  if (!handle) return;
  const { api } = await handle;
  handle = null;
  // `em` is the Emscripten module; typed `any` upstream. Same call as `killThreads` in the Node
  // build, which the browser build does not export.
  const em = api.em as { PThread?: { terminateAllThreads(): void } };
  em.PThread?.terminateAllThreads();
}

// ---------------------------------------------------------------------------
// Translation

export function numToZ3(ctx: Z3Context, e: NumExpr, env: Z3Env): Z3Int {
  switch (e.k) {
    case "var": {
      const t = env[e.name];
      if (!t) throw new Error(`smt: no Z3 term for variable '${e.name}'`);
      return t;
    }
    case "const":
      return ctx.Int.val(e.value);
    case "add":
      return numToZ3(ctx, e.l, env).add(numToZ3(ctx, e.r, env));
    case "sub":
      return numToZ3(ctx, e.l, env).sub(numToZ3(ctx, e.r, env));
    case "scale":
      return ctx.Int.val(e.factor).mul(numToZ3(ctx, e.e, env));
    case "mod":
      // Z3 Int `mod` is Euclidean for a positive divisor, like `euclidMod` in expr.ts.
      return numToZ3(ctx, e.e, env).mod(ctx.Int.val(e.divisor));
  }
}

export function boolToZ3(ctx: Z3Context, e: BoolExpr, env: Z3Env): Z3Bool {
  switch (e.k) {
    case "bool":
      return ctx.Bool.val(e.value);
    case "cmp": {
      const l = numToZ3(ctx, e.l, env);
      const r = numToZ3(ctx, e.r, env);
      switch (e.op) {
        case "=":
          return l.eq(r);
        case "!=":
          return l.neq(r);
        case "<":
          return l.lt(r);
        case "<=":
          return l.le(r);
        case ">":
          return l.gt(r);
        case ">=":
          return l.ge(r);
      }
      break;
    }
    case "and":
      return ctx.And(boolToZ3(ctx, e.l, env), boolToZ3(ctx, e.r, env));
    case "or":
      return ctx.Or(boolToZ3(ctx, e.l, env), boolToZ3(ctx, e.r, env));
    case "not":
      return ctx.Not(boolToZ3(ctx, e.e, env));
  }
}

/** Fresh integer constants, one per name, with an optional suffix (e.g. `"'"` for s'). */
export function intEnv(ctx: Z3Context, names: readonly string[], suffix = ""): Z3Env {
  return Object.fromEntries(names.map((n) => [n, ctx.Int.const(n + suffix)]));
}

// ---------------------------------------------------------------------------
// Solver wrapper

/**
 * Find integer values for `vars` satisfying every constraint, or `null` if unsatisfiable.
 * With `bound`, every variable is also restricted to `[-bound, bound]` (small, readable models).
 * Variables the model leaves unconstrained get Z3's default completion (0).
 * Throws if Z3 answers `unknown`.
 */
export async function findModel(
  constraints: readonly BoolExpr[],
  vars: readonly string[],
  bound?: number,
): Promise<State | null> {
  const { ctx } = await initZ3();
  const env = intEnv(ctx, vars);
  const solver = new ctx.Solver();
  try {
    for (const c of constraints) solver.add(boolToZ3(ctx, c, env));
    if (bound !== undefined) {
      for (const n of vars) {
        const x = env[n];
        if (x) solver.add(x.ge(-bound), x.le(bound));
      }
    }
    const result = await solver.check();
    if (result === "unsat") return null;
    if (result === "unknown") throw new Error("smt: Z3 returned unknown");
    const model = solver.model();
    const state: State = {};
    for (const n of vars) {
      const x = env[n];
      if (!x) continue;
      const val = model.eval(x, true);
      if (!ctx.isIntVal(val)) throw new Error(`smt: non-integer model value for '${n}'`);
      const num = Number(val.value());
      if (!Number.isSafeInteger(num)) throw new Error(`smt: model value for '${n}' too large`);
      state[n] = num;
    }
    model.release();
    return state;
  } finally {
    solver.release();
  }
}
