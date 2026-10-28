import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Level } from "../../engine/level.ts";
import { useEngage } from "../../game/engageStore.ts";
import type { ExplainerKind } from "../../game/explainerSeen.ts";
import { explainerFor, markExplainerSeen } from "../../game/explainerSeen.ts";
import { explainerCopy } from "../argus/verdictText.ts";
import { prefersReducedMotion, revealElement } from "../motion.ts";
import "./help.css";

/** Let the verdict banner land (its reveal is 0.35 s) before COMMAND speaks up. */
const DELAY_MS = 700;

/**
 * COMMAND's one-time card under the verdict banner the first time a player ever gets a lab breach
 * or an insufficient verdict. Inline, so it never covers the machine or the replay; the dismiss
 * button takes focus and gives it back to the banner's REBUILD afterwards.
 */
export function ExplainerCard({ level }: { level: Level }) {
  const phase = useEngage((s) => s.phase);
  const verdict = useEngage((s) => s.verdict);
  const law = useEngage((s) => s.law);
  const [kind, setKind] = useState<ExplainerKind | null>(null);
  const ref = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (phase !== "verdict" || !verdict) return;
    const next = explainerFor(verdict.kind);
    if (!next) return;
    const t = window.setTimeout(
      () => {
        markExplainerSeen(next);
        setKind(next);
      },
      prefersReducedMotion() ? 0 : DELAY_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase, verdict]);

  useEffect(() => {
    if (!kind) return;
    opener.current = document.activeElement as HTMLElement | null;
    buttonRef.current?.focus({ preventScroll: true });
    revealElement(ref.current);
  }, [kind]);

  if (!kind || phase !== "verdict" || !verdict || !law || verdict.kind !== kind) return null;
  const copy = explainerCopy(level, law, verdict);
  if (!copy) return null;

  const dismiss = () => {
    setKind(null);
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    }
  };

  return (
    <section
      ref={ref}
      className="explainer"
      data-kind={kind}
      data-testid="explainer"
      aria-labelledby="explainer-title"
      onKeyDown={onKeyDown}
    >
      <p className="explainer__head">
        <span className="coach__lamp" aria-hidden />
        Command
      </p>
      <h3 className="explainer__title" id="explainer-title">
        {copy.title}
      </h3>
      <ul className="explainer__lines">
        {copy.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <button
        ref={buttonRef}
        type="button"
        className="explainer__dismiss"
        onClick={dismiss}
        data-testid="explainer-dismiss"
      >
        Got it
      </button>
    </section>
  );
}
