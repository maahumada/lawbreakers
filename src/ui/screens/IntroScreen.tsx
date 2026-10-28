import { useCallback, useEffect, useRef, useState } from "react";
import { charge, glitch, klaxon, clack, tick } from "../../audio/sfx.ts";
import { markIntroSeen } from "../../game/introSeen.ts";
import { warmUp } from "../../worker/client.ts";
import { SoundToggle } from "../fx/SoundToggle.tsx";
import { prefersReducedMotion } from "../motion.ts";
import type { IntroCue, IntroLine } from "./introScript.ts";
import { INTRO_CHAR_MS, INTRO_SCRIPT } from "./introScript.ts";
import "./intro.css";

const CUES: Record<IntroCue, () => void> = {
  klaxon: () => klaxon(2),
  glitch,
  relay: clack,
  charge,
};

function Line({ line, shown, current }: { line: IntroLine; shown: number; current: boolean }) {
  const typed = line.text.slice(0, shown);
  const complete = shown >= line.text.length;
  // "LABEL: VALUE" status lines show the value in alarm red.
  const colon = line.tone === "status" ? typed.indexOf(": ") : -1;
  const body =
    colon >= 0 ? (
      <>
        {typed.slice(0, colon + 1)}
        <span className="intro__value">{typed.slice(colon + 1)}</span>
      </>
    ) : (
      typed
    );

  return (
    <li className={`intro__line intro__line--${line.tone}`} data-act={line.act}>
      {line.tone === "argus" && <span className="intro__prompt">&gt; ARGUS:</span>}
      <span className="visually-hidden">{line.text}</span>
      <span
        className={`intro__text${complete && line.tone === "argus" ? " fx-glitch" : ""}${
          current ? " fx-cursor" : ""
        }`}
        data-text={line.text}
        aria-hidden
      >
        {body}
      </span>
    </li>
  );
}

/**
 * The opening cinematic: typed broadcast lines, ARGUS breaking in, then the switch to the analog
 * world. Esc, Enter, a click or the skip button leave it at any time. Z3 boots meanwhile.
 */
export function IntroScreen({ onDone }: { onDone: () => void }) {
  const [calm] = useState(prefersReducedMotion);
  const [beat, setBeat] = useState(0);
  const [chars, setChars] = useState(calm ? Infinity : 0);
  const left = useRef(false);
  const line = INTRO_SCRIPT[beat];
  const done = line === undefined;
  const act = (line ?? INTRO_SCRIPT.at(-1))?.act ?? "human";

  const finish = useCallback(() => {
    if (left.current) return;
    left.current = true;
    markIntroSeen();
    onDone();
  }, [onDone]);

  // The player reads for ~15 s: boot the verifier now so the first ENGAGE is fast.
  useEffect(() => {
    warmUp().catch(() => undefined); // a failure resurfaces (and is reported) on ENGAGE
  }, []);

  useEffect(() => {
    if (!line) return;
    if (chars < line.text.length) {
      const h = window.setTimeout(() => {
        setChars((c) => c + 1);
        if (line.text[chars] !== " ") tick();
      }, INTRO_CHAR_MS);
      return () => window.clearTimeout(h);
    }
    const h = window.setTimeout(() => {
      setBeat((b) => b + 1);
      setChars(calm ? Infinity : 0);
    }, line.pause);
    return () => window.clearTimeout(h);
  }, [line, chars, calm]);

  useEffect(() => {
    const cue = INTRO_SCRIPT[beat]?.cue;
    if (cue) CUES[cue]();
  }, [beat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== "Escape" && e.key !== "Enter")) return;
      e.preventDefault();
      finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const alarm = act === "argus" && beat >= 1;

  return (
    <div
      className={`intro ${act === "argus" ? "fx-hexgrid" : "fx-crt"}`}
      data-act={act}
      data-alarm={alarm || undefined}
      onClick={finish}
      data-testid="intro"
      data-done={done || undefined}
      data-sfx="off"
    >
      {/* Remounts on the act change: a power cut flickers between the two worlds. */}
      <div key={act} className="intro__surge" aria-hidden />

      <header className="intro__bar">
        <span className="intro__channel">
          <span className="intro__dot" aria-hidden />
          {act === "argus" ? "Network broadcast: hijacked" : "Analog emergency channel"}
        </span>
        <span className="intro__controls">
          <SoundToggle />
          <button
            type="button"
            className="intro__skip"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            data-testid="intro-skip"
          >
            Skip intro <kbd>Esc</kbd>
          </button>
        </span>
      </header>

      <ol className="intro__lines" aria-live="polite" aria-label="Intro">
        {INTRO_SCRIPT.slice(0, beat + 1).map((l, i) => (
          <Line key={i} line={l} shown={i < beat ? Infinity : chars} current={i === beat} />
        ))}
      </ol>

      <footer className="intro__foot">
        {done ? (
          <button
            type="button"
            className="title__start intro__go"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            data-testid="intro-continue"
            autoFocus
          >
            Open mission select
          </button>
        ) : (
          <p className="intro__hint">Press Enter or Esc, or click anywhere, to skip.</p>
        )}
      </footer>
    </div>
  );
}
