// Best score per mission in localStorage. Storage can be missing or throw (private mode, blocked
// site data): every access is wrapped and a failure just means "no best yet".

const key = (levelId: string) => `lawbreakers:best:${levelId}`;

export function loadBest(levelId: string): number | null {
  try {
    const raw = window.localStorage.getItem(key(levelId));
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Store `score` if it beats the stored best. Returns the best after this score. */
export function saveBest(levelId: string, score: number): { best: number; newBest: boolean } {
  const prev = loadBest(levelId);
  if (prev !== null && prev >= score) return { best: prev, newBest: false };
  try {
    window.localStorage.setItem(key(levelId), String(score));
  } catch {
    // Not persisted; still report it as this session's best.
  }
  return { best: score, newBest: true };
}

export function clearBest(levelId: string): void {
  try {
    window.localStorage.removeItem(key(levelId));
  } catch {
    // Nothing stored that we can reach.
  }
}
