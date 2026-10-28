import { enabled } from "../../engine/simulate.ts";
import type { Level } from "../../engine/level.ts";
import { useMission } from "../../game/missionStore.ts";
import { Briefing } from "./Briefing.tsx";
import { ControlCard } from "./ControlCard.tsx";
import { Gauge } from "./Gauge.tsx";
import { ReplayStrip } from "./ReplayStrip.tsx";
import { Telemetry } from "./Telemetry.tsx";
import { useAutoRun } from "./useAutoRun.ts";
import "./machine.css";
import "./replay.css";

const MIN_SCALE = 10;

export function MachineView({ level }: { level: Level }) {
  const state = useMission((m) => m.state);
  const log = useMission((m) => m.log);
  const autoRun = useMission((m) => m.autoRun);
  const locked = useMission((m) => m.locked);
  const display = useMission((m) => m.display);
  const { fire, reset, setAutoRun } = useMission.getState();
  useAutoRun();

  const armed = new Set(enabled(level, state).map((c) => c.id));
  const scale = Math.max(
    MIN_SCALE,
    ...[...log.map((e) => e.state), state].flatMap((s) =>
      level.vars.map((x) => Math.abs(s[x.name] ?? 0)),
    ),
  );

  return (
    <div className="machine" data-mode={display?.mode} data-locked={locked || undefined}>
      <section className="machine__brief" aria-label="Briefing">
        <Briefing level={level} lit={display?.mode === "meltdown"} />
      </section>

      <section
        className="machine__gauges panel"
        aria-label="Gauges"
        data-replay-target
        data-testid="machine-gauges"
      >
        {display?.mode === "lab" && (
          <span className="holo-mark" aria-hidden>
            Simulation
          </span>
        )}
        <h2 className="panel__title">Gauges</h2>
        {display && <ReplayStrip level={level} display={display} />}
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
            <ControlCard
              key={display?.firing === c.id ? `${c.id}-${display.pulse}` : c.id}
              control={c}
              armed={armed.has(c.id)}
              locked={locked}
              firing={display?.firing === c.id}
              onFire={fire}
            />
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
              disabled={locked}
              onChange={(e) => setAutoRun(e.target.checked)}
              data-testid="autorun"
            />
            <span className="toggle__switch" aria-hidden />
            Auto-run
          </label>
          <button
            type="button"
            className="btn-reset"
            onClick={reset}
            disabled={locked}
            data-testid="reset"
          >
            Reset
          </button>
        </div>
        <Telemetry level={level} log={log} />
      </section>
    </div>
  );
}
