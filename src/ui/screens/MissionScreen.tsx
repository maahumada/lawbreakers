import { useEffect } from "react";
import type { Level } from "../../engine/level.ts";
import { useMission } from "../../game/missionStore.ts";
import { ArgusPanel } from "../argus/ArgusPanel.tsx";
import { Slot } from "../layout/Slot.tsx";
import { MachineView } from "../machine/MachineView.tsx";
import "./mission.css";

export function MissionScreen({ level }: { level: Level }) {
  const loaded = useMission((m) => m.level?.id === level.id);
  const load = useMission((m) => m.load);
  useEffect(() => load(level), [level, load]);

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

          <Slot name="rack" className="rack-slot">
            <span className="slot__title">Law engine rack</span>
            <span className="slot__note">No modules installed</span>
          </Slot>

          <Slot name="engage" className="engage-slot">
            <button type="button" className="engage" disabled>
              Engage interlock
            </button>
          </Slot>
        </section>

        <ArgusPanel level={level} />
      </main>
    </div>
  );
}
