import { fillFraction } from "./geometry.ts";
import { Readout } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

// 300×190 box. Jacks at x = 80 and 220 stand on the ground line; the river is on the right.
const XL = 80;
const XR = 220;
const GROUND = 168;
const MIN_H = 18;
const RISE = 110;
const MAX_TILT = 32;

const tiltDeg = (left: number, right: number, u: number) =>
  Math.max(
    -MAX_TILT,
    Math.min(MAX_TILT, (Math.atan2((left - right) * u, XR - XL) * 180) / Math.PI),
  );

/**
 * A deck on two jacks. The tilt is the left − right difference, which is the meltdown's own
 * quantity (printed on the placard), so drawing it adds nothing the player cannot read there.
 * Only the river-side tipping point is marked; no tolerance band.
 */
export function DeckSkin({ vars, values, scale, panel }: SkinOf<"deck">) {
  const [dl, dr] = vars;
  if (!dl || !dr) return null;
  const l = values[0] ?? 0;
  const r = values[1] ?? 0;
  const u = RISE / scale;
  const fl = fillFraction(l, scale);
  const fr = fillFraction(r, scale);
  const topL = GROUND - MIN_H - fl.frac * RISE;
  const topR = GROUND - MIN_H - fr.frac * RISE;
  const deg = tiltDeg(l, r, u);
  const tip = tiltDeg(panel.tipAt, 0, u);
  const midX = (XL + XR) / 2;
  const midY = (topL + topR) / 2 - 4;
  const jack = (x: number, f: number) => (
    <g>
      <rect className="sk-brass" x={x - 16} y={GROUND - 8} width={32} height={8} />
      <rect
        className="sk-jack"
        x={x - 9}
        y={GROUND - MIN_H - RISE}
        width={18}
        height={RISE + MIN_H - 8}
        style={{ transform: `scaleY(${(MIN_H - 8 + f * RISE) / (RISE + MIN_H - 8)})` }}
      />
    </g>
  );
  return (
    <div className="skin__scene">
      <svg className="sk-svg sk-svg--deck" viewBox="0 0 300 190" aria-hidden>
        <line className="sk-axis" x1={0} x2={250} y1={GROUND} y2={GROUND} />
        <g className="sk-river">
          <rect x={250} y={GROUND - 2} width={50} height={22} />
          <path d={`M252 ${GROUND + 6} q 6 -4 12 0 t 12 0 t 12 0 t 12 0`} />
        </g>
        <text className="sk-small" x={296} y={GROUND + 18} textAnchor="end">
          RIVER
        </text>
        {jack(XL, fl.frac)}
        {jack(XR, fr.frac)}
        <g
          className="sk-tip"
          style={{ transform: `translate(${midX}px, ${midY}px) rotate(${tip}deg)` }}
        >
          <line x1={-(XR - XL) / 2 - 40} x2={(XR - XL) / 2 + 40} y1={0} y2={0} />
        </g>
        <g
          className="sk-slide"
          style={{ transform: `translate(${midX}px, ${midY}px) rotate(${deg}deg)` }}
        >
          <rect
            className="sk-plank"
            x={-(XR - XL) / 2 - 40}
            y={-3}
            width={XR - XL + 80}
            height={6}
            rx={2}
          />
        </g>
        <text className="sk-alarm-text" x={150} y={14} textAnchor="middle">
          {panel.label}
        </text>
      </svg>
      <div className="skin__readouts">
        <div className="skin__col">
          <span className="skin__label" aria-hidden>
            {dl.label}
          </span>
          <Readout
            decl={dl}
            value={l}
            note={fl.over > 0 ? "over scale" : fl.under > 0 ? "below the ground" : null}
          />
        </div>
        <div className="skin__col">
          <span className="skin__label" aria-hidden>
            {dr.label}
          </span>
          <Readout
            decl={dr}
            value={r}
            note={fr.over > 0 ? "over scale" : fr.under > 0 ? "below the ground" : null}
          />
        </div>
      </div>
    </div>
  );
}
