import { useEffect, useRef } from "react";
import { useEngage } from "../../game/engageStore.ts";
import { prefersReducedMotion } from "../motion.ts";
import "./fx.css";

const SHAKE: Keyframe[] = [
  { transform: "translate(0, 0)" },
  { transform: "translate(-7px, 3px)" },
  { transform: "translate(6px, -4px)" },
  { transform: "translate(-4px, -2px)" },
  { transform: "translate(3px, 2px)" },
  { transform: "translate(0, 0)" },
];

/**
 * The breach moment on the mission screen: when a failed verdict lands (the replay ends), the
 * console shakes and the screen flashes red. Reduced motion keeps a softer flash, no shake.
 * `shakeSelector` is the element that shakes (the two consoles, not the header).
 */
export function ImpactFx({ shakeSelector }: { shakeSelector: string }) {
  const flash = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      useEngage.subscribe((e, p) => {
        const breach = e.phase === "verdict" && p.phase === "replaying" && e.verdict?.kind;
        if (!breach || breach === "holds") return;
        const calm = prefersReducedMotion();
        // A lab breach is a simulation: the flash is hologram cyan, not alarm red.
        if (flash.current) flash.current.dataset.tone = breach === "lab_breach" ? "lab" : "live";
        flash.current?.animate?.([{ opacity: calm ? 0.25 : 0.55 }, { opacity: 0 }], {
          duration: calm ? 400 : 650,
          easing: "ease-out",
        });
        if (calm) return;
        const target = document.querySelector<HTMLElement>(shakeSelector);
        target?.animate?.(SHAKE, { duration: 420, easing: "ease-out" });
      }),
    [shakeSelector],
  );

  return <div ref={flash} className="impact-flash" aria-hidden />;
}
