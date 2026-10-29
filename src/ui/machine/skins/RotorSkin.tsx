import { Readout } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

const CX = 130;
const CY = 112;
const ORBIT = 70;
const RINGS = 6;
/** Phases differ by stroke pattern as well as shade (colour-blind safe; lab flattens hues). */
const PATTERNS = ["solid", "brass", "dashed"] as const;
const ANGLES = [-90, 150, 30];

/**
 * Three coils around a rotor, one ring per unit (up to six, then `+k`). The rotor's angle is
 * never a function of the state: it only spins once per fire, as feedback, and rests upright.
 */
export function RotorSkin({ vars, values, tick }: SkinOf<"rotor">) {
  return (
    <div className="skin__scene">
      <svg className="sk-svg sk-svg--rotor" viewBox="0 0 260 226" aria-hidden>
        {vars.map((d, k) => {
          const v = values[k] ?? 0;
          const a = ((ANGLES[k] ?? 0) * Math.PI) / 180;
          const bx = CX + ORBIT * Math.cos(a);
          const by = CY + ORBIT * Math.sin(a);
          const lit = Math.min(Math.abs(v), RINGS);
          const extra = Math.abs(v) - lit;
          return (
            <g key={d.name} className={`sk-coil sk-coil--${PATTERNS[k] ?? "solid"}`}>
              {Array.from({ length: RINGS }, (_, i) => (
                <circle
                  key={i}
                  cx={bx}
                  cy={by}
                  r={9 + i * 5}
                  className={i < lit ? (v < 0 ? "sk-ghost" : "sk-ring sk-ring--on") : "sk-ring"}
                />
              ))}
              <text className="sk-coil__name" x={bx} y={by + 4} textAnchor="middle">
                {d.name}
              </text>
              {extra > 0 && (
                <text
                  className={v < 0 ? "sk-under-text" : "sk-over"}
                  x={bx}
                  y={by + 48}
                  textAnchor="middle"
                >
                  {v < 0 ? `${extra} MORE OWED` : `+${extra} MORE`}
                </text>
              )}
            </g>
          );
        })}
        <circle className="sk-brass" cx={CX} cy={CY} r={22} />
        <g
          key={tick}
          className={tick > 0 ? "sk-rotor sk-rotor--spin" : "sk-rotor"}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
          <path
            className="sk-blade"
            d={`M${CX} ${CY - 18} L${CX + 5} ${CY} L${CX} ${CY + 18} L${CX - 5} ${CY} z`}
          />
        </g>
      </svg>
      <div className="skin__readouts" data-cols={vars.length}>
        {vars.map((d, k) => (
          <div key={d.name} className="skin__col">
            <span className="skin__label" aria-hidden>
              {d.label}
            </span>
            <Readout
              decl={d}
              value={values[k] ?? 0}
              note={(values[k] ?? 0) < 0 ? "below empty" : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
