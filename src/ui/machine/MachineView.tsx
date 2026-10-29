import { enabled } from "../../engine/simulate.ts";
import type { Level } from "../../engine/level.ts";
import { useMission } from "../../game/missionStore.ts";
import { Briefing } from "./Briefing.tsx";
import { ControlCard } from "./ControlCard.tsx";
import { gaugeScale } from "./format.ts";
import { ReplayStrip } from "./ReplayStrip.tsx";
import { GaugePanel } from "./skins/GaugePanel.tsx";
import { Telemetry } from "./Telemetry.tsx";
import { useAutoRun } from "./useAutoRun.ts";
import "./machine.css";
import "./replay.css";
import "./skins/skins.css";

export function MachineView({ level }: { level: Level }) {
  const state = useMission((m) => m.state);
  const log = useMission((m) => m.log);
  const autoRun = useMission((m) => m.autoRun);
  const locked = useMission((m) => m.locked);
  const display = useMission((m) => m.display);
  const { fire, reset, setAutoRun } = useMission.getState();
  useAutoRun();

  // Big machines (more than four controls) give the controls the full width in a tighter grid.
  const dense = level.controls.length > 4;
  const armed = new Set(enabled(level, state).map((c) => c.id));
  const scale = gaugeScale(
    Math.max(
      0,
      ...[...log.map((e) => e.state), state].flatMap((s) =>
        level.vars.map((x) => Math.abs(s[x.name] ?? 0)),
      ),
    ),
  );

  const skinned = level.display.panels.some((p) => p.skin !== "nixie");
  const history = log.map((e) => e.state);
  // Fires so far (free play cycles + replayed fires): restarts one-shot skin feedback.
  const tick = (log.at(-1)?.cycle ?? 0) + (display?.pulse ?? 0);

  return (
    <div
      className="machine"
      data-mode={display?.mode}
      data-locked={locked || undefined}
      data-dense={dense || undefined}
    >
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
        <div className="gauges" data-count={level.vars.length} data-skinned={skinned || undefined}>
          {level.display.panels.map((p) => (
            <GaugePanel
              key={p.vars.join(",")}
              panel={p}
              decls={level.vars}
              state={state}
              scale={scale}
              mode={display?.mode ?? null}
              from={display?.from ?? null}
              tick={tick}
              history={history}
            />
          ))}
        </div>
      </section>

      <section className="machine__controls panel" aria-label="Controls">
        <h2 className="panel__title">Controls</h2>
        <div className="controls" data-dense={dense || undefined}>
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
