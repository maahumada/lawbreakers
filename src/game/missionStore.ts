// Mission screen state: the machine's current state and the telemetry log.
// Engine semantics only: every transition goes through `step`, auto-run picks uniformly among
// enabled controls with the engine's seeded PRNG (same as `randomRun`).

import { create } from "zustand";
import type { State } from "../engine/expr.ts";
import type { Level } from "../engine/level.ts";
import { initialState } from "../engine/level.ts";
import type { TraceStep } from "../engine/simulate.ts";
import { enabled, prng, step, TRACE_START } from "../engine/simulate.ts";

/** Oldest telemetry entries are dropped past this many, to keep the log cheap to render. */
export const TELEMETRY_LIMIT = 300;

export interface TelemetryEntry extends TraceStep {
  /** Cycle number since the last reset (0 = power-on). */
  cycle: number;
}

interface MissionStore {
  level: Level | null;
  state: State;
  log: TelemetryEntry[];
  autoRun: boolean;
  rand: () => number;
  /** Load a mission at its power-on state. `seed` fixes the auto-run choices. */
  load: (level: Level, seed?: number) => void;
  /** Fire a control by hand. Ignored if it is disabled. */
  fire: (controlId: string) => void;
  /** Back to the power-on state; clears the log and stops auto-run. */
  reset: () => void;
  setAutoRun: (on: boolean) => void;
  /** One auto-run cycle. Stops auto-run when no control is enabled. */
  autoStep: () => void;
}

const startLog = (s: State): TelemetryEntry[] => [{ cycle: 0, control: TRACE_START, state: s }];

export const useMission = create<MissionStore>()((set, get) => {
  const advance = (controlId: string): void => {
    const { level, state, log } = get();
    if (!level) return;
    if (!enabled(level, state).some((c) => c.id === controlId)) return;
    const next = step(level, state, controlId);
    const cycle = (log.at(-1)?.cycle ?? 0) + 1;
    set({
      state: next,
      log: [...log, { cycle, control: controlId, state: next }].slice(-TELEMETRY_LIMIT),
    });
  };

  return {
    level: null,
    state: {},
    log: [],
    autoRun: false,
    rand: prng(1),
    load: (level, seed = Date.now()) => {
      const s = initialState(level);
      set({ level, state: s, log: startLog(s), autoRun: false, rand: prng(seed) });
    },
    fire: advance,
    reset: () => {
      const { level } = get();
      if (!level) return;
      const s = initialState(level);
      set({ state: s, log: startLog(s), autoRun: false });
    },
    setAutoRun: (on) => set({ autoRun: on }),
    autoStep: () => {
      const { level, state, rand } = get();
      if (!level) return;
      const options = enabled(level, state);
      const ctl = options[Math.floor(rand() * options.length)];
      if (!ctl) {
        set({ autoRun: false });
        return;
      }
      advance(ctl.id);
    },
  };
});
