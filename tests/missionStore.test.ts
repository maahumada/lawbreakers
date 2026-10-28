import { beforeEach, describe, expect, it } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import { randomRun } from "../src/engine/simulate.ts";
import { useMission } from "../src/game/missionStore.ts";

const [m01] = loadBundledLevels();
if (!m01) throw new Error("Mission 01 missing");

describe("mission store", () => {
  beforeEach(() => useMission.getState().load(m01, 7));

  it("fires enabled controls and logs each state", () => {
    const { fire } = useMission.getState();
    fire("a2b");
    fire("a2b");
    fire("a2b"); // A = 0 now: disabled, ignored
    const { state, log } = useMission.getState();
    expect(state).toEqual({ A: 0, B: 6 });
    expect(log.map((e) => e.cycle)).toEqual([0, 1, 2]);
  });

  it("reset returns to power-on and stops auto-run", () => {
    useMission.getState().fire("b2a");
    useMission.getState().setAutoRun(true);
    useMission.getState().reset();
    const { state, log, autoRun } = useMission.getState();
    expect(state).toEqual({ A: 2, B: 4 });
    expect(log).toHaveLength(1);
    expect(autoRun).toBe(false);
  });

  it("auto-run makes the same choices as randomRun with the same seed", () => {
    for (let i = 0; i < 10; i++) useMission.getState().autoStep();
    const run = randomRun(m01, 10, 7);
    expect(useMission.getState().log.map((e) => e.state)).toEqual(run.map((t) => t.state));
  });
});
