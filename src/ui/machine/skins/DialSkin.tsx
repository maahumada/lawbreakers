import { DIAL_MARGIN, needleAngle } from "./geometry.ts";
import { marksOf } from "./svg.ts";
import { Readout, SkinLabel } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

const CX = 120;
const CY = 100;
const R = 78;

const polar = (deg: number, r: number): [number, number] => [
  CX + r * Math.cos((deg * Math.PI) / 180),
  CY + r * Math.sin((deg * Math.PI) / 180),
];

/**
 * A handwheel dial: notches `min…max` printed, the meltdown in red, and an unprinted dashed zone
 * past the last notch so an invented value (lab) visibly sits where the valve has no notch.
 */
export function DialSkin({ vars, values, panel }: SkinOf<"dial">) {
  const decl = vars[0];
  if (!decl) return null;
  const value = values[0] ?? 0;
  const { min, max } = panel;
  const needle = needleAngle(value, min, max);
  const notes: string[] = [];
  if (value > max) notes.push(`past the last notch ${max}`);
  if (value < min) notes.push(`below notch ${min}`);
  const notches = [];
  for (let i = min - DIAL_MARGIN; i <= max + DIAL_MARGIN; i++) {
    const deg = needleAngle(i, min, max).deg;
    const printed = i >= min && i <= max;
    const major = printed && (i - min) % 5 === 0;
    const [x1, y1] = polar(deg, R - 2);
    const [x2, y2] = polar(deg, R - (major ? 14 : 8));
    notches.push(
      <line
        key={i}
        className={
          printed ? (major ? "sk-tick sk-tick--major" : "sk-tick") : "sk-tick sk-tick--void"
        }
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
      />,
    );
    if (major || i === max) {
      const [tx, ty] = polar(deg, R - 24);
      notches.push(
        <text key={`t${i}`} className="sk-small" x={tx} y={ty + 3} textAnchor="middle">
          {i}
        </text>,
      );
    }
  }
  const voidArc = (from: number, to: number, key: string) => {
    const [ax, ay] = polar(needleAngle(from, min, max).deg, R + 4);
    const [bx, by] = polar(needleAngle(to, min, max).deg, R + 4);
    return (
      <path
        key={key}
        className="sk-void"
        d={`M${ax} ${ay} A ${R + 4} ${R + 4} 0 0 1 ${bx} ${by}`}
      />
    );
  };
  return (
    <div className="skin__cols" data-cols={1}>
      <div className="skin__col" data-part="dial">
        <SkinLabel text={decl.label} />
        <svg className="sk-svg sk-svg--dial" viewBox="0 0 240 180" aria-hidden>
          <circle className="sk-brass" cx={CX} cy={CY} r={R + 8} />
          <circle className="sk-face" cx={CX} cy={CY} r={R} />
          {voidArc(min - DIAL_MARGIN, min, "lo")}
          {voidArc(max, max + DIAL_MARGIN, "hi")}
          {notches}
          {marksOf(panel.marks, decl.name).map((m) => {
            const a = needleAngle(m.at - 0.45, min, max).deg;
            const b = needleAngle(m.at + 0.45, min, max).deg;
            const [ax, ay] = polar(a, R - 1);
            const [bx, by] = polar(b, R - 1);
            const mid = needleAngle(m.at, min, max).deg;
            const [lx, ly] = polar(mid, R + 13);
            const cos = Math.cos((mid * Math.PI) / 180);
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            return (
              <g key={`${m.at}-${m.label}`} className={m.alarm ? "sk-arc sk-arc--alarm" : "sk-arc"}>
                <path d={`M${ax} ${ay} A ${R - 1} ${R - 1} 0 0 1 ${bx} ${by}`} />
                <text x={lx} y={ly + 3} textAnchor={anchor}>
                  {m.label}
                </text>
              </g>
            );
          })}
          <g
            className="sk-needle"
            style={{ transform: `rotate(${needle.deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}
          >
            <line x1={CX} y1={CY} x2={CX + R - 6} y2={CY} />
          </g>
          <circle className="sk-hub" cx={CX} cy={CY} r={6} />
          {needle.pegged && (
            <text className="sk-over" x={CX} y={CY + 34} textAnchor="middle">
              PEGGED {needle.pegged === "high" ? "▲" : "▼"}
            </text>
          )}
        </svg>
        <Readout decl={decl} value={value} note={notes.join(", ") || null} />
      </div>
    </div>
  );
}
