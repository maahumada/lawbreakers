import { fillFraction, trayLayout } from "./geometry.ts";
import { Hatch } from "./Hatch.tsx";
import { marksOf, useSvgId } from "./svg.ts";
import { Readout } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

// 300×200 box. Drum on a beam at the left; the hook hangs `cable × u` below the drum stop.
// The counterweight rack on the right counts blocks in two columns: a different unit on purpose,
// so load and counterweight never line up as "equal heights".
const DRUM_X = 80;
const STOP = 46;
const DROP = 126;
const RACK_X = 206;
const RACK_COLS = 2;
const RACK_ROWS = 6;
const BLOCK_W = 34;
const BLOCK_H = 14;
const PAST_MAX = 30;

export function HoistSkin({ vars, values, scale, panel }: SkinOf<"hoist">) {
  const hatch = useSvgId("hatch");
  const [dc, dw] = vars;
  if (!dc || !dw) return null;
  const cable = values[0] ?? 0;
  const blocks = values[1] ?? 0;
  const fc = fillFraction(cable, scale);
  const past = Math.min(PAST_MAX, (fc.under / scale) * DROP);
  const rack = trayLayout(blocks, RACK_COLS * RACK_ROWS);
  const stopMark = marksOf(panel.marks, dc.name).find((m) => m.alarm);
  const slot = (i: number): [number, number] => [
    RACK_X + 4 + (i % RACK_COLS) * (BLOCK_W + 4),
    180 - (Math.floor(i / RACK_COLS) + 1) * (BLOCK_H + 3),
  ];
  return (
    <div className="skin__scene">
      <svg className="sk-svg sk-svg--hoist" viewBox="0 0 300 200" aria-hidden>
        <defs>
          <Hatch id={hatch} />
        </defs>
        <line className="sk-beam" x1={12} x2={170} y1={STOP - 14} y2={STOP - 14} />
        <g className={stopMark ? "sk-mark sk-mark--alarm" : "sk-mark"}>
          <line x1={DRUM_X - 46} x2={DRUM_X + 46} y1={STOP} y2={STOP} />
          <text x={DRUM_X + 50} y={STOP + 3}>
            DRUM STOP{stopMark ? ` · ${stopMark.label}` : ""}
          </text>
        </g>
        <rect
          className="sk-cable"
          x={DRUM_X - 1}
          y={STOP}
          width={2}
          height={DROP}
          style={{ transform: `scaleY(${Math.max(0.02, fc.frac)})` }}
        />
        <g className="sk-slide" style={{ transform: `translateY(${fc.frac * DROP}px)` }}>
          <path className="sk-hook" d={`M${DRUM_X} ${STOP} v 8 a 6 6 0 1 1 -6 6`} />
        </g>
        <circle className="sk-brass" cx={DRUM_X} cy={STOP - 14} r={14} />
        {fc.under > 0 && (
          <g className="sk-under">
            <rect
              x={DRUM_X - 12}
              y={STOP - 14 - past}
              width={24}
              height={past}
              fill={`url(#${hatch})`}
            />
            <text x={DRUM_X + 18} y={12}>
              CABLE PAST STOP
            </text>
          </g>
        )}
        {fc.over > 0 && (
          <text className="sk-over" x={DRUM_X} y={196} textAnchor="middle">
            ▼ +{fc.over} BELOW THE FRAME
          </text>
        )}
        <rect
          className="sk-brass sk-rack"
          x={RACK_X}
          y={180 - RACK_ROWS * (BLOCK_H + 3) - 6}
          width={RACK_COLS * (BLOCK_W + 4) + 4}
          height={RACK_ROWS * (BLOCK_H + 3) + 8}
        />
        {Array.from({ length: rack.shown }, (_, i) => {
          const [x, y] = slot(i);
          return (
            <rect
              key={`b${i}`}
              className="sk-tok sk-pop"
              x={x}
              y={y}
              width={BLOCK_W}
              height={BLOCK_H}
            />
          );
        })}
        {Array.from({ length: rack.ghosts }, (_, i) => {
          const [x, y] = slot(i);
          return (
            <rect key={`g${i}`} className="sk-ghost" x={x} y={y} width={BLOCK_W} height={BLOCK_H} />
          );
        })}
        {(rack.more > 0 || blocks < 0) && (
          <text
            className={blocks < 0 ? "sk-under-text" : "sk-over"}
            x={RACK_X + 42}
            y={196}
            textAnchor="middle"
          >
            {blocks < 0 ? `${-blocks} BLOCKS OWED` : `+${rack.more} MORE`}
          </text>
        )}
      </svg>
      <div className="skin__readouts">
        <div className="skin__col">
          <span className="skin__label" aria-hidden>
            {dc.label}
          </span>
          <Readout
            decl={dc}
            value={cable}
            note={
              fc.under > 0 ? "cable past the drum stop" : fc.over > 0 ? "below the frame" : null
            }
          />
        </div>
        <div className="skin__col">
          <span className="skin__label" aria-hidden>
            {dw.label}
          </span>
          <Readout
            decl={dw}
            value={blocks}
            note={
              blocks < 0
                ? "blocks owed"
                : rack.more > 0
                  ? `${rack.more} more than the rack shows`
                  : null
            }
          />
        </div>
      </div>
    </div>
  );
}
