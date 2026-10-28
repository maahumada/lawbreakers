// Whether the player has seen the intro (it plays on the first START only; the title can replay
// it). Storage can be missing or throw: then the intro just plays again next time.

export const INTRO_KEY = "lawbreakers:intro-seen";

export function introSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Not persisted: the intro plays again next session.
  }
}
