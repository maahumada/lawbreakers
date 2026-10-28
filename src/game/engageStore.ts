// ENGAGE flow: the phase of the attack, ARGUS's terminal lines, the engaged Law, its verdict and,
// on THE LAW HOLDS, the score. The sequencing (timers, worker calls) lives in `ui/argus/engage.ts`.

import { create } from "zustand";
import type { BoolExpr } from "../engine/expr.ts";
import type { Level } from "../engine/level.ts";
import type { ScoreBreakdown } from "../engine/score.ts";
import type { Verdict } from "../engine/types.ts";

/**
 * `idle` building; `attacking` worker running, ARGUS talking; `replaying` the machine shows the
 * verdict; `verdict` banner up, REBUILD available; `results` score overlay (THE LAW HOLDS);
 * `failed` breach reached 100%.
 */
export type EngagePhase = "idle" | "attacking" | "replaying" | "verdict" | "results" | "failed";

export type LineTone = "argus" | "system" | "error";

export interface TermLine {
  id: number;
  text: string;
  tone: LineTone;
}

export interface WinResult {
  score: ScoreBreakdown;
  /** Best total for this mission after this win, and whether this win set it. */
  best: number;
  newBest: boolean;
  cost: number;
  budget: number;
  attempts: number;
  breach: number;
  elapsedMs: number;
}

interface EngageStore {
  phase: EngagePhase;
  lines: TermLine[];
  /** The Law under attack (kept after the verdict, for the probe and the results). */
  law: BoolExpr | null;
  verdict: Verdict | null;
  /** Breach added by the last verdict (0 for holds). */
  breachDelta: number;
  result: WinResult | null;
  /** Fresh terminal for `level` (its ARGUS intro), back to idle. */
  reset: (level: Level) => void;
  begin: (law: BoolExpr) => void;
  say: (text: string, tone?: LineTone) => void;
  setPhase: (phase: EngagePhase) => void;
  setVerdict: (verdict: Verdict, breachDelta: number) => void;
  setResult: (result: WinResult) => void;
  /** Back to building after a verdict or an error (keeps the terminal history). */
  idle: () => void;
}

let nextLineId = 1;
const line = (text: string, tone: LineTone): TermLine => ({ id: nextLineId++, text, tone });

/** Older lines scroll away past this many. */
const MAX_LINES = 60;

export const useEngage = create<EngageStore>()((set, get) => ({
  phase: "idle",
  lines: [],
  law: null,
  verdict: null,
  breachDelta: 0,
  result: null,
  reset: (level) =>
    set({
      phase: "idle",
      lines: level.argus.intro.map((t) => line(t, "argus")),
      law: null,
      verdict: null,
      breachDelta: 0,
      result: null,
    }),
  begin: (law) => set({ phase: "attacking", law, verdict: null, breachDelta: 0, result: null }),
  say: (text, tone = "argus") =>
    set({ lines: [...get().lines, line(text, tone)].slice(-MAX_LINES) }),
  setPhase: (phase) => set({ phase }),
  setVerdict: (verdict, breachDelta) => set({ verdict, breachDelta }),
  setResult: (result) => set({ result }),
  idle: () => set({ phase: "idle", verdict: null, breachDelta: 0, result: null }),
}));
