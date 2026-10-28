import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../motion.ts";

/** Counts from 0 to `target` over `ms` (eased), or jumps there under reduced motion. */
export function useCountUp(target: number, ms = 1400): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let handle = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) handle = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(handle);
  }, [target, ms]);
  return value;
}
