import { useEffect, useState } from "react";
import type { Level } from "../../engine/level.ts";
import { missionStatus, useCampaign } from "../../game/campaign.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";
import { useRack } from "../../game/rackStore.ts";
import { installMissionSfx } from "../../audio/bindings.ts";
import { warmUp } from "../../worker/client.ts";
import { ArgusPanel } from "../argus/ArgusPanel.tsx";
import { cancelEngage, TYPE_MS_PER_CHAR } from "../argus/engage.ts";
import { EngageConsole } from "../argus/EngageConsole.tsx";
import { ImpactFx } from "../fx/ImpactFx.tsx";
import { SoundToggle } from "../fx/SoundToggle.tsx";
import { Slot } from "../layout/Slot.tsx";
import { HelpLayer } from "../help/HelpLayer.tsx";
import { useHelp } from "../help/helpStore.ts";
import { HelpButton } from "../help/HowToPlay.tsx";
import { MachineView } from "../machine/MachineView.tsx";
import { prefersReducedMotion } from "../motion.ts";
import { RackEditor } from "../rack/RackEditor.tsx";
import { navigate } from "../router.ts";
import { MissionFailedOverlay } from "./MissionFailedOverlay.tsx";
import { ResultsOverlay } from "./ResultsOverlay.tsx";
import { VerdictAnnouncer } from "./VerdictAnnouncer.tsx";
import "./mission.css";
import "./overlays.css";
import "../argus/verdict.css";

interface Props {
  level: Level;
  /** Position of `level` in the campaign (`levels`). */
  index: number;
  levels: readonly Level[];
}

export function MissionScreen({ level, index, levels }: Props) {
  const next = levels[index + 1];
  // Read once: training is chosen before the mission starts, not toggled mid-mission.
  const [training] = useState(() => useCampaign.getState().training);
  // Opened through a deep link while still locked in the campaign: playable, just flagged.
  const [offCampaign] = useState(
    () =>
      missionStatus(
        levels.map((l) => l.id),
        new Set(useCampaign.getState().secured),
        index,
      ) === "locked",
  );
  const loaded = useMission((m) => m.level?.id === level.id);
  const load = useMission((m) => m.load);
  const rackReady = useRack((r) => r.level?.id === level.id);
  const resetRack = useRack((r) => r.reset);
  const resetEngage = useEngage((s) => s.reset);
  const phase = useEngage((s) => s.phase);

  useEffect(() => {
    load(level, undefined, training);
    resetRack(level);
    resetEngage(level);
    return cancelEngage;
  }, [level, load, resetRack, resetEngage, training]);

  // Z3 takes a moment to boot: start it while the player reads the briefing.
  useEffect(() => {
    warmUp().catch(() => undefined); // a failure resurfaces (and is reported) on ENGAGE
  }, []);

  // Sound follows the stores while this screen is up (the hum must stop when it goes away).
  useEffect(
    () =>
      installMissionSfx({ typeMsPerChar: () => (prefersReducedMotion() ? 0 : TYPE_MS_PER_CHAR) }),
    [],
  );

  // The results / mission failed dialogs take over: the tutorial has done its job by then.
  useEffect(() => {
    if ((phase === "results" || phase === "failed") && useHelp.getState().step !== null) {
      useHelp.getState().endTutorial();
    }
  }, [phase]);

  const number = level.id.slice(0, 2);

  return (
    <div className="mission" data-training={training || undefined}>
      <header className="mission__head">
        <div className="mission__protocol">
          <a
            className="mission__back"
            href="?missions"
            onClick={(e) => {
              e.preventDefault();
              navigate({ screen: "missions" });
            }}
            data-testid="back-to-missions"
          >
            Mission select
          </a>
          <span className="mission__flags">
            {training && (
              <span className="mission__flag mission__flag--training" data-testid="training-badge">
                Training: no breach, no score
              </span>
            )}
            {offCampaign && (
              <span className="mission__flag" data-testid="off-campaign">
                Off-campaign
              </span>
            )}
            <span className="mission__link">
              <span className="lamp" aria-hidden /> Air-gapped
            </span>
            <SoundToggle />
            <HelpButton />
          </span>
        </div>
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

      <VerdictAnnouncer level={level} />
      <ImpactFx shakeSelector=".mission__grid" />
      {phase === "results" && <ResultsOverlay level={level} next={next} />}
      {phase === "failed" && <MissionFailedOverlay level={level} />}
      <HelpLayer tutorial autoStart={index === 0} />
    </div>
  );
}
