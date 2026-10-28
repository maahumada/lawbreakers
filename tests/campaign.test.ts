import { beforeEach, describe, expect, it } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import {
  CHAPTERS,
  chapterIndex,
  chapterStartingAt,
  migrateSecured,
  missionStatus,
  nextMission,
  useCampaign,
} from "../src/game/campaign.ts";
import { useMission } from "../src/game/missionStore.ts";
import { parseRoute, routeHref } from "../src/ui/router.ts";

const levels = loadBundledLevels();
const ids = levels.map((l) => l.id);
const [m01] = levels;
if (!m01) throw new Error("Mission 01 missing");

const statuses = (secured: string[]) => ids.map((_, i) => missionStatus(ids, new Set(secured), i));

describe("campaign unlocks", () => {
  it("fresh profile: only Mission 01 is available", () => {
    expect(statuses([])).toEqual(["available", ...Array<string>(8).fill("locked")]);
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
      ...Array<string>(4).fill("locked"),
    ]);
  });

  it("the bonus chapter opens when FINAL BREACH is secured", () => {
    const main = ids.slice(0, 6);
    expect(statuses(main)[6]).toBe("available");
    expect(statuses(main.slice(0, 5))[6]).toBe("locked");
    expect(nextMission(ids, new Set(main))).toBe("07-the-splitter");
  });

  it("a save that secured the replaced Mission 05 keeps 05 secured and 06 open", () => {
    const old = ["01-last-reactor", "05-false-defense", "05-counterweight"];
    expect(migrateSecured(old)).toEqual(["01-last-reactor", "05-counterweight"]);
    const secured = migrateSecured(ids.slice(0, 4).concat("05-false-defense"));
    expect(statuses(secured).slice(4, 6)).toEqual(["secured", "available"]);
  });

  it("all secured: nothing left to continue", () => {
    expect(nextMission(ids, new Set(ids))).toBeNull();
  });
});

describe("chapters", () => {
  it("split the campaign after FINAL BREACH", () => {
    expect(CHAPTERS.map((c) => c.first)).toEqual(["01", "07"]);
    expect(ids.map(chapterIndex)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1]);
    expect(chapterStartingAt("07-the-splitter")?.title).toBe("ARGUS Strikes Back");
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
