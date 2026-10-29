import { beforeEach, describe, expect, it } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import {
  CHAPTERS,
  chapterIndex,
  chapterStartingAt,
  migrateBestScores,
  migrateSecured,
  missionStatus,
  nextMission,
  useCampaign,
} from "../src/game/campaign.ts";
import { loadBest, saveBest } from "../src/game/bestScores.ts";
import { useMission } from "../src/game/missionStore.ts";
import { parseRoute, routeHref } from "../src/ui/router.ts";

const levels = loadBundledLevels();
const ids = levels.map((l) => l.id);
const [m01] = levels;
if (!m01) throw new Error("Mission 01 missing");

const statuses = (secured: string[]) => ids.map((_, i) => missionStatus(ids, new Set(secured), i));

describe("campaign unlocks", () => {
  it("fresh profile: only Mission 01 is available", () => {
    expect(statuses([])).toEqual(["available", ...Array<string>(ids.length - 1).fill("locked")]);
    expect(nextMission(ids, new Set())).toBe(ids[0]);
  });

  it("securing mission N unlocks N+1", () => {
    const s = statuses([ids[0] ?? "", ids[1] ?? ""]);
    expect(s.slice(0, 4)).toEqual(["secured", "secured", "available", "locked"]);
    expect(nextMission(ids, new Set([ids[0] ?? ""]))).toBe(ids[1]);
  });

  it("an off-campaign win stays secured and unlocks only its successor", () => {
    const s = statuses([ids[3] ?? ""]);
    expect(s).toEqual([
      "available",
      "locked",
      "locked",
      "secured",
      "available",
      ...Array<string>(ids.length - 5).fill("locked"),
    ]);
  });

  it("the bonus chapter opens when FINAL BREACH is secured", () => {
    const main = ids.slice(0, 6);
    expect(statuses(main)[6]).toBe("available");
    expect(statuses(main.slice(0, 5))[6]).toBe("locked");
    expect(nextMission(ids, new Set(main))).toBe("07-twin-jacks");
  });

  it("The Deep Grid opens when the last bonus mission is secured", () => {
    const first9 = ids.slice(0, 9);
    expect(statuses(first9)[9]).toBe("available");
    expect(statuses(first9.slice(0, 8))[9]).toBe("locked");
    expect(nextMission(ids, new Set(first9))).toBe("10-the-reading-room");
  });

  it("a save from before the bonus chapter was reordered keeps every secured mission", () => {
    const old = [...ids.slice(0, 6), "07-the-splitter", "08-twin-jacks"];
    const secured = migrateSecured(old);
    expect(secured).toEqual([...ids.slice(0, 6), "09-the-splitter", "07-twin-jacks"]);
    // 07 and 09 secured; 08 (the airlock, never won) is available because 07 is.
    expect(statuses(secured).slice(6, 10)).toEqual([
      "secured",
      "available",
      "secured",
      "available",
    ]);
  });

  it("a save that secured the replaced Mission 05 keeps 05 secured and 06 open", () => {
    const old = ["01-last-reactor", "05-false-defense", "05-counterweight"];
    expect(migrateSecured(old)).toEqual(["01-last-reactor", "05-counterweight"]);
    const secured = migrateSecured(ids.slice(0, 4).concat("05-false-defense"));
    expect(statuses(secured).slice(4, 6)).toEqual(["secured", "available"]);
  });

  it("best scores of renumbered missions follow them (needs storage)", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const g = globalThis as { window?: unknown };
    const had = "window" in g;
    const prev = g.window;
    g.window = { localStorage: fake };
    try {
      saveBest("07-the-splitter", 900);
      saveBest("08-twin-jacks", 700);
      saveBest("07-twin-jacks", 800);
      saveBest("05-false-defense", 500);
      migrateBestScores();
      migrateBestScores();
      expect(loadBest("09-the-splitter")).toBe(900);
      expect(loadBest("07-twin-jacks")).toBe(800);
      expect(loadBest("07-the-splitter")).toBeNull();
      expect(loadBest("08-twin-jacks")).toBeNull();
      // A replaced mission's score is not carried over.
      expect(loadBest("05-counterweight")).toBeNull();
    } finally {
      if (had) g.window = prev;
      else delete g.window;
    }
  });

  it("all secured: nothing left to continue", () => {
    expect(nextMission(ids, new Set(ids))).toBeNull();
  });
});

describe("chapters", () => {
  it("split the campaign after FINAL BREACH and after THE SPLITTER", () => {
    expect(CHAPTERS.map((c) => c.first)).toEqual(["01", "07", "10"]);
    expect(ids.map(chapterIndex)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
    expect(chapterStartingAt("07-twin-jacks")?.title).toBe("ARGUS Strikes Back");
    expect(chapterStartingAt("10-the-reading-room")?.title).toBe("The Deep Grid");
    expect(chapterStartingAt("08")).toBeUndefined();
  });

  it("every chapter starts at a shipped mission", () => {
    for (const ch of CHAPTERS) expect(ids.some((id) => id.startsWith(ch.first))).toBe(true);
  });
});

describe("campaign store (no storage available in Node)", () => {
  beforeEach(() => useCampaign.getState().resetProgress(ids));

  it("secures idempotently and resets", () => {
    const c = useCampaign.getState();
    c.secure(m01.id);
    c.secure(m01.id);
    expect(useCampaign.getState().secured).toEqual([m01.id]);
    useCampaign.getState().resetProgress(ids);
    expect(useCampaign.getState().secured).toEqual([]);
  });

  it("training toggles", () => {
    useCampaign.getState().setTraining(true);
    expect(useCampaign.getState().training).toBe(true);
    useCampaign.getState().setTraining(false);
    expect(useCampaign.getState().training).toBe(false);
  });
});

describe("training mode in the mission session", () => {
  it("verdicts count as attempts but never add breach", () => {
    useMission.getState().load(m01, 1, true);
    const m = useMission.getState();
    m.recordVerdict("live_breach");
    m.recordVerdict("lab_breach");
    const after = useMission.getState();
    expect(after.breach).toBe(0);
    expect(after.attempts).toBe(2);
    after.restart();
    expect(useMission.getState().training).toBe(true);
  });

  it("outside training the breach still moves", () => {
    useMission.getState().load(m01, 1);
    useMission.getState().recordVerdict("live_breach");
    expect(useMission.getState().breach).toBe(20);
  });
});

describe("routes", () => {
  it("parses the query string", () => {
    expect(parseRoute("")).toEqual({ screen: "title" });
    expect(parseRoute("?missions")).toEqual({ screen: "missions" });
    expect(parseRoute("?mission=3")).toEqual({ screen: "mission", number: "03" });
    expect(parseRoute("?mission=06")).toEqual({ screen: "mission", number: "06" });
    expect(parseRoute("?mission=abc")).toEqual({ screen: "title" });
    expect(parseRoute("?dev")).toEqual({ screen: "dev" });
  });

  it("round-trips hrefs", () => {
    for (const r of [
      { screen: "missions" },
      { screen: "mission", number: "02" },
      { screen: "dev" },
    ] as const) {
      expect(parseRoute(routeHref(r))).toEqual(r);
    }
  });
});
