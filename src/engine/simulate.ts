// Concrete execution of a level: enabled controls, one step, seeded random telemetry and the
// BFS "live attack" used as the fast path of the verification pipeline.

import type { BoolExpr, State } from "./expr.ts";
import { evalBool, evalNum } from "./expr.ts";
import type { Control, Level } from "./level.ts";
import { initialState } from "./level.ts";

/** One entry of a run. The first entry of every trace is the power-on state. */
export interface TraceStep {
  /** Control fired to reach `state`; `TRACE_START` for the first entry. */
  control: string;
  state: State;
}

/** `control` of the first trace entry (the initial state, reached by no control). */
export const TRACE_START = "";

/** A level or engine bug, e.g. a control that drives a `nat` variable below zero. */
export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationError";
  }
}

export function enabled(level: Level, s: State): Control[] {
  return level.controls.filter((ctl) => evalBool(ctl.guard, s));
}

/**
 * Fire `controlId` from `s`. Updates are simultaneous: every right-hand side reads `s`.
 * Throws `SimulationError` if the control is unknown or disabled, or if the result leaves the
 * domain (levels must guard their controls so that never happens).
 */
export function step(level: Level, s: State, controlId: string): State {
  const ctl = level.controls.find((x) => x.id === controlId);
  if (!ctl) throw new SimulationError(`${level.id}: unknown control '${controlId}'`);
  if (!evalBool(ctl.guard, s)) {
    throw new SimulationError(`${level.id}: control '${controlId}' is disabled`);
  }
  return applyUpdate(level, ctl, s);
}

/** Apply a control's update without checking its guard. Checks the domain of the result. */
export function applyUpdate(level: Level, ctl: Control, s: State): State {
  const next: State = { ...s };
  for (const [name, e] of Object.entries(ctl.update)) next[name] = evalNum(e, s);
  for (const x of level.vars) {
    const value = next[x.name];
    if (value === undefined) throw new SimulationError(`${level.id}: '${x.name}' missing`);
    if (x.domain === "nat" && value < 0) {
      throw new SimulationError(
        `${level.id}: control '${ctl.id}' drives nat '${x.name}' to ${value}`,
      );
    }
  }
  return next;
}

/** mulberry32: tiny deterministic PRNG, uniform in [0, 1). Same seed → same sequence. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random telemetry: from the initial state, fire a uniformly chosen enabled control up to
 * `steps` times. Same `seed` → same run. Stops early when no control is enabled.
 */
export function randomRun(level: Level, steps: number, seed: number): TraceStep[] {
  const rand = prng(seed);
  let s = initialState(level);
  const trace: TraceStep[] = [{ control: TRACE_START, state: s }];
  for (let i = 0; i < steps; i++) {
    const options = enabled(level, s);
    if (options.length === 0) break;
    const ctl = options[Math.floor(rand() * options.length)];
    if (!ctl) break;
    s = applyUpdate(level, ctl, s);
    trace.push({ control: ctl.id, state: s });
  }
  return trace;
}

export interface BfsOptions {
  /** Maximum number of control firings in a trace. */
  depth?: number;
  /** Maximum number of distinct states explored. */
  maxStates?: number;
}

/**
 * Breadth-first search from the initial state for a reachable state violating `law`.
 * Returns the shortest such trace (starting with the initial state), or `null` if none is found
 * within the bounds. `null` proves nothing: the lab step of `verify` is what is sound.
 */
export function bfsAttack(level: Level, law: BoolExpr, opts: BfsOptions = {}): TraceStep[] | null {
  const depth = opts.depth ?? 12;
  const maxStates = opts.maxStates ?? 5000;
  const key = (s: State): string => level.vars.map((x) => s[x.name]).join(",");

  interface Node {
    step: TraceStep;
    parent: Node | null;
    depth: number;
  }
  const traceOf = (n: Node): TraceStep[] => {
    const out: TraceStep[] = [];
    for (let cur: Node | null = n; cur; cur = cur.parent) out.push(cur.step);
    return out.reverse();
  };

  const s0 = initialState(level);
  const root: Node = { step: { control: TRACE_START, state: s0 }, parent: null, depth: 0 };
  if (!evalBool(law, s0)) return traceOf(root);

  const seen = new Set([key(s0)]);
  let frontier = [root];
  while (frontier.length > 0) {
    const next: Node[] = [];
    for (const node of frontier) {
      if (node.depth >= depth) continue;
      for (const ctl of enabled(level, node.step.state)) {
        const s = applyUpdate(level, ctl, node.step.state);
        const k = key(s);
        if (seen.has(k)) continue;
        if (seen.size >= maxStates) return null;
        seen.add(k);
        const child: Node = {
          step: { control: ctl.id, state: s },
          parent: node,
          depth: node.depth + 1,
        };
        if (!evalBool(law, s)) return traceOf(child);
        next.push(child);
      }
    }
    frontier = next;
  }
  return null;
}
