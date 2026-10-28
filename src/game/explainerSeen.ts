// One-time explainer cards: the first LAB BREACH and the first INSUFFICIENT PROTECTION a player
// ever gets come with a short card on why ARGUS may use states the machine never reaches. Each
// kind is shown once per profile. Storage can be missing or throw: then the card just shows again
// next time.

import type { VerdictKind } from "../engine/types.ts";

export type ExplainerKind = "lab_breach" | "insufficient";

export const EXPLAINER_KINDS: readonly ExplainerKind[] = ["lab_breach", "insufficient"];

export const explainerKey = (kind: ExplainerKind) => `lawbreakers:explainer-seen:${kind}`;

const isExplainerKind = (kind: VerdictKind): kind is ExplainerKind =>
  (EXPLAINER_KINDS as readonly VerdictKind[]).includes(kind);

export function explainerSeen(kind: ExplainerKind): boolean {
  try {
    return window.localStorage.getItem(explainerKey(kind)) === "1";
  } catch {
    return false;
  }
}

export function markExplainerSeen(kind: ExplainerKind): void {
  try {
    window.localStorage.setItem(explainerKey(kind), "1");
  } catch {
    // Not persisted: the card shows again next session.
  }
}

/** The explainer this verdict should open, or `null` (other kinds, or already seen). */
export function explainerFor(kind: VerdictKind): ExplainerKind | null {
  return isExplainerKind(kind) && !explainerSeen(kind) ? kind : null;
}
