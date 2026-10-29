// Campaign progress: which missions are secured (won at least once, in either mode), the unlock
// rule, and the training-mode switch. Persisted in localStorage; storage can be missing or throw
// (private mode, blocked site data), so every access is wrapped and a failure just means "fresh
// profile" for reads and "this session only" for writes.

import { create } from "zustand";
import { clearBest, moveBest } from "./bestScores.ts";

export const PROGRESS_KEY = "lawbreakers:progress";
export const TRAINING_KEY = "lawbreakers:training";

export type MissionStatus = "locked" | "available" | "secured";

export interface Chapter {
  /** Number of the chapter's first mission ("01"); it runs until the next chapter starts. */
  first: string;
  /** Small tag before the title in the mission-select heading ("Bonus chapter"). */
  tag: string;
  title: string;
  /** Results line when the chapter's last mission is won and all of the chapter is secured. */
  doneLine: string;
}

/**
 * The main campaign ends at FINAL BREACH (06); ARGUS STRIKES BACK (07–09) and THE DEEP GRID
 * (10–15) are bonus chapters. Unlocking stays one linear chain: 07 opens when 06 is secured, 10
 * when 09 is.
 */
export const CHAPTERS: readonly Chapter[] = [
  {
    first: "01",
    tag: "Main campaign",
    title: "The Lawbreakers Protocol",
    doneLine:
      "Main campaign complete. The Core holds. ARGUS is not finished: bonus chapter ARGUS Strikes Back is open.",
  },
  {
    first: "07",
    tag: "Bonus chapter",
    title: "ARGUS Strikes Back",
    doneLine:
      "Bonus chapter complete. The surface holds. ARGUS has gone underground: The Deep Grid is open.",
  },
  {
    first: "10",
    tag: "Deep chapter",
    title: "The Deep Grid",
    doneLine:
      "Campaign complete. Every facility holds, down to the bottom of the silo. ARGUS has nowhere left to hide.",
  },
];

/** Index in `CHAPTERS` of the chapter a mission (by id or number) belongs to. */
export function chapterIndex(idOrNumber: string): number {
  const n = idOrNumber.slice(0, 2);
  return CHAPTERS.reduce((found, ch, i) => (n >= ch.first ? i : found), 0);
}

/** The chapter that opens with this mission, if any. */
export function chapterStartingAt(idOrNumber: string): Chapter | undefined {
  return CHAPTERS.find((ch) => ch.first === idOrNumber.slice(0, 2));
}

/**
 * Mission 01 is always available; mission N+1 unlocks when mission N is secured. A mission that is
 * secured stays secured (e.g. won off-campaign through a deep link) whatever comes before it.
 */
export function missionStatus(
  ids: readonly string[],
  secured: ReadonlySet<string>,
  index: number,
): MissionStatus {
  const id = ids[index];
  if (id === undefined) return "locked";
  if (secured.has(id)) return "secured";
  if (index === 0) return "available";
  const prev = ids[index - 1];
  return prev !== undefined && secured.has(prev) ? "available" : "locked";
}

/** The first mission that is available but not secured, if any (CONTINUE goes there). */
export function nextMission(ids: readonly string[], secured: ReadonlySet<string>): string | null {
  return ids.find((_, i) => missionStatus(ids, secured, i) === "available") ?? null;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Not persisted: the change lives for this session only.
  }
}

/**
 * Missions that kept their puzzle but changed number (the bonus chapter was reordered by
 * difficulty), old id → new id. Secured status and best score both follow the mission.
 */
export const MOVED_MISSIONS: Readonly<Record<string, string>> = {
  "07-the-splitter": "09-the-splitter",
  "08-twin-jacks": "07-twin-jacks",
  "09-the-airlock": "08-the-airlock",
};

/**
 * Every id change after release, old id → new id: replaced missions and `MOVED_MISSIONS`. A player
 * who secured a replaced mission keeps the slot secured (so the next mission stays unlocked); its
 * old best score is left behind, since it was earned on a different puzzle.
 */
export const RENAMED_MISSIONS: Readonly<Record<string, string>> = {
  "05-false-defense": "05-counterweight",
  ...MOVED_MISSIONS,
};

/** Move the best scores of renumbered missions to their new ids (idempotent). */
export function migrateBestScores(): void {
  for (const [from, to] of Object.entries(MOVED_MISSIONS)) moveBest(from, to);
}

/** `ids` with renamed missions mapped to their new id, without duplicates. */
export function migrateSecured(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => RENAMED_MISSIONS[id] ?? id))];
}

export function loadSecured(): string[] {
  const raw = read(PROGRESS_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list =
      typeof parsed === "object" && parsed !== null && "secured" in parsed
        ? (parsed as { secured: unknown }).secured
        : null;
    return Array.isArray(list)
      ? migrateSecured(list.filter((x): x is string => typeof x === "string"))
      : [];
  } catch {
    return [];
  }
}

interface CampaignStore {
  secured: string[];
  training: boolean;
  /** Mark a mission as won (idempotent). */
  secure: (levelId: string) => void;
  setTraining: (on: boolean) => void;
  /** Forget every secured mission and every best score. Training mode is a setting, kept. */
  resetProgress: (levelIds: readonly string[]) => void;
}

export const useCampaign = create<CampaignStore>()((set, get) => ({
  secured: (migrateBestScores(), loadSecured()),
  training: read(TRAINING_KEY) === "1",
  secure: (levelId) => {
    if (get().secured.includes(levelId)) return;
    const secured = [...get().secured, levelId];
    write(PROGRESS_KEY, JSON.stringify({ secured }));
    set({ secured });
  },
  setTraining: (on) => {
    write(TRAINING_KEY, on ? "1" : null);
    set({ training: on });
  },
  resetProgress: (levelIds) => {
    write(PROGRESS_KEY, null);
    for (const id of levelIds) clearBest(id);
    set({ secured: [] });
  },
}));
