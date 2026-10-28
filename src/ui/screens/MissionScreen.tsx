import { useEffect } from "react";
import type { Level } from "../../engine/level.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";
import { useRack } from "../../game/rackStore.ts";
import { warmUp } from "../../worker/client.ts";
import { ArgusPanel } from "../argus/ArgusPanel.tsx";
import { cancelEngage } from "../argus/engage.ts";
import { EngageConsole } from "../argus/EngageConsole.tsx";
import { Slot } from "../layout/Slot.tsx";
import { MachineView } from "../machine/MachineView.tsx";
import { RackEditor } from "../rack/RackEditor.tsx";
import { MissionFailedOverlay } from "./MissionFailedOverlay.tsx";
import { ResultsOverlay } from "./ResultsOverlay.tsx";
import "./mission.css";
import "./overlays.css";
import "../argus/verdict.css";

interface Props {
  level: Level;
  /** The mission after this one (for "Next mission"), if any. */
  next?: Level | undefined;
}

export function MissionScreen({ level, next }: Props) {
  const loaded = useMission((m) => m.level?.id === level.id);
  const load = useMission((m) => m.load);
  const rackReady = useRack((r) => r.level?.id === level.id);
  const resetRack = useRack((r) => r.reset);
  const resetEngage = useEngage((s) => s.reset);
  const phase = useEngage((s) => s.phase);

  useEffect(() => {
    load(level);
    resetRack(level);
    resetEngage(level);
    return cancelEngage;
  }, [level, load, resetRack, resetEngage]);

  // Z3 takes a moment to boot: start it while the player reads the briefing.
  useEffect(() => {
    warmUp().catch(() => undefined); // a failure resurfaces (and is reported) on ENGAGE
  }, []);

  const number = level.id.slice(0, 2);

  return (
    <div className="mission">
      <header className="mission__head">
        <p className="mission__protocol">
          <span>Lawbreakers protocol</span>
          <span className="mission__link">
            <span className="lamp" aria-hidden /> Air-gapped
          </span>
        </p>
        <h1 className="mission__title">
          <span className="mission__number fx-glow">{number}</span>
          <span className="mission__name">{level.title}</span>
        </h1>
      </header>

      <main className="mission__grid">
        <section className="human fx-crt" aria-label="Lawsmith console">
          {loaded && <MachineView level={level} />}

          <Slot name="rack">{rackReady && <RackEditor level={level} />}</Slot>

          <Slot name="engage" className="engage-slot">
            <EngageConsole level={level} />
          </Slot>
        </section>

        <ArgusPanel />
      </main>

      {phase === "results" && <ResultsOverlay level={level} next={next} />}
      {phase === "failed" && <MissionFailedOverlay level={level} />}
    </div>
  );
}
