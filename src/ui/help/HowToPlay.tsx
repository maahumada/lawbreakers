import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { useHelp } from "./helpStore.ts";
import "./help.css";

const CHECKS = [
  {
    check: "Holds at power-on",
    fail: "Initialization failure",
    what: "false before anything moves",
  },
  { check: "Survives every control", fail: "Law breached", what: "one legal move breaks it" },
  {
    check: "Rules out meltdown",
    fail: "Insufficient protection",
    what: "it allows a meltdown state, even one never reached",
  },
] as const;

/** Compact rules panel: the three checks with their verdicts, and live vs lab breaches. */
export function HowToPlay({ canReplay }: { canReplay: boolean }) {
  const { closePanel, startTutorial } = useHelp.getState();
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [closePanel]);

  // Keep Tab inside the dialog while it is open.
  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const items = ref.current.querySelectorAll<HTMLElement>("button");
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="howto-backdrop"
      onClick={(e) => e.target === e.currentTarget && closePanel()}
      data-testid="howto"
    >
      <section
        ref={ref}
        className="howto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        onKeyDown={trap}
      >
        <div className="howto__head">
          <h2 className="howto__title" id="howto-title">
            How to play
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="howto__close"
            onClick={closePanel}
            aria-label="Close how to play"
            data-testid="howto-close"
          >
            ×
          </button>
        </div>

        <p className="howto__lead">
          Wire a <b>Law</b>: a rule about the gauges that the machine always obeys. ARGUS tests it
          three ways.
        </p>

        <ol className="howto__checks">
          {CHECKS.map((c) => (
            <li key={c.check} className="howto__check">
              <span className="howto__check-name">{c.check}</span>
              <span className="howto__check-fail">
                else <b>{c.fail}</b>: {c.what}.
              </span>
            </li>
          ))}
        </ol>
        <p className="howto__win">
          Pass all three: <b>The Law holds</b>.
        </p>
        <p className="howto__fence" data-testid="howto-fence">
          Your Law is the only fence: ARGUS may start from <b>any</b> state it allows, even ones the
          machine never reaches, then use a real control. Hold at power-on and for one step from
          anywhere inside, and every run stays inside, forever.
        </p>

        <div className="howto__breaches">
          <div className="howto__breach howto__breach--live">
            <h3 className="howto__breach-name">Live breach</h3>
            <p>A real run from power-on breaks your Law. It is simply false. Fix the rule.</p>
          </div>
          <div className="howto__breach howto__breach--lab">
            <h3 className="howto__breach-name">Lab breach</h3>
            <p>
              ARGUS starts inside your fence, somewhere the machine never goes, and one real control
              steps outside. "Never happens" is not "ruled out": make the Law say more.
            </p>
          </div>
        </div>

        <p className="howto__keys">
          Pick a module, then a lit socket, or drag it. Keyboard: Tab, Enter to pick and place,
          Delete to unplug, Esc to cancel.
        </p>

        {canReplay && (
          <div className="howto__foot">
            <button
              type="button"
              className="howto__replay"
              onClick={startTutorial}
              data-testid="howto-replay-tutorial"
            >
              Replay tutorial
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** The "?" button in a screen's top bar. */
export function HelpButton() {
  const openPanel = useHelp((s) => s.openPanel);
  return (
    <button
      type="button"
      className="help-btn"
      onClick={openPanel}
      aria-label="How to play"
      aria-haspopup="dialog"
      data-testid="help"
    >
      ?
    </button>
  );
}
