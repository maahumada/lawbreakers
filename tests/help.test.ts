// M4-T3: the tutorial script, its seen flag and the help store (which surface is open).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pretty } from "../src/engine/expr.ts";
import { loadBundledLevels } from "../src/engine/level.ts";
import { formatExpr } from "../src/ui/machine/format.ts";
import { TUTORIAL_STEPS, tutorialStep } from "../src/ui/help/tutorialSteps.ts";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage: fakeStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tutorial script", () => {
  it("is short: 5 to 7 steps, each with a target, a title and a short body", () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(TUTORIAL_STEPS.length).toBeLessThanOrEqual(7);
    for (const step of TUTORIAL_STEPS) {
      expect(step.targets.length).toBeGreaterThan(0);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.split(/\s+/).length, step.id).toBeLessThanOrEqual(32);
    }
    expect(new Set(TUTORIAL_STEPS.map((s) => s.id)).size).toBe(TUTORIAL_STEPS.length);
  });

  it("never gives away a mission's answer", () => {
    const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");
    const answers = loadBundledLevels()
      .flatMap((l) => l.solutions.flatMap((s) => [pretty(s), formatExpr(s)]))
      .map(squash);
    for (const step of TUTORIAL_STEPS) {
      const text = `${step.title} ${step.body}`;
      for (const answer of answers) expect(squash(text)).not.toContain(answer);
      // No module or comparator named next to a number, no "sum"/"total" for Mission 01.
      expect(text).not.toMatch(/\d+\s*[=≥≤<>]|[=≥≤<>]\s*\d+|\bADD\b|\bsum\b|\btotal\b/i);
    }
  });

  it("clamps out-of-range steps", () => {
    expect(tutorialStep(-1)).toBe(TUTORIAL_STEPS[0]);
    expect(tutorialStep(99)).toBe(TUTORIAL_STEPS.at(-1));
  });
});

describe("tutorial seen flag and help store", () => {
  it("counts the tutorial as seen once it ends, finished or skipped", async () => {
    const { tutorialSeen } = await import("../src/game/tutorialSeen.ts");
    const { useHelp } = await import("../src/ui/help/helpStore.ts");
    expect(tutorialSeen()).toBe(false);
    useHelp.getState().startTutorial();
    expect(useHelp.getState().step).toBe(0);
    useHelp.getState().goTo(3);
    expect(useHelp.getState().step).toBe(3);
    expect(tutorialSeen()).toBe(false);
    useHelp.getState().endTutorial();
    expect(useHelp.getState().step).toBeNull();
    expect(tutorialSeen()).toBe(true);
  });

  it("opens one surface at a time: replaying the tutorial closes the panel", async () => {
    const { useHelp } = await import("../src/ui/help/helpStore.ts");
    useHelp.getState().openPanel();
    expect(useHelp.getState().panel).toBe(true);
    useHelp.getState().startTutorial();
    expect(useHelp.getState()).toMatchObject({ panel: false, step: 0 });
    useHelp.getState().openPanel();
    expect(useHelp.getState()).toMatchObject({ panel: true, step: null });
    useHelp.getState().closePanel();
    expect(useHelp.getState().panel).toBe(false);
  });

  it("survives missing storage (shows again next time)", async () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    });
    const { tutorialSeen, markTutorialSeen } = await import("../src/game/tutorialSeen.ts");
    expect(() => markTutorialSeen()).not.toThrow();
    expect(tutorialSeen()).toBe(false);
  });
});
