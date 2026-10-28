import { describe, expect, it } from "vitest";
import { VERDICT_KINDS } from "../src/engine/types.ts";
import {
  addBreach,
  BREACH_MAX,
  scoreMission,
  timeBonus,
  TIME_BONUS_MAX,
  TIME_BONUS_WINDOW_MS,
} from "../src/engine/score.ts";
import type { ScoreInput } from "../src/engine/score.ts";

const win: ScoreInput = {
  verdict: "holds",
  budget: 5,
  cost: 5,
  breach: 0,
  failedAttempts: 0,
  elapsedMs: 0,
};

describe("breach", () => {
  it("adds the DESIGN §6 deltas", () => {
    expect(addBreach(0, "init_failure")).toBe(10);
    expect(addBreach(0, "live_breach")).toBe(20);
    expect(addBreach(0, "lab_breach")).toBe(15);
    expect(addBreach(0, "insufficient")).toBe(15);
    expect(addBreach(35, "holds")).toBe(35);
  });

  it("caps at 100", () => {
    let b = 0;
    for (let i = 0; i < 10; i++) b = addBreach(b, "live_breach");
    expect(b).toBe(BREACH_MAX);
    expect(addBreach(95, "lab_breach")).toBe(100);
  });
});

describe("score", () => {
  it("invalid Laws never score", () => {
    for (const kind of VERDICT_KINDS.filter((k) => k !== "holds")) {
      expect(scoreMission({ ...win, verdict: kind })).toBeNull();
    }
  });

  it("perfect run: base + full integrity + full time bonus", () => {
    expect(scoreMission(win)).toEqual({
      base: 1000,
      efficiency: 0,
      integrity: 500,
      attempts: 0,
      time: 200,
      total: 1700,
    });
  });

  it("follows the formula term by term", () => {
    const s = scoreMission({
      ...win,
      budget: 7,
      cost: 5,
      breach: 35,
      failedAttempts: 2,
      elapsedMs: TIME_BONUS_WINDOW_MS / 2,
    });
    expect(s).toEqual({
      base: 1000,
      efficiency: 50,
      integrity: 325,
      attempts: -200,
      time: 100,
      total: 1275,
    });
  });

  it("redundant modules only lower the score", () => {
    const lean = scoreMission({ ...win, budget: 7, cost: 5 });
    const padded = scoreMission({ ...win, budget: 7, cost: 7 });
    expect(lean && padded && lean.total > padded.total).toBe(true);
  });

  it("over budget gives a negative efficiency term", () => {
    expect(scoreMission({ ...win, cost: 8 })?.efficiency).toBe(-75);
  });

  it("never goes below zero", () => {
    const s = scoreMission({
      ...win,
      cost: 30,
      breach: 95,
      failedAttempts: 9,
      elapsedMs: TIME_BONUS_WINDOW_MS * 2,
    });
    expect(s?.total).toBe(0);
    expect(s?.efficiency).toBe(-625);
  });

  it("time bonus decays over five minutes", () => {
    expect(timeBonus(0)).toBe(TIME_BONUS_MAX);
    expect(timeBonus(-5)).toBe(TIME_BONUS_MAX);
    expect(timeBonus(60_000)).toBe(160);
    expect(timeBonus(TIME_BONUS_WINDOW_MS)).toBe(0);
    expect(timeBonus(TIME_BONUS_WINDOW_MS * 3)).toBe(0);
  });
});
