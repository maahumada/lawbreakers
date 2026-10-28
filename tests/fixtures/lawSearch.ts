// Bounded search over the Laws a mission's hand can build (M3-T7 cost balance). Enumerates every
// buildable Law up to a cost, discards the ones cheap evaluation already refutes (sound: each
// refutation is a concrete state), and runs the real `verify` on the survivors.

import type { BoolExpr, CmpOp, NumExpr, State } from "../../src/engine/expr.ts";
import { CMP_OPS, evalBool, pretty } from "../../src/engine/expr.ts";
import type { CardId, Level } from "../../src/engine/level.ts";
import { cardCost, initialState, lawCost, MODULE_COST } from "../../src/engine/level.ts";
import { applyUpdate, bfsAttack, enabled } from "../../src/engine/simulate.ts";
import { verify } from "../../src/engine/verify.ts";

type Used = Partial<Record<CardId, number>>;
interface Term<T> {
  e: T;
  cost: number;
  used: Used;
  /** Mentions a sensor (pure-constant terms are not worth combining). */
  live: boolean;
}

const CMP_CARD: Record<CmpOp, CardId> = {
  "=": "eq",
  "!=": "ne",
  "<": "lt",
  "<=": "le",
  ">": "gt",
  ">=": "ge",
};

/** For a symmetric operator: `l ∘ r` is the mirror of a kept `r ∘ l` (dials go right). */
const mirrored = (l: Term<NumExpr>, r: Term<NumExpr>): boolean =>
  l.live === r.live ? pretty(l.e) > pretty(r.e) : !l.live;

function merge(level: Level, extra: CardId, ...parts: Used[]): Used | null {
  const out: Used = { [extra]: 1 };
  for (const u of parts) {
    for (const [k, n] of Object.entries(u) as [CardId, number][]) out[k] = (out[k] ?? 0) + n;
  }
  for (const [k, n] of Object.entries(out) as [CardId, number][]) {
    if (n > (level.hand.cards[k] ?? 0)) return null;
  }
  return out;
}

interface BoolTerm extends Term<BoolExpr> {
  /** `pretty(e)`, computed once (the pair loops compare it to skip commutative duplicates). */
  key: string;
  /** Bit i set when the Law is true on `samples[i].state`. */
  mask: bigint;
}

/**
 * Every buildable Law of cost ≤ `maxCost`, with dial values in `consts`. Commutative duplicates
 * skipped. With `samples` (states the machine really reaches, `want: true`, and meltdown states,
 * `want: false`), Laws that disagree with any sample are left out of the result: they cannot hold
 * (sound pruning, it only drops Laws `verify` would refute). Terms too expensive to nest inside
 * another Law are then never built unless they agree, which keeps big AND/OR hands (08–09) fast.
 */
export function buildableLaws(
  level: Level,
  maxCost: number,
  consts: readonly number[],
  samples: readonly { state: State; want: boolean }[] = [],
): BoolExpr[] {
  const has = (card: CardId) => (level.hand.cards[card] ?? 0) > 0;
  const nums: Term<NumExpr>[][] = Array.from({ length: maxCost + 1 }, () => []);
  for (const x of level.vars) {
    nums[MODULE_COST.sensor]?.push({
      e: { k: "var", name: x.name },
      cost: MODULE_COST.sensor,
      used: {},
      live: true,
    });
  }
  for (const value of consts) {
    nums[MODULE_COST.constant]?.push({
      e: { k: "const", value },
      cost: MODULE_COST.constant,
      used: {},
      live: false,
    });
  }
  const unary = Object.keys(level.hand.cards).flatMap((id) => {
    const m = /^(scale|mod)(\d+)$/.exec(id);
    return m ? [{ card: id as CardId, kind: m[1] as "scale" | "mod", k: Number(m[2]) }] : [];
  });
  const binary = (["add", "sub"] as const).filter(has);

  for (let cost = 1; cost <= maxCost; cost++) {
    const bucket = nums[cost] ?? [];
    for (const u of unary) {
      for (const t of nums[cost - cardCost(u.card)] ?? []) {
        if (!t.live) continue;
        const used = merge(level, u.card, t.used);
        if (!used) continue;
        const e: NumExpr =
          u.kind === "scale"
            ? { k: "scale", factor: u.k, e: t.e }
            : { k: "mod", e: t.e, divisor: u.k };
        bucket.push({ e, cost, used, live: true });
      }
    }
    for (const op of binary) {
      const rest = cost - cardCost(op);
      for (let lc = 1; lc < rest; lc++) {
        for (const l of nums[lc] ?? []) {
          for (const r of nums[rest - lc] ?? []) {
            if (!l.live && !r.live) continue;
            if (op === "add" && mirrored(l, r)) continue;
            const used = merge(level, op, l.used, r.used);
            if (!used) continue;
            bucket.push({ e: { k: op, l: l.e, r: r.e }, cost, used, live: true });
          }
        }
      }
    }
  }

  const bit = (i: number) => 1n << BigInt(i);
  const all = bit(samples.length) - 1n;
  const target = samples.reduce((m, x, i) => (x.want ? m | bit(i) : m), 0n);
  const maskOf = (e: BoolExpr) =>
    samples.reduce((m, x, i) => (evalBool(e, x.state) ? m | bit(i) : m), 0n);
  // The cheapest wrapper a term can sit in: NOT (+2), or AND/OR (+3) with the cheapest comparison.
  const cheapestCmp = Math.min(
    ...CMP_OPS.filter((op) => has(CMP_CARD[op])).map(
      (op) => cardCost(CMP_CARD[op]) + MODULE_COST.sensor + MODULE_COST.constant,
    ),
  );
  const wrap = Math.min(
    has("not") ? cardCost("not") : Infinity,
    has("and") || has("or") ? MODULE_COST.logic + cheapestCmp : Infinity,
  );
  const rootOnly = (cost: number) => cost + wrap > maxCost;

  const bools: BoolTerm[][] = Array.from({ length: maxCost + 1 }, () => []);
  for (let cost = 1; cost <= maxCost; cost++) {
    const bucket = bools[cost] ?? [];
    const pruned = samples.length > 0 && rootOnly(cost);
    for (const op of CMP_OPS) {
      const card = CMP_CARD[op];
      if (!has(card)) continue;
      const rest = cost - cardCost(card);
      for (let lc = 1; lc < rest; lc++) {
        for (const l of nums[lc] ?? []) {
          for (const r of nums[rest - lc] ?? []) {
            if (!l.live && !r.live) continue;
            if ((op === "=" || op === "!=") && mirrored(l, r)) continue;
            const used = merge(level, card, l.used, r.used);
            if (!used) continue;
            const e: BoolExpr = { k: "cmp", op, l: l.e, r: r.e };
            const mask = maskOf(e);
            if (pruned && mask !== target) continue;
            bucket.push({ e, cost, used, live: true, key: pretty(e), mask });
          }
        }
      }
    }
    if (has("not")) {
      for (const t of bools[cost - cardCost("not")] ?? []) {
        const mask = all & ~t.mask;
        if (pruned && mask !== target) continue;
        const used = merge(level, "not", t.used);
        const e: BoolExpr = { k: "not", e: t.e };
        if (used) bucket.push({ e, cost, used, live: true, key: pretty(e), mask });
      }
    }
    for (const op of ["and", "or"] as const) {
      if (!has(op)) continue;
      const rest = cost - cardCost(op);
      for (let lc = 1; lc < rest; lc++) {
        for (const l of bools[lc] ?? []) {
          for (const r of bools[rest - lc] ?? []) {
            const mask = op === "and" ? l.mask & r.mask : l.mask | r.mask;
            if (pruned && mask !== target) continue;
            if (l.key >= r.key) continue;
            const used = merge(level, op, l.used, r.used);
            if (!used) continue;
            const e: BoolExpr = { k: op, l: l.e, r: r.e };
            bucket.push({ e, cost, used, live: true, key: pretty(e), mask });
          }
        }
      }
    }
  }
  return bools.flat().flatMap((t) => (t.mask === target ? [t.e] : []));
}

