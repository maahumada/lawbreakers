import { useEffect, useMemo, useRef, useState } from "react";
import { toDafny } from "../../engine/dafny.ts";
import type { BoolExpr } from "../../engine/expr.ts";
import type { Level } from "../../engine/level.ts";
import { tokenizeLine } from "./highlight.ts";
import "./proof.css";

interface Props {
  level: Level;
  law: BoolExpr;
  onClose: () => void;
}

/** Clipboard API, falling back to a hidden textarea + `execCommand` (insecure contexts, old Safari). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** DESIGN §7: the facility and the player's Law as a Dafny program, with a copy button. */
export function ShowTheProof({ level, law, onClose }: Props) {
  const code = useMemo(() => toDafny(level, law), [level, law]);
  const lines = useMemo(() => code.trimEnd().split("\n").map(tokenizeLine), [code]);
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    // Capture phase so Escape closes this panel without also closing the results underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      opener?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (copied === "idle") return;
    const t = window.setTimeout(() => setCopied("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="overlay overlay--proof" data-testid="proof">
      <section
        className="proof panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-title"
        aria-describedby="proof-caption"
      >
        <div className="proof__head">
          <p className="proof__kicker">Show the proof · Dafny</p>
          <h2 className="proof__title fx-glow" id="proof-title">
            You just wrote this.
          </h2>
          <p className="proof__caption" id="proof-caption">
            Your Law is the loop invariant. ARGUS was the verifier.
          </p>
        </div>

        <pre
          className="proof__code"
          tabIndex={0}
          aria-label="Dafny program"
          data-testid="proof-code"
        >
          <code>
            {lines.map((tokens, i) => (
              <span
                key={i}
                className="proof__line"
                data-law={tokens.some((t) => t.text.includes("YOUR LAW")) || undefined}
              >
                {tokens.map((t, j) => (
                  <span key={j} className={`tok tok--${t.kind}`}>
                    {t.text}
                  </span>
                ))}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>

        <div className="proof__actions">
          <button
            type="button"
            className="results__btn results__btn--primary"
            onClick={() => void copyText(code).then((ok) => setCopied(ok ? "ok" : "failed"))}
            data-testid="proof-copy"
          >
            {copied === "ok" ? "Copied" : copied === "failed" ? "Copy failed" : "Copy code"}
          </button>
          <button
            ref={closeRef}
            type="button"
            className="results__btn"
            onClick={onClose}
            data-testid="proof-close"
          >
            Close
          </button>
          <p className="proof__hint">
            Check it yourself: <code>dafny verify</code>
          </p>
        </div>
        <p className="visually-hidden" role="status">
          {copied === "ok" ? "Code copied to clipboard" : ""}
        </p>
      </section>
    </div>
  );
}
