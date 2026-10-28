import { useEffect } from "react";
import type { Level } from "../../engine/level.ts";
import { useMission } from "../../game/missionStore.ts";
import { useRack } from "../../game/rackStore.ts";
import { ArgusPanel } from "../argus/ArgusPanel.tsx";
import { Slot } from "../layout/Slot.tsx";
import { MachineView } from "../machine/MachineView.tsx";
import { RackEditor } from "../rack/RackEditor.tsx";
import "./mission.css";

export function MissionScreen({ level }: { level: Level }) {
  const loaded = useMission((m) => m.level?.id === level.id);
  const load = useMission((m) => m.load);
  const rackReady = useRack((r) => r.level?.id === level.id);
  const resetRack = useRack((r) => r.reset);
  // ENGAGE is wired in M2-T4; until then it only lights up when the Law is complete.
  const lawComplete = useRack((r) => r.law !== null);
  useEffect(() => {
    load(level);
    resetRack(level);
  }, [level, load, resetRack]);

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
            <button
              type="button"
              className="engage"
              disabled
              data-ready={lawComplete || undefined}
              data-testid="engage"
            >
              Engage interlock
            </button>
          </Slot>
        </section>

        <ArgusPanel level={level} />
      </main>
    </div>
  );
}
