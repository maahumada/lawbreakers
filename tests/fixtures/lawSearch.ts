// Bounded search over the Laws a mission's hand can build (M3-T7 cost balance). Enumerates every
// buildable Law up to a cost, discards the ones cheap evaluation already refutes (sound: each
// refutation is a concrete state), and runs the real `verify` on the survivors.

import type { BoolExpr, CmpOp, NumExpr, State } from "../../src/engine/expr.ts";
import { CMP_OPS, evalBool, evalNum, pretty } from "../../src/engine/expr.ts";
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

/** `list` split by card usage (interned by `memoMerge`, so equal usages are the same object). */
function byUsage<T extends { used: Used }>(list: readonly T[]): { used: Used; items: T[] }[] {
  const out = new Map<Used, T[]>();
  for (const t of list) {
    const items = out.get(t.used);
    if (items) items.push(t);
    else out.set(t.used, [t]);
  }
  return [...out].map(([used, items]) => ({ used, items }));
}

/**
 * `merge` memoised: card usages are interned, so the many term pairs that share the same usages
 * (most of them) cost one map lookup instead of a fresh object.
 */
function memoMerge(level: Level): (extra: CardId, ...parts: Used[]) => Used | null {
  const ids = new Map<Used, number>();
  const canon = new Map<string, Used>();
  const memo = new Map<string, Used | null>();
  const intern = (u: Used): Used => {
    const key = (Object.entries(u) as [CardId, number][])
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, n]) => `${k}${n}`)
      .join();
    let found = canon.get(key);
    if (!found) {
      found = u;
      canon.set(key, u);
      ids.set(u, ids.size);
    }
    return found;
  };
  const idOf = (u: Used) => ids.get(u) ?? ids.get(intern(u)) ?? -1;
  return (extra, ...parts) => {
    const key = `${extra}|${parts.map(idOf).join("|")}`;
    if (memo.has(key)) return memo.get(key) ?? null;
    const out = merge(level, extra, ...parts);
    const result = out && intern(out);
    memo.set(key, result);
    return result;
  };
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
  const combine = memoMerge(level);
  const none: Used = {};
  const groupCache = new Map<number, { used: Used; items: Term<NumExpr>[] }[]>();
  // Only called for costs below the one being built, whose buckets are complete.
  const numGroups = (cost: number) => {
    let g = groupCache.get(cost);
    if (!g) {
      g = byUsage(nums[cost] ?? []);
      groupCache.set(cost, g);
    }
    return g;
  };
  const nums: Term<NumExpr>[][] = Array.from({ length: maxCost + 1 }, () => []);
  for (const x of level.vars) {
    nums[MODULE_COST.sensor]?.push({
      e: { k: "var", name: x.name },
      cost: MODULE_COST.sensor,
      used: none,
      live: true,
    });
  }
  for (const value of consts) {
    nums[MODULE_COST.constant]?.push({
      e: { k: "const", value },
      cost: MODULE_COST.constant,
      used: none,
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
        const used = combine(u.card, t.used);
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
        for (const lg of numGroups(lc)) {
          for (const rg of numGroups(rest - lc)) {
            const used = combine(op, lg.used, rg.used);
            if (!used) continue;
            for (const l of lg.items) {
              for (const r of rg.items) {
                if (!l.live && !r.live) continue;
                if (op === "add" && mirrored(l, r)) continue;
                bucket.push({ e: { k: op, l: l.e, r: r.e }, cost, used, live: true });
              }
            }
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
  // Without NOT and OR, a Law is one comparison or an AND of several: it can only agree with the
  // samples if every comparison in it is true on every wanted sample (and the dual without NOT and
  // AND). Terms failing that are useless anywhere, so they are never built.
  const monotone =
    samples.length === 0 || has("not")
      ? null
      : !has("or")
        ? (mask: bigint) => (mask & target) === target
        : !has("and")
          ? (mask: bigint) => (mask & ~target) === 0n
          : null;

  // An `=` that must be true on every wanted sample pairs only terms with the same readings there:
  // a hash join on those readings instead of trying every pair (big MOD/SUB hands, Mission 14).
  const wanted = samples.filter((x) => x.want).map((x) => x.state);
  const readings = new Map<NumExpr, string>();
  const readingsOf = (e: NumExpr) => {
    let key = readings.get(e);
    if (key === undefined) {
      key = wanted.map((st) => evalNum(e, st)).join(",");
      readings.set(e, key);
    }
    return key;
  };
  const byReadings = new Map<number, Map<string, Term<NumExpr>[]>>();
  const numsReading = (cost: number, key: string) => {
    let index = byReadings.get(cost);
    if (!index) {
      index = new Map();
      for (const t of nums[cost] ?? []) {
        const k = readingsOf(t.e);
        const list = index.get(k);
        if (list) list.push(t);
        else index.set(k, [t]);
      }
      byReadings.set(cost, index);
    }
    return index.get(key) ?? [];
  };

  const bools: BoolTerm[][] = Array.from({ length: maxCost + 1 }, () => []);
  for (let cost = 1; cost <= maxCost; cost++) {
    const bucket = bools[cost] ?? [];
    const pruned = samples.length > 0 && rootOnly(cost);
    // True on every wanted sample: required at the root, and everywhere for AND-only hands.
    const mustHold = wanted.length > 0 && (pruned || (monotone !== null && !has("or")));
    for (const op of CMP_OPS) {
      const card = CMP_CARD[op];
      if (!has(card)) continue;
      const rest = cost - cardCost(card);
      const join = op === "=" && mustHold;
      const push = (l: Term<NumExpr>, r: Term<NumExpr>, used: Used) => {
        if (!l.live && !r.live) return;
        if ((op === "=" || op === "!=") && mirrored(l, r)) return;
        const e: BoolExpr = { k: "cmp", op, l: l.e, r: r.e };
        const mask = maskOf(e);
        if (pruned ? mask !== target : monotone && !monotone(mask)) return;
        bucket.push({ e, cost, used, live: true, key: pretty(e), mask });
      };
      for (let lc = 1; lc < rest; lc++) {
        if (join) {
          for (const l of nums[lc] ?? []) {
            for (const r of numsReading(rest - lc, readingsOf(l.e))) {
              const used = combine(card, l.used, r.used);
              if (used) push(l, r, used);
            }
          }
          continue;
        }
        for (const lg of numGroups(lc)) {
          for (const rg of numGroups(rest - lc)) {
            const used = combine(card, lg.used, rg.used);
            if (!used) continue;
            for (const l of lg.items) for (const r of rg.items) push(l, r, used);
          }
        }
      }
    }
    if (has("not")) {
      for (const t of bools[cost - cardCost("not")] ?? []) {
        const mask = all & ~t.mask;
        if (pruned && mask !== target) continue;
        const used = combine("not", t.used);
        const e: BoolExpr = { k: "not", e: t.e };
        if (used) bucket.push({ e, cost, used, live: true, key: pretty(e), mask });
      }
    }
    for (const op of ["and", "or"] as const) {
      if (!has(op)) continue;
      const rest = cost - cardCost(op);
      // A pruned AND can only hit the target if both sides are true on every wanted sample (an
      // OR, if both are false on every unwanted one): filter the sides before pairing them.
      const side = (lc: number) => {
        const list = bools[lc] ?? [];
        if (!pruned) return list;
        return list.filter((t) =>
          op === "and" ? (t.mask & target) === target : (t.mask & ~target) === 0n,
        );
      };
      for (let lc = 1; lc < rest; lc++) {
        const rights = byUsage(side(rest - lc));
        if (rights.length === 0) continue;
        for (const lg of byUsage(side(lc))) {
          for (const rg of rights) {
            const used = combine(op, lg.used, rg.used);
            if (!used) continue;
            for (const l of lg.items) {
              for (const r of rg.items) {
                const mask = op === "and" ? l.mask & r.mask : l.mask | r.mask;
                if (pruned && mask !== target) continue;
                if (l.key >= r.key) continue;
                const e: BoolExpr = { k: op, l: l.e, r: r.e };
                bucket.push({ e, cost, used, live: true, key: pretty(e), mask });
              }
            }
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