/** States the machine reaches from power-on (breadth first, at most `max`). */
function reachable(level: Level, max: number): State[] {
  const seen = new Map<string, State>();
  const queue = [initialState(level)];
  while (queue.length > 0 && seen.size < max) {
    const s = queue.shift();
    if (!s) break;
    const key = JSON.stringify(s);
    if (seen.has(key)) continue;
    seen.set(key, s);
    for (const ctl of enabled(level, s)) queue.push(applyUpdate(level, ctl, s));
  }
  return [...seen.values()];
}

/** States in a box around zero, inside the level's domains. */
function grid(level: Level, radius: number): State[] {
  let states: State[] = [{}];
  for (const x of level.vars) {
    const lo = x.domain === "nat" ? 0 : -radius;
    const next: State[] = [];
    for (const s of states) for (let n = lo; n <= radius; n++) next.push({ ...s, [x.name]: n });
    states = next;
  }
  return states;
}

/** A concrete refutation of `law` (init, reachable, lab or meltdown state), or `null`. */
function cheapRefute(level: Level, law: BoolExpr, box: readonly State[]): boolean {
  if (!evalBool(law, initialState(level))) return true;
  if (bfsAttack(level, law, { depth: 8, maxStates: 400 })) return true;
  const natOk = (s: State) => level.vars.every((x) => x.domain === "int" || (s[x.name] ?? 0) >= 0);
  for (const s of box) {
    if (!evalBool(law, s)) continue;
    if (evalBool(level.meltdown, s)) return true;
    for (const ctl of enabled(level, s)) {
      const t = applyUpdate(level, ctl, s);
      if (natOk(t) && !evalBool(law, t)) return true;
    }
  }
  return false;
}

export interface SearchResult {
  /** Laws left after sample pruning (true on reached states, false on sampled meltdowns). */
  searched: number;
  /** Laws that hold, cheapest first. */
  holding: { law: BoolExpr; cost: number }[];
}

/** Every holding Law of cost ≤ `maxCost` the hand can build with dial values in `consts`. */
export async function searchHolding(
  level: Level,
  maxCost: number,
  consts: readonly number[],
): Promise<SearchResult> {
  const box = grid(level, level.vars.length > 1 ? 14 : 30);
  const melting = box.filter((s) => evalBool(level.meltdown, s)).slice(0, 48);
  const samples = [
    ...reachable(level, 48).map((state) => ({ state, want: true })),
    ...melting.map((state) => ({ state, want: false })),
  ];
  const laws = buildableLaws(level, maxCost, consts, samples);
  const holding: SearchResult["holding"] = [];
  for (const law of laws) {
    if (cheapRefute(level, law, box)) continue;
    if ((await verify(level, law)).kind === "holds") holding.push({ law, cost: lawCost(law) });
  }
  holding.sort((a, b) => a.cost - b.cost || pretty(a.law).localeCompare(pretty(b.law)));
  return { searched: laws.length, holding };
}
