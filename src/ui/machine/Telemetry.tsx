import { useEffect, useRef } from "react";
import type { Level } from "../../engine/level.ts";
import type { TelemetryEntry } from "../../game/missionStore.ts";

interface TelemetryProps {
  level: Level;
  log: TelemetryEntry[];
}

export function Telemetry({ level, log }: TelemetryProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const labelOf = (id: string) => level.controls.find((c) => c.id === id)?.label ?? "POWER-ON";

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <ol className="telemetry__log" ref={listRef} data-testid="telemetry" aria-live="polite">
      {log.map((entry) => (
        <li key={entry.cycle} className="telemetry__row">
          <span className="telemetry__cycle">{String(entry.cycle).padStart(3, "0")}</span>
          <span className="telemetry__control">{labelOf(entry.control)}</span>
          <span className="telemetry__state">
            {level.vars.map((x) => (
              <span key={x.name}>
                {x.name}
                <b>{entry.state[x.name]}</b>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
