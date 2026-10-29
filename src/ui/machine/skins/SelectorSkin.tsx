import { Readout, SkinLabel } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

const CX = 120;
const CY = 92;
const R = 34;
/** Angle of the unlabelled notch: straight down, away from every named position. */
const NOWHERE_DEG = 90;

const polar = (deg: number, r: number): [number, number] => [
  CX + r * Math.cos((deg * Math.PI) / 180),
  CY + r * Math.sin((deg * Math.PI) / 180),
];

/** Named positions spread over the top arc (from upper left to upper right). */
function positionAngles(n: number): number[] {
  if (n === 1) return [270];
  return Array.from({ length: n }, (_, i) => 200 + (140 * i) / (n - 1));
}

/** A rotary switch: named positions light their lamp; any other value turns to a `?` notch. */
export function SelectorSkin({ vars, values, panel }: SkinOf<"selector">) {
  const decl = vars[0];
  if (!decl) return null;
  const value = values[0] ?? 0;
  const entries = Object.entries(panel.positions).sort(([a], [b]) => Number(a) - Number(b));
  const angles = positionAngles(entries.length);
  const index = entries.findIndex(([k]) => Number(k) === value);
  const deg = index >= 0 ? (angles[index] ?? NOWHERE_DEG) : NOWHERE_DEG;
  const [qx, qy] = polar(NOWHERE_DEG, R + 16);
  return (
    <div className="skin__cols" data-cols={1}>
      <div className="skin__col" data-part="selector">
        <SkinLabel text={decl.label} />
        <svg className="sk-svg sk-svg--selector" viewBox="0 0 240 150" aria-hidden>
          {entries.map(([k, label], i) => {
            const a = angles[i] ?? 270;
            const [lx, ly] = polar(a, R + 14);
            const [tx, ty] = polar(a, R + 30);
            const cos = Math.cos((a * Math.PI) / 180);
            return (
              <g key={k} className={i === index ? "sk-pos sk-pos--on" : "sk-pos"}>
                <circle className="sk-lamp" cx={lx} cy={ly} r={5} />
                <text
                  x={tx}
                  y={ty + 3}
                  textAnchor={cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle"}
                >
                  {label}
                </text>
              </g>
            );
          })}
          <g className={index < 0 ? "sk-pos sk-pos--on sk-pos--nowhere" : "sk-pos sk-pos--nowhere"}>
            <text x={qx} y={qy + 4} textAnchor="middle">
              ?
            </text>
          </g>
          <circle className="sk-brass" cx={CX} cy={CY} r={R} />
          <g
            className="sk-knob"
            style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}
          >
            <rect className="sk-pointer" x={CX} y={CY - 4} width={R - 4} height={8} rx={4} />
          </g>
          <circle className="sk-hub" cx={CX} cy={CY} r={6} />
        </svg>
        <Readout decl={decl} value={value} note={index < 0 ? "no such position" : null} />
      </div>
    </div>
  );
}
