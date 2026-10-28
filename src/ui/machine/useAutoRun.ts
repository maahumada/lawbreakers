import { useEffect } from "react";
import { useMission } from "../../game/missionStore.ts";

/** Milliseconds between auto-run cycles: slow enough to follow the gauges by eye. */
export const AUTO_RUN_INTERVAL_MS = 750;

export function useAutoRun(): void {
  const autoRun = useMission((m) => m.autoRun);
  const autoStep = useMission((m) => m.autoStep);
  useEffect(() => {
    if (!autoRun) return;
    const handle = window.setInterval(autoStep, AUTO_RUN_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [autoRun, autoStep]);
}
