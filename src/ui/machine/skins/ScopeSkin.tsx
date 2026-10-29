import { clampToFrame, tickStep, trailOpacity } from "./geometry.ts";
import { Readout } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

// Frame 24…204 in a 228×228 box. ℕ axes start at the bottom-left corner; ℤ axes are centred.
const LO = 24;
const SIZE = 180;

/**
 * An oscilloscope: the state is a phosphor dot, with a short trail of real (logged) states.
 * Axes and a coarse grid only, no diagonal guides: a long trail or a guide line would draw the
 * reachable set. In lab/meltdown/init the trail is hidden; a replayed lab step is a dashed arrow.
 */
export function ScopeSkin({ vars, values, scale, mode, from, history, panel }: SkinOf<"scope">) {
  const [dx, dy] = vars;
  if (!dx || !dy) return null;
  const signed = dx.domain === "int" || dy.domain === "int";
  const vmin = signed ? -scale : 0;
  const span = scale - vmin;
  const px = (v: number) => LO + ((v - vmin) / span) * SIZE;
  const py = (v: number) => LO + SIZE - ((v - vmin) / span) * SIZE;
  const x = values[0] ?? 0;
  const y = values[1] ?? 0;
  const head = clampToFrame(x, y, vmin, scale);
  const off = head.outX !== 0 || head.outY !== 0;
  const real = mode === null || mode === "live" || mode === "holds";
  const trail = real
    ? history
        .slice(-(panel.trail + 1), -1)
        .map((s) => clampToFrame(s[dx.name] ?? 0, s[dy.name] ?? 0, vmin, scale))
    : [];
  const grid = 5 * tickStep(scale);
  const lines: number[] = [];
  for (let v = vmin + grid; v < scale; v += grid) lines.push(v);
  const step = !real && from ? clampToFrame(from[0] ?? 0, from[1] ?? 0, vmin, scale) : null;
  const zero = signed ? 0 : vmin;
  return (
    <div className="skin__scope">
      <svg className="sk-svg sk-svg--scope" viewBox="0 0 228 228" aria-hidden>
        <rect className="sk-face sk-face--scope" x={LO} y={LO} width={SIZE} height={SIZE} />
        {lines.map((v) => (
          <g key={v} className="sk-grid">
            <line x1={px(v)} x2={px(v)} y1={LO} y2={LO + SIZE} />
            <line x1={LO} x2={LO + SIZE} y1={py(v)} y2={py(v)} />
          </g>
        ))}
        <line className="sk-axis" x1={LO} x2={LO + SIZE} y1={py(zero)} y2={py(zero)} />
        <line className="sk-axis" x1={px(zero)} x2={px(zero)} y1={LO} y2={LO + SIZE} />
        <text className="sk-small" x={LO + SIZE} y={LO + SIZE + 14} textAnchor="end">
          {dx.name} → {scale}
        </text>
        <text className="sk-small" x={LO - 4} y={LO - 6} textAnchor="start">
          ↑ {dy.name} {scale}
        </text>
        {(panel.alarms ?? []).map(({ at: [ax, ay] }) => {
          if (ax < vmin || ax > scale || ay < vmin || ay > scale) return null;
          const cx = px(ax);
          const cy = py(ay);
          return (
            <path
              key={`${ax},${ay}`}
              className="sk-cross"
              d={`M${cx - 4} ${cy - 4} l 8 8 M${cx + 4} ${cy - 4} l -8 8`}
            />
          );
        })}
        {trail.map((p, i) => (
          <circle
            key={i}
            className="sk-trail"
            cx={px(p.x)}
            cy={py(p.y)}
            r={2.6}
            opacity={trailOpacity(i, trail.length + 1)}
          />
        ))}
        {step && (
          <line
            className="sk-step"
            x1={px(step.x)}
            y1={py(step.y)}
            x2={px(head.x)}
            y2={py(head.y)}
          />
        )}
        <g
          className="sk-slide"
          style={{ transform: `translate(${px(head.x)}px, ${py(head.y)}px)` }}
        >
          <circle className="sk-dot" cx={0} cy={0} r={5} />
          {off && (
            <path
              className="sk-edge"
              d="M0 -6 L 12 0 L 0 6 z"
              style={{
                transform: `rotate(${(Math.atan2(-head.outY, head.outX) * 180) / Math.PI}deg) translate(8px, 0)`,
              }}
            />
          )}
        </g>
        {off && (
          <text className="sk-over" x={LO + SIZE / 2} y={LO - 8} textAnchor="middle">
            OFF THE SCOPE
          </text>
        )}
      </svg>
      <div className="skin__readouts">
        <div className="skin__col">
          <span className="skin__label" aria-hidden>
            {dx.label}
          </span>
          <Readout decl={dx} value={x} note={head.outX !== 0 ? "off the scope" : null} />
        </div>
        <div className="skin__col">
          <span className="skin__label" aria-hidden>
            {dy.label}
          </span>
          <Readout decl={dy} value={y} note={head.outY !== 0 ? "off the scope" : null} />
        </div>
      </div>
    </div>
  );
}
