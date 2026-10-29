import type { GaugeMark } from "../../../engine/display.ts";
import type { VarDecl } from "../../../engine/level.ts";
import { fillFraction, ticks } from "./geometry.ts";
import { Hatch } from "./Hatch.tsx";
import { marksOf, useSvgId } from "./svg.ts";
import { Readout, SkinLabel } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

// One rail per variable in a 320×64 box: cylinder 8…68, rod from the head (x = 68) along a ruler
// of RAIL units for the shared full scale, so every piston of the panel uses one unit length.
const HEAD = 68;
const RAIL = 236;
const BODY = 60;

function Rail({
  decl,
  value,
  full,
  marks,
}: {
  decl: VarDecl;
  value: number;
  full: number;
  marks: readonly GaugeMark[];
}) {
  const hatch = useSvgId("hatch");
  const { frac, over, under } = fillFraction(value, full);
  const u = RAIL / full;
  const retract = Math.min(BODY - 6, under * u);
  const note = under > 0 ? "retracted past zero" : over > 0 ? "past the end of the ruler" : null;
  return (
    <div className="skin__row" data-part="piston">
      <SkinLabel text={decl.label} />
      <div className="skin__rowbody">
        <Readout decl={decl} value={value} note={note} />
        <svg className="sk-svg sk-svg--rail" viewBox="0 0 320 64" aria-hidden>
          <defs>
            <Hatch id={hatch} />
          </defs>
          <rect className="sk-brass" x={HEAD - BODY} y={14} width={BODY} height={26} rx={3} />
          <rect
            className="sk-rod"
            x={HEAD}
            y={23}
            width={RAIL}
            height={8}
            style={{ transform: `scaleX(${frac})` }}
          />
          <g className="sk-slide" style={{ transform: `translateX(${frac * RAIL}px)` }}>
            <rect className="sk-brass" x={HEAD} y={16} width={7} height={22} />
          </g>
          {under > 0 && (
            <g className="sk-under">
              <rect x={HEAD - retract} y={18} width={retract} height={18} fill={`url(#${hatch})`} />
              <text x={HEAD - BODY} y={10}>
                ◀ RETRACTED PAST 0
              </text>
            </g>
          )}
          {over > 0 && (
            <text className="sk-over" x={HEAD + RAIL} y={10} textAnchor="end">
              ▶ PAST THE RULER
            </text>
          )}
          <line className="sk-tick sk-tick--major" x1={HEAD} x2={HEAD} y1={44} y2={54} />
          {ticks(full).map((t) => {
            const x = HEAD + t.at * u;
            return (
              <line
                key={t.at}
                className={t.major ? "sk-tick sk-tick--major" : "sk-tick"}
                x1={x}
                x2={x}
                y1={44}
                y2={t.major ? 54 : 49}
              />
            );
          })}
          <line
            className="sk-tick sk-tick--major"
            x1={HEAD + RAIL}
            x2={HEAD + RAIL}
            y1={44}
            y2={54}
          />
          <text className="sk-small" x={HEAD} y={63} textAnchor="middle">
            0
          </text>
          <text className="sk-small" x={HEAD + RAIL} y={63} textAnchor="middle">
            {full}
          </text>
          {marks
            .filter((m) => m.at > 0 && m.at <= full)
            .map((m) => {
              const x = HEAD + m.at * u;
              return (
                <g
                  key={`${m.at}-${m.label}`}
                  className={m.alarm ? "sk-mark sk-mark--alarm" : "sk-mark"}
                >
                  <line x1={x} x2={x} y1={6} y2={50} />
                  <text x={x - 3} y={10} textAnchor="end">
                    {m.label}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
}

/** Cylinders on one ruler: a coupling shows as rod lengths, never as a printed ratio or lever. */
export function PistonSkin({ vars, values, scale, panel }: SkinOf<"piston">) {
  return (
    <div className="skin__rows">
      {vars.map((d, i) => (
        <Rail
          key={d.name}
          decl={d}
          value={values[i] ?? 0}
          full={scale}
          marks={marksOf(panel.marks, d.name)}
        />
      ))}
    </div>
  );
}
