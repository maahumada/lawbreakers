// Mission screen state: the machine's current state, the telemetry log, the attack display used
// to replay ARGUS's counterexamples, and the per-mission session (breach, attempts, start time).
// Engine semantics only: every transition goes through `step`, auto-run picks uniformly among
// enabled controls with the engine's seeded PRNG (same as `randomRun`).

import { create } from "zustand";
import type { State } from "../engine/expr.ts";
import type { Level } from "../engine/level.ts";
import { initialState } from "../engine/level.ts";
import { addBreach } from "../engine/score.ts";
import type { TraceStep } from "../engine/simulate.ts";
import { enabled, prng, step, TRACE_START } from "../engine/simulate.ts";
import type { VerdictKind } from "../engine/types.ts";

/** Oldest telemetry entries are dropped past this many, to keep the log cheap to render. */
export const TELEMETRY_LIMIT = 300;

export interface TelemetryEntry extends TraceStep {
  /** Cycle number since the last reset (0 = power-on). */
  cycle: number;
}

/**
 * How the machine view presents the shown state while ARGUS's verdict plays out:
 * `live` real machine from power-on, `lab` hypothetical state (hologram), `meltdown` a meltdown
 * state the Law allows, `init` the power-on state, `holds` the sealed machine.
 */
export type DisplayMode = "live" | "lab" | "meltdown" | "init" | "holds";

export interface Display {
  mode: DisplayMode;
  /** Control that produced the shown state, if any. */
  firing: string | null;
  /** Increments on every replayed fire, so the same control firing twice re-flashes. */
  pulse: number;
}

interface MissionStore {
  level: Level | null;
  state: State;
  log: TelemetryEntry[];
  autoRun: boolean;
  rand: () => number;
  /** While true, the player cannot operate the machine (ARGUS has it). */
  locked: boolean;
  display: Display | null;
  /** AI BREACH percent for this mission. */
  breach: number;
  /** Engagements so far, and how many of them did not hold. */
  attempts: number;
  failures: number;
  /** `Date.now()` when the mission (or the last retry) started. */
  startedAt: number;
  /** Training mode: verdicts never add breach (so the mission cannot fail). Set on `load`. */
  training: boolean;

  /**
   * Load a mission at its power-on state with a fresh session. `seed` fixes the auto-run choices;
   * `training` turns the breach meter off for this session.
   */
  load: (level: Level, seed?: number, training?: boolean) => void;
  /** Fire a control by hand. Ignored if it is disabled or the machine is locked. */
  fire: (controlId: string) => void;
  /** Back to the power-on state; clears the log and stops auto-run. */
  reset: () => void;
  setAutoRun: (on: boolean) => void;
  /** One auto-run cycle. Stops auto-run when no control is enabled. */
  autoStep: () => void;

  /** ARGUS takes the controls: stop auto-run, lock the machine. */
  lock: () => void;
  /** Show `state` in `mode`. `live` restarts the telemetry log from it; other modes leave it. */
  show: (state: State, mode: DisplayMode) => void;
  /** Replay one control from the shown state (through `step`); `live` also logs it. */
  replayFire: (controlId: string) => void;
  /** Back to power-on with the player in control (REBUILD). Keeps the session. */
  release: () => void;
  /** Count an engagement and add its breach (none in training). */
  recordVerdict: (kind: VerdictKind) => void;
  /** Full restart: power-on, empty session, clock restarted. */
  restart: () => void;
}

const startLog = (s: State): TelemetryEntry[] => [{ cycle: 0, control: TRACE_START, state: s }];

const freshSession = () => ({ breach: 0, attempts: 0, failures: 0, startedAt: Date.now() });

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

  const powerOn = () => {
    const { level } = get();
    if (!level) return null;
    const s = initialState(level);
    return { state: s, log: startLog(s), autoRun: false, display: null, locked: false };
  };

  return {
    level: null,
    state: {},
    log: [],
    autoRun: false,
    rand: prng(1),
    locked: false,
    display: null,
    ...freshSession(),
    training: false,
    load: (level, seed = Date.now(), training = false) => {
      const s = initialState(level);
      set({
        level,
        state: s,
        log: startLog(s),
        autoRun: false,
        rand: prng(seed),
        locked: false,
        display: null,
        training,
        ...freshSession(),
      });
    },
    fire: (controlId) => {
      if (!get().locked) advance(controlId);
    },
    reset: () => {
      const next = powerOn();
      if (next && !get().locked) set(next);
    },
    setAutoRun: (on) => {
      if (!get().locked) set({ autoRun: on });
    },
    autoStep: () => {
      const { level, state, rand, locked } = get();
      if (!level || locked) return;
      const options = enabled(level, state);
      const ctl = options[Math.floor(rand() * options.length)];
      if (!ctl) {
        set({ autoRun: false });
        return;
      }
      advance(ctl.id);
    },

    lock: () => set({ locked: true, autoRun: false }),
    show: (state, mode) => {
      const display: Display = { mode, firing: null, pulse: get().display?.pulse ?? 0 };
      if (mode === "live") set({ state, log: startLog(state), display });
      else set({ state, display });
    },
    replayFire: (controlId) => {
      const { level, state, log, display } = get();
      if (!level || !display) return;
      const next = step(level, state, controlId);
      const shown: Display = { ...display, firing: controlId, pulse: display.pulse + 1 };
      if (display.mode === "live") {
        const cycle = (log.at(-1)?.cycle ?? 0) + 1;
        set({
          state: next,
          display: shown,
          log: [...log, { cycle, control: controlId, state: next }].slice(-TELEMETRY_LIMIT),
        });
      } else {
        set({ state: next, display: shown });
      }
    },
    release: () => {
      const next = powerOn();
      if (next) set(next);
    },
    recordVerdict: (kind) => {
      const { breach, attempts, failures, training } = get();
      set({
        breach: training ? breach : addBreach(breach, kind),
        attempts: attempts + 1,
        failures: failures + (kind === "holds" ? 0 : 1),
      });
    },
    restart: () => {
      const next = powerOn();
      if (next) set({ ...next, ...freshSession() });
    },
  };
});
