// Breach deltas and the mission score (DESIGN.md §6). Pure: no clock, no storage.

import type { VerdictKind } from "./types.ts";

/** A failed verdict, i.e. anything but `holds`. */
export type BreachKind = Exclude<VerdictKind, "holds">;

/** Breach points (percent) ARGUS gains for each failed verdict. */
export const BREACH_DELTA: Readonly<Record<BreachKind, number>> = {
  init_failure: 10,
  live_breach: 20,
  lab_breach: 15,
  insufficient: 15,
};

/** At this breach the facility falls: MISSION FAILED. */
export const BREACH_MAX = 100;

/** Breach after a verdict (unchanged by `holds`), capped at `BREACH_MAX`. */
export function addBreach(breach: number, kind: VerdictKind): number {
  if (kind === "holds") return breach;
  return Math.min(BREACH_MAX, breach + BREACH_DELTA[kind]);
}

export const SCORE_BASE = 1000;
export const SCORE_PER_SPARE_MODULE = 50;
export const SCORE_PER_INTEGRITY_POINT = 5;
export const SCORE_PER_FAILED_ATTEMPT = 100;
export const TIME_BONUS_MAX = 200;
export const TIME_BONUS_WINDOW_MS = 5 * 60 * 1000;

export interface ScoreInput {
  verdict: VerdictKind;
  /** Hand budget of the mission. */
  budget: number;
  /** Modules in the winning Law. May exceed the budget. */
  cost: number;
  /** Breach percent when the Law held. */
  breach: number;
  /** Engagements that did not hold before this one. */
  failedAttempts: number;
  /** Time from mission start to the winning verdict. */
  elapsedMs: number;
}

export interface ScoreBreakdown {
  base: number;
  /** `50 × (budget − cost)`: negative when over budget. */
  efficiency: number;
  /** `5 × (100 − breach)`. */
  integrity: number;
  /** `−100 × failed attempts` (zero or negative). */
  attempts: number;
  /** Up to 200, decaying linearly to 0 over five minutes. */
  time: number;
  /** Sum of the terms, never below zero. */
  total: number;
}

/** Linear decay from `TIME_BONUS_MAX` at 0 ms to 0 at `TIME_BONUS_WINDOW_MS`, whole points. */
export function timeBonus(elapsedMs: number): number {
  const left = 1 - Math.max(0, elapsedMs) / TIME_BONUS_WINDOW_MS;
  return Math.round(TIME_BONUS_MAX * Math.max(0, left));
}

/**
 * DESIGN.md §6 score, or `null` for any verdict but `holds` (invalid Laws never score).
 * Over budget is allowed: the efficiency term goes negative. The total is clamped at 0.
 */
export function scoreMission(input: ScoreInput): ScoreBreakdown | null {
  if (input.verdict !== "holds") return null;
  const breach = Math.min(BREACH_MAX, Math.max(0, input.breach));
  const parts = {
    base: SCORE_BASE,
    efficiency: SCORE_PER_SPARE_MODULE * (input.budget - input.cost),
    integrity: SCORE_PER_INTEGRITY_POINT * (BREACH_MAX - breach),
    attempts: 0 - SCORE_PER_FAILED_ATTEMPT * Math.max(0, input.failedAttempts),
    time: timeBonus(input.elapsedMs),
  };
  const sum = parts.base + parts.efficiency + parts.integrity + parts.attempts + parts.time;
  return { ...parts, total: Math.max(0, sum) };
}
