// Campaign progress: which missions are secured (won at least once, in either mode), the unlock
// rule, and the training-mode switch. Persisted in localStorage; storage can be missing or throw
// (private mode, blocked site data), so every access is wrapped and a failure just means "fresh
// profile" for reads and "this session only" for writes.

import { create } from "zustand";
import { clearBest } from "./bestScores.ts";

export const PROGRESS_KEY = "lawbreakers:progress";
export const TRAINING_KEY = "lawbreakers:training";

export type MissionStatus = "locked" | "available" | "secured";

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

export function loadSecured(): string[] {
  const raw = read(PROGRESS_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list =
      typeof parsed === "object" && parsed !== null && "secured" in parsed
        ? (parsed as { secured: unknown }).secured
        : null;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
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
  secured: loadSecured(),
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
