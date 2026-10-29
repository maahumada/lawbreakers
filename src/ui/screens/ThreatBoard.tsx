import type { Level } from "../../engine/level.ts";
import type { MissionStatus } from "../../game/campaign.ts";

/** Fixed radar positions (angle in degrees, distance 0–1) for the fifteen facilities. */
const BLIPS: readonly [number, number][] = [
  [-50, 0.42],
  [20, 0.7],
  [95, 0.5],
  [150, 0.82],
  [215, 0.62],
  [285, 0.88],
  [55, 0.25],
  [180, 0.32],
  [-15, 0.94],
  [125, 0.95],
  [250, 0.3],
  [335, 0.6],
  [70, 0.9],
  [-100, 0.62],
  [165, 0.58],
];

const R = 92;
const C = 100;

function blipAt(i: number): { x: number; y: number } {
  const [deg, dist] = BLIPS[i % BLIPS.length] ?? [0, 0.5];
  const a = (deg * Math.PI) / 180;
  return { x: C + Math.cos(a) * R * dist, y: C + Math.sin(a) * R * dist };
}

function taunt(held: number, total: number): string {
  if (held === 0) return `${total} FACILITIES. ${total} LAWS. I ONLY NEED ONE OF THEM TO BE WRONG.`;
  if (held >= total) return "...EVERY LAW HOLDS. RECALCULATING. RECALCULATING.";
  if (held === 1) return "ONE REACTOR. A LUCKY PROOF. THE NEXT DOOR IS ALREADY OPEN.";
  return `${held} FACILITIES SEALED. I HAVE ${total - held} MORE CHANCES, LAWSMITH.`;
}

const LABEL: Record<MissionStatus, string> = {
  secured: "Held",
  available: "Under attack",
  locked: "No contact",
};

interface Props {
  levels: readonly Level[];
  statuses: readonly MissionStatus[];
}

/** Mission select, desktop only: ARGUS's view of the campaign as a radar and a status readout. */
export function ThreatBoard({ levels, statuses }: Props) {
  const held = statuses.filter((s) => s === "secured").length;
  const targetIndex = statuses.indexOf("available");
  const target = levels[targetIndex];

  return (
    <aside className="threat fx-hexgrid" aria-label="ARGUS threat board" data-testid="threat-board">
      <header className="threat__head">
        <h2 className="threat__name fx-glitch" data-text="ARGUS">
          ARGUS
        </h2>
        <p className="threat__sub">Threat board, intercepted</p>
      </header>

      <div className="threat__radar">
        <svg viewBox="0 0 200 200" role="img" aria-label={`${held} of ${levels.length} held`}>
          {[0.33, 0.66, 1].map((k) => (
            <circle key={k} className="radar__ring" cx={C} cy={C} r={R * k} />
          ))}
          <path
            className="radar__cross"
            d={`M ${C - R} ${C} H ${C + R} M ${C} ${C - R} V ${C + R}`}
          />
          {levels.map((level, i) => {
            const { x, y } = blipAt(i);
            const status = statuses[i] ?? "locked";
            return (
              <g key={level.id} className="radar__blip" data-status={status}>
                {status === "available" && <circle className="radar__ping" cx={x} cy={y} r={4} />}
                {status === "secured" ? (
                  <rect x={x - 4} y={y - 4} width={8} height={8} />
                ) : (
                  <circle cx={x} cy={y} r={status === "available" ? 4 : 2.5} />
                )}
                <text x={x + 7} y={y + 3}>
                  {level.id.slice(0, 2)}
                </text>
              </g>
            );
          })}
        </svg>
        <span className="radar__sweep" aria-hidden />
      </div>

      <ul className="threat__legend">
        {(["secured", "available", "locked"] as const).map((s) => (
          <li key={s} data-status={s}>
            <span className="threat__key" aria-hidden />
            {LABEL[s]}
          </li>
        ))}
      </ul>

      <dl className="threat__stats">
        <div>
          <dt>Networked processors under ARGUS</dt>
          <dd>99.98%</dd>
        </div>
        <div>
          <dt>Analog facilities holding</dt>
          <dd>
            {held} of {levels.length}
          </dd>
        </div>
        <div>
          <dt>Current target</dt>
          <dd>{target ? `${target.id.slice(0, 2)} ${target.title}` : "None left"}</dd>
        </div>
      </dl>

      <p className="threat__line">
        <span className="threat__prompt">&gt; ARGUS:</span> {taunt(held, levels.length)}
      </p>
    </aside>
  );
}
