import { enabled } from "../../engine/simulate.ts";
import type { Level } from "../../engine/level.ts";
import { useMission } from "../../game/missionStore.ts";
import { Briefing } from "./Briefing.tsx";
import { ControlCard } from "./ControlCard.tsx";
import { Gauge } from "./Gauge.tsx";
import { Telemetry } from "./Telemetry.tsx";
import { useAutoRun } from "./useAutoRun.ts";
import "./machine.css";

const MIN_SCALE = 10;

export function MachineView({ level }: { level: Level }) {
  const state = useMission((m) => m.state);
  const log = useMission((m) => m.log);
  const autoRun = useMission((m) => m.autoRun);
  const { fire, reset, setAutoRun } = useMission.getState();
  useAutoRun();

  const armed = new Set(enabled(level, state).map((c) => c.id));
  const scale = Math.max(
    MIN_SCALE,
    ...log.flatMap((e) => level.vars.map((x) => Math.abs(e.state[x.name] ?? 0))),
  );

  return (
    <div className="machine">
      <section className="machine__brief" aria-label="Briefing">
        <Briefing level={level} />
      </section>

      <section className="machine__gauges panel" aria-label="Gauges">
        <h2 className="panel__title">Gauges</h2>
        <div className="gauges">
          {level.vars.map((x) => (
            <Gauge key={x.name} decl={x} value={state[x.name] ?? 0} scale={scale} />
          ))}
        </div>
      </section>

      <section className="machine__controls panel" aria-label="Controls">
        <h2 className="panel__title">Controls</h2>
        <div className="controls">
          {level.controls.map((c) => (
            <ControlCard key={c.id} control={c} armed={armed.has(c.id)} onFire={fire} />
          ))}
        </div>
      </section>

      <section className="machine__telemetry panel" aria-label="Telemetry">
        <div className="panel__bar">
          <h2 className="panel__title">Telemetry</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              data-testid="autorun"
            />
            <span className="toggle__switch" aria-hidden />
            Auto-run
          </label>
          <button type="button" className="btn-reset" onClick={reset} data-testid="reset">
            Reset
          </button>
        </div>
        <Telemetry level={level} log={log} />
      </section>
    </div>
  );
}
