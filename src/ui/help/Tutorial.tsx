import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRack } from "../../game/rackStore.ts";
import { prefersReducedMotion } from "../motion.ts";
import { useHelp } from "./helpStore.ts";
import { TUTORIAL_STEPS, tutorialStep } from "./tutorialSteps.ts";
import "./help.css";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Below this width the card is a bottom sheet instead of a callout beside its target. */
const SHEET_MAX = 640;
const GAP = 14;
const EDGE = 12;

function findTarget(selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.getBoundingClientRect().height > 0) return el;
  }
  return null;
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/** Bring the target into view, leaving room for the card (a bottom sheet on phones). */
function scrollToTarget(el: Element) {
  const r = el.getBoundingClientRect();
  const sheet = window.innerWidth < SHEET_MAX;
  const room = sheet ? window.innerHeight * 0.55 : window.innerHeight - 2 * EDGE;
  if (r.top >= EDGE && r.bottom <= room) return;
  const offset = sheet ? EDGE : Math.max(EDGE, (window.innerHeight - r.height) / 2 - 120);
  window.scrollTo({
    top: Math.max(0, r.top + window.scrollY - offset),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/** Callout placement beside the spotlight: below, above, right, left, else bottom-right. */
function placeCard(spot: Box, w: number, h: number): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vw - w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vh - h - EDGE);
  const bottom = spot.top + spot.height;
  const right = spot.left + spot.width;
  if (vh - bottom >= h + GAP + EDGE) return { top: bottom + GAP, left: clampX(spot.left) };
  if (spot.top >= h + GAP + EDGE) return { top: spot.top - GAP - h, left: clampX(spot.left) };
  if (vw - right >= w + GAP + EDGE) return { top: clampY(spot.top), left: right + GAP };
  if (spot.left >= w + GAP + EDGE) return { top: clampY(spot.top), left: spot.left - GAP - w };
  return { top: vh - h - EDGE, left: vw - w - EDGE };
}

/** First-time coach marks: a spotlight on one part of the mission screen and COMMAND's note. */
export function Tutorial() {
  const step = useHelp((s) => s.step) ?? 0;
  const { goTo, endTutorial } = useHelp.getState();
  const current = tutorialStep(step);
  const last = step === TUTORIAL_STEPS.length - 1;
  const [spot, setSpot] = useState<Box | null>(null);
  const [cardPos, setCardPos] = useState<CSSProperties>({});
  const cardRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const el = findTarget(current.targets);
    if (el) scrollToTarget(el);
  }, [current]);

  // Follow the target every frame: it moves with scrolling, resizing and the game's own layout.
  useEffect(() => {
    let frame = 0;
    let prev: Box | null = null;
    const tick = () => {
      const el = findTarget(current.targets);
      const r = el?.getBoundingClientRect();
      // A little air around the target, but never past the viewport's sides.
      const left = r ? Math.max(2, r.left - 6) : 0;
      const right = r ? Math.min(document.documentElement.clientWidth - 2, r.right + 6) : 0;
      const box = r ? { top: r.top - 6, left, width: right - left, height: r.height + 12 } : null;
      if (!sameBox(box, prev)) {
        prev = box;
        setSpot(box);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [current]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || window.innerWidth < SHEET_MAX || !spot) {
      setCardPos({});
      return;
    }
    setCardPos(placeCard(spot, card.offsetWidth, card.offsetHeight));
  }, [spot, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Esc first cancels a picked module (the rack listens too); only a bare Esc skips.
      if (e.key !== "Escape" || useRack.getState().selected) return;
      endTutorial();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [endTutorial]);

  return (
    <div className="coach" data-testid="tutorial" data-step={current.id}>
      {spot && (
        <div
          className="coach__spot"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          aria-hidden
        />
      )}
      <section
        ref={cardRef}
        className="coach__card"
        style={cardPos}
        data-placed={cardPos.top !== undefined || undefined}
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-title"
        aria-describedby="coach-body"
      >
        <div className="coach__head">
          <span className="coach__lamp" aria-hidden />
          <span className="coach__from">Command</span>
          <span
            className="coach__count"
            aria-label={`Step ${step + 1} of ${TUTORIAL_STEPS.length}`}
          >
            {step + 1}/{TUTORIAL_STEPS.length}
          </span>
        </div>
        <div aria-live="polite">
          <h2 className="coach__title" id="coach-title">
            {current.title}
          </h2>
          <p className="coach__body" id="coach-body">
            {current.body}
          </p>
        </div>
        <div className="coach__actions">
          <button
            type="button"
            className="coach__skip"
            onClick={endTutorial}
            data-testid="tutorial-skip"
          >
            Skip tutorial
          </button>
          <button
            type="button"
            className="coach__btn"
            disabled={step === 0}
            onClick={() => goTo(step - 1)}
            data-testid="tutorial-back"
          >
            Back
          </button>
          <button
            ref={nextRef}
            type="button"
            className="coach__btn coach__btn--next"
            onClick={() => (last ? endTutorial() : goTo(step + 1))}
            data-testid="tutorial-next"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}
