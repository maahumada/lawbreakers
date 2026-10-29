import type { Level } from "../../engine/level.ts";
import type { EngagePhase } from "../../game/engageStore.ts";
import { useEngage } from "../../game/engageStore.ts";
import { verdictCopy } from "../argus/verdictText.ts";

/** Phases in which the verdict banner is on screen (see `EngageConsole`). */
const ANNOUNCED: ReadonlySet<EngagePhase> = new Set(["verdict", "results", "failed"]);

/**
 * Screen-reader announcement of ARGUS's verdict. Always mounted (a live region that appears with
 * its text is often not read), filled once the verdict banner shows and kept while the banner
 * stays up (results and MISSION FAILED included): on THE LAW HOLDS the results open 450–950 ms
 * after the banner, and clearing the region then cut the announcement short.
 */
export function VerdictAnnouncer({ level }: { level: Level }) {
  const verdict = useEngage((s) => (s.phase === "idle" ? null : s.verdict));
  const law = useEngage((s) => s.law);
  const shown = useEngage((s) => ANNOUNCED.has(s.phase));
  const copy = shown && verdict && law ? verdictCopy(level, law, verdict) : null;
  return (
    <p className="visually-hidden" role="status" aria-live="assertive" data-testid="verdict-live">
      {copy ? `ARGUS verdict: ${copy.title}. ${copy.tag}. ${copy.body}` : ""}
    </p>
  );
}
