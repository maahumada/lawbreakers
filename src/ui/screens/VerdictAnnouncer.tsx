import type { Level } from "../../engine/level.ts";
import { useEngage } from "../../game/engageStore.ts";
import { verdictCopy } from "../argus/verdictText.ts";

/**
 * Screen-reader announcement of ARGUS's verdict. Always mounted (a live region that appears with
 * its text is often not read), filled once the verdict banner shows.
 */
export function VerdictAnnouncer({ level }: { level: Level }) {
  const verdict = useEngage((s) => (s.phase === "idle" ? null : s.verdict));
  const law = useEngage((s) => s.law);
  const shown = useEngage((s) => s.phase === "verdict");
  const copy = shown && verdict && law ? verdictCopy(level, law, verdict) : null;
  return (
    <p className="visually-hidden" role="status" aria-live="assertive" data-testid="verdict-live">
      {copy ? `ARGUS verdict: ${copy.title}. ${copy.tag}. ${copy.body}` : ""}
    </p>
  );
}
