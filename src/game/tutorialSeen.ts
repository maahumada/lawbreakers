// Whether the player has finished or skipped the Mission 01 tutorial (coach marks). It shows once,
// on the first visit to Mission 01; the "?" help panel replays it on any mission. Storage can be
// missing or throw: then the tutorial just shows again next time.

export const TUTORIAL_KEY = "lawbreakers:tutorial-seen";

export function tutorialSeen(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    // Not persisted: the tutorial shows again next session.
  }
}
