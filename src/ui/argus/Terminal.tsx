import { useEffect, useRef, useState } from "react";
import type { TermLine } from "../../game/engageStore.ts";
import { useEngage } from "../../game/engageStore.ts";
import { prefersReducedMotion } from "../motion.ts";
import { TYPE_MS_PER_CHAR } from "./engage.ts";

/** Types its text out once, on mount. Screen readers get the full line at once. */
function TypedLine({ line, animate }: { line: TermLine; animate: boolean }) {
  const [shown, setShown] = useState(animate && !prefersReducedMotion() ? 0 : line.text.length);
  useEffect(() => {
    if (shown >= line.text.length) return;
    const handle = window.setTimeout(() => setShown((n) => n + 1), TYPE_MS_PER_CHAR);
    return () => window.clearTimeout(handle);
  }, [shown, line.text.length]);

  const prompt = line.tone === "argus" ? "> ARGUS:" : line.tone === "error" ? "> FAULT:" : ">";
  return (
    <li className={`terminal__line terminal__line--${line.tone}`}>
      <span className="terminal__prompt">{prompt}</span>{" "}
      <span className="visually-hidden">{line.text}</span>
      <span aria-hidden>{line.text.slice(0, shown)}</span>
    </li>
  );
}

export function Terminal() {
  const lines = useEngage((s) => s.lines);
  const busy = useEngage((s) => s.phase === "attacking" || s.phase === "replaying");
  const listRef = useRef<HTMLOListElement>(null);
  // Lines present at mount (the intro) appear at once; later ones type.
  const [firstId] = useState(() => lines.at(-1)?.id ?? 0);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="terminal fx-raster" data-busy={busy || undefined}>
      <ol className="terminal__lines" ref={listRef} aria-live="polite" data-testid="argus-terminal">
        {lines.map((line) => (
          <TypedLine key={line.id} line={line} animate={line.id > firstId} />
        ))}
        <li className="fx-cursor" aria-hidden />
      </ol>
    </div>
  );
}
