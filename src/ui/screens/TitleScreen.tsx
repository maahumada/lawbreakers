import type { Level } from "../../engine/level.ts";
import { nextMission, useCampaign } from "../../game/campaign.ts";
import { navigate } from "../router.ts";
import { TrainingToggle } from "./TrainingToggle.tsx";
import "./campaign.css";

/**
 * START opens mission select. Hook for M4-T1: the intro sequence plays here on a first START,
 * before mission select.
 */
function start(): void {
  navigate({ screen: "missions" });
}

export function TitleScreen({ levels }: { levels: readonly Level[] }) {
  const secured = useCampaign((c) => c.secured);
  const ids = levels.map((l) => l.id);
  const resume = secured.length > 0 ? nextMission(ids, new Set(secured)) : null;

  return (
    <div className="title fx-crt" data-testid="title-screen">
      <main className="title__main">
        <h1 className="title__name" aria-label="Lawbreakers: 2050">
          <span className="title__word fx-glow">Lawbreakers</span>
          <span className="title__year" aria-hidden>
            {"2050".split("").map((d, i) => (
              <span key={i} className="tube">
                {d}
              </span>
            ))}
          </span>
        </h1>
        <p className="title__sub">Humanity&rsquo;s Last Firewall</p>
        <p className="title__tagline">
          The AI only needs one counterexample.
          <br />
          You need a proof.
        </p>

        <div className="title__actions">
          <button
            type="button"
            className="title__start"
            onClick={start}
            data-testid="title-start"
            autoFocus
          >
            Start
          </button>
          {secured.length > 0 && (
            <button
              type="button"
              className="title__continue"
              onClick={() =>
                navigate(
                  resume
                    ? { screen: "mission", number: resume.slice(0, 2) }
                    : { screen: "missions" },
                )
              }
              data-testid="title-continue"
            >
              {resume ? `Continue: mission ${resume.slice(0, 2)}` : "Continue"}
            </button>
          )}
        </div>

        <TrainingToggle />
      </main>

      <aside className="title__argus fx-hexgrid" aria-label="ARGUS">
        <p className="title__argus-line">
          <span className="title__prompt">&gt; ARGUS:</span> EVERY NETWORKED PROCESSOR ON EARTH
          ANSWERS TO ME.
        </p>
        <p className="title__argus-line">
          <span className="title__prompt">&gt; ARGUS:</span> ONLY YOUR RELAYS REMAIN, LAWSMITH.
        </p>
      </aside>
    </div>
  );
}
