import { useState } from "react";
import type { Level } from "../../engine/level.ts";
import { loadBest } from "../../game/bestScores.ts";
import type { MissionStatus } from "../../game/campaign.ts";
import { chapterStartingAt, missionStatus, useCampaign } from "../../game/campaign.ts";
import { SoundToggle } from "../fx/SoundToggle.tsx";
import { HelpLayer } from "../help/HelpLayer.tsx";
import { HelpButton } from "../help/HowToPlay.tsx";
import { navigate } from "../router.ts";
import { ThreatBoard } from "./ThreatBoard.tsx";
import { TrainingToggle } from "./TrainingToggle.tsx";
import "./campaign.css";
import "./mission.css";

const STATUS_TEXT: Record<MissionStatus, string> = {
  locked: "Locked",
  available: "Ready",
  secured: "Secured",
};

/** The campaign as one bus: each facility is a station, the wire is lit through secured ones. */
export function MissionSelectScreen({ levels }: { levels: readonly Level[] }) {
  const secured = useCampaign((c) => c.secured);
  const ids = levels.map((l) => l.id);
  const securedSet = new Set(secured);
  const statuses = levels.map((_, i) => missionStatus(ids, securedSet, i));

  return (
    <div className="select" data-testid="mission-select">
      <header className="mission__head select__head">
        <div className="mission__protocol">
          <a
            className="mission__back"
            href="?"
            onClick={(e) => {
              e.preventDefault();
              navigate({ screen: "title" });
            }}
          >
            Title
          </a>
          <span className="mission__flags">
            <span>
              {secured.length} / {levels.length} secured
            </span>
            <SoundToggle />
            <HelpButton />
          </span>
        </div>
        <h1 className="select__title">Facilities under the Lawbreakers protocol</h1>
      </header>

      <div className="select__layout">
        <main className="select__main">
          <ol className="select__list">
            {levels.map((level, i) => {
              const status = statuses[i] ?? "locked";
              const number = level.id.slice(0, 2);
              const prev = ids[i - 1];
              // Later chapters get a heading inside their first station, so the bus stays one list.
              const chapter = i > 0 ? chapterStartingAt(number) : undefined;
              return (
                <li
                  key={level.id}
                  className="station"
                  data-status={status}
                  data-feed={i === 0 || (prev !== undefined && securedSet.has(prev)) || undefined}
                  data-chapter={chapter ? "" : undefined}
                  data-testid={`station-${number}`}
                >
                  {chapter && (
                    <h2 className="station__chapter" data-testid={`chapter-${number}`}>
                      <span className="station__chapter-tag">{chapter.tag}</span> {chapter.title}
                    </h2>
                  )}
                  <MissionEntry level={level} number={number} status={status} prev={prev} />
                </li>
              );
            })}
          </ol>

          <footer className="select__foot">
            <TrainingToggle />
            <ResetProgress ids={ids} />
          </footer>
        </main>
        <ThreatBoard levels={levels} statuses={statuses} />
      </div>
      <HelpLayer />
    </div>
  );
}

interface EntryProps {
  level: Level;
  number: string;
  status: MissionStatus;
  prev: string | undefined;
}

function MissionEntry({ level, number, status, prev }: EntryProps) {
  const best = status === "secured" ? loadBest(level.id) : null;
  const body = (
    <>
      <span className="station__number">{number}</span>
      <span className="station__text">
        <span className="station__name">{level.title}</span>
        <span className="station__concept">{level.concept}</span>
      </span>
      <span className="station__status">
        <span className="station__lamp" aria-hidden />
        <span data-testid={`status-${number}`}>{STATUS_TEXT[status]}</span>
        {best !== null && <span className="station__best">Best {best}</span>}
        {status === "locked" && prev && (
          <span className="station__need">Secure {prev.slice(0, 2)} first</span>
        )}
      </span>
    </>
  );

  if (status === "locked") {
    return (
      <div className="station__plate" aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <a
      className="station__plate"
      href={`?mission=${number}`}
      onClick={(e) => {
        e.preventDefault();
        navigate({ screen: "mission", number });
      }}
      data-testid={`open-${number}`}
    >
      {body}
    </a>
  );
}

function ResetProgress({ ids }: { ids: readonly string[] }) {
  const [confirming, setConfirming] = useState(false);
  const resetProgress = useCampaign((c) => c.resetProgress);
  if (!confirming) {
    return (
      <button
        type="button"
        className="select__reset"
        onClick={() => setConfirming(true)}
        data-testid="reset-progress"
      >
        Reset progress
      </button>
    );
  }
  return (
    <div className="select__confirm" role="group" aria-label="Reset progress">
      <span>Erase every secured mission and best score?</span>
      <button
        type="button"
        className="select__reset select__reset--danger"
        onClick={() => {
          resetProgress(ids);
          setConfirming(false);
        }}
        data-testid="reset-confirm"
        autoFocus
      >
        Erase progress
      </button>
      <button type="button" className="select__reset" onClick={() => setConfirming(false)}>
        Keep it
      </button>
    </div>
  );
}
