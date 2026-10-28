import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 520px)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True on phone-sized screens, where the rack uses its compact metrics. */
export function useCompact(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches);
}
