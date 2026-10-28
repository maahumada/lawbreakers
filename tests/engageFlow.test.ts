import { beforeEach, describe, expect, it } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import { ARGUS_LINES, fillLine, pickLine } from "../src/game/argusLines.ts";
import { useMission } from "../src/game/missionStore.ts";
import { useRack } from "../src/game/rackStore.ts";
import { VERDICT_KINDS } from "../src/engine/types.ts";
import type { VerdictCopy } from "../src/ui/argus/verdictText.ts";
import { formatMoves, formatState, verdictCopy } from "../src/ui/argus/verdictText.ts";

const levels = loadBundledLevels();
const m01 = levels[0];
const m02 = levels[1];
if (!m01 || !m02) throw new Error("missions missing");

describe("ARGUS lines", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(fillLine("{state}. {nope}", { state: "A = 0" })).toBe("A = 0. {nope}");
  });

  it("picks from a pool with the given random source", () => {
    expect(pickLine(["a", "b", "c"], {}, () => 0.99)).toBe("c");
    expect(pickLine(["a {x}"], { x: "1" }, () => 0)).toBe("a 1");
  });

  it("has found/closing lines for every verdict", () => {
    for (const kind of VERDICT_KINDS) {
      expect(ARGUS_LINES.verdict[kind].found.length).toBeGreaterThan(0);
      expect(ARGUS_LINES.verdict[kind].closing.length).toBeGreaterThan(0);
    }
  });
});

const plain = (c: VerdictCopy) => ({ ...c, body: c.body.replace(/\u00a0/g, " ") });

describe("verdict text", () => {
  it("keeps formulas on one line", () => {
    const copy = verdictCopy(m01, parseBool("A >= 1"), {
      kind: "init_failure",
      state: { A: 0, B: 1 },
    });
    expect(copy.body).toContain("A\u00a0≥\u00a01");
    expect(copy.body).toContain("A\u00a0=\u00a00, B\u00a0=\u00a01");
  });

  it("formats states in declaration order with real minus signs", () => {
    expect(formatState(m01, { B: 6, A: 0 })).toBe("A = 0, B = 6");
    expect(formatState(m02, { x: -2 })).toBe("x = −2");
  });

  it("describes a live breach with its moves and final state", () => {
    const v = {
      kind: "live_breach" as const,
      trace: [
        { control: "", state: { A: 2, B: 4 } },
        { control: "a2b", state: { A: 1, B: 5 } },
        { control: "a2b", state: { A: 0, B: 6 } },
      ],
    };
    expect(formatMoves(m01, v)).toBe("TRANSFER A→B, TRANSFER A→B");
    const copy = plain(verdictCopy(m01, parseBool("A >= 1"), v));
    expect(copy.tag).toBe("Live attack");
    expect(copy.body).toContain("2 legal moves reach A = 0, B = 6, where A ≥ 1 is false");
  });

  it("explains a lab breach as not self-protecting", () => {
    const copy = plain(
      verdictCopy(m02, parseBool("x != 11"), {
        kind: "lab_breach",
        before: { x: 12 },
        control: "close",
        after: { x: 11 },
      }),
    );
    expect(copy.tag).toBe("Lab simulation");
    expect(copy.body).toContain("does not protect itself");
    expect(copy.body).toContain("x = 12");
    expect(copy.body).toContain("CLOSE gives x = 11");
  });
});

describe("mission store: replays and session", () => {
  beforeEach(() => useMission.getState().load(m01, 3));

  it("locks the machine while ARGUS replays", () => {
    const m = useMission.getState();
    m.lock();
    m.fire("a2b");
    m.setAutoRun(true);
    m.autoStep();
    expect(useMission.getState().state).toEqual({ A: 2, B: 4 });
    expect(useMission.getState().autoRun).toBe(false);
  });

  it("replays a live trace through step and logs it", () => {
    const m = useMission.getState();
    m.lock();
    m.show({ A: 2, B: 4 }, "live");
    m.replayFire("a2b");
    m.replayFire("a2b");
    const s = useMission.getState();
    expect(s.state).toEqual({ A: 0, B: 6 });
    expect(s.log.map((e) => e.control)).toEqual(["", "a2b", "a2b"]);
    expect(s.display).toMatchObject({ mode: "live", firing: "a2b", pulse: 2 });
    expect(() => s.replayFire("a2b")).toThrow(); // disabled at A = 0: replays obey guards
  });

  it("shows a lab state without touching the telemetry log", () => {
    const m = useMission.getState();
    m.fire("b2a");
    const logBefore = useMission.getState().log;
    m.lock();
    m.show({ A: 0, B: 9 }, "lab");
    m.replayFire("b2a");
    expect(useMission.getState().state).toEqual({ A: 1, B: 8 });
    expect(useMission.getState().log).toBe(logBefore);
  });

  it("release returns to power-on, keeping breach and attempts", () => {
    const m = useMission.getState();
    m.lock();
    m.show({ A: 0, B: 6 }, "live");
    m.recordVerdict("live_breach");
    m.release();
    const s = useMission.getState();
    expect(s).toMatchObject({ state: { A: 2, B: 4 }, locked: false, display: null });
    expect(s).toMatchObject({ breach: 20, attempts: 1, failures: 1 });
  });

  it("records verdicts and restarts the session", () => {
    const m = useMission.getState();
    m.recordVerdict("lab_breach");
    m.recordVerdict("init_failure");
    m.recordVerdict("holds");
    expect(useMission.getState()).toMatchObject({ breach: 25, attempts: 3, failures: 2 });
    m.restart();
    expect(useMission.getState()).toMatchObject({ breach: 0, attempts: 0, failures: 0 });
  });
});

describe("rack store lock", () => {
  it("ignores edits while locked and keeps the circuit", () => {
    const r = useRack.getState();
    r.reset(m01);
    r.place([], { kind: "card", card: "ge" });
    r.setLocked(true);
    expect(useRack.getState().place([0], { kind: "sensor", name: "A" })).toBe(false);
    useRack.getState().remove([]);
    useRack.getState().clear();
    expect(useRack.getState().rack).not.toBeNull();
    useRack.getState().setLocked(false);
    expect(useRack.getState().place([0], { kind: "sensor", name: "A" })).toBe(true);
  });
});
