import type { GaugeMark } from "../../../engine/display.ts";
import type { VarDecl } from "../../../engine/level.ts";
import { fillFraction, ticks } from "./geometry.ts";
import { Hatch } from "./Hatch.tsx";
import { marksOf, useSvgId } from "./svg.ts";
import { Readout, SkinLabel } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

// Tank: x 14…64, y 24…154 in a 100-wide box. Liquid scales from the floor (CSS transition).
const TX = 14;
const TW = 50;
const TOP = 24;
const TH = 130;
const FLOOR = TOP + TH;
const UNDER_MAX = 24;

function MarkLine({ m, y, x1, x2 }: { m: GaugeMark; y: number; x1: number; x2: number }) {
  return (
    <g className={m.alarm ? "sk-mark sk-mark--alarm" : "sk-mark"}>
      <line x1={x1} x2={x2} y1={y} y2={y} />
      <text x={x2 + 2} y={y + 3}>
        {m.label}
      </text>
    </g>
  );
}

function Below({
  id,
  under,
  full,
  x,
  w,
  y,
}: {
  id: string;
  under: number;
  full: number;
  x: number;
  w: number;
  y: number;
}) {
  if (under <= 0) return null;
  const h = Math.max(6, Math.min(UNDER_MAX, (under / full) * TH));
  return (
    <g className="sk-under">
      <rect x={x} y={y + 2} width={w} height={h} fill={`url(#${id})`} />
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle">
        ▼ BELOW EMPTY
      </text>
    </g>
  );
}

function Tank({
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
  const note = under > 0 ? "below empty" : over > 0 ? "over scale" : null;
  return (
    <div className="skin__col" data-part="tank">
      <SkinLabel text={decl.label} />
      {/* Room under the floor only when there is something to show there. */}
      <svg className="sk-svg" viewBox={`0 0 100 ${under > 0 ? 196 : FLOOR + 6}`} aria-hidden>
        <defs>
          <Hatch id={hatch} />
        </defs>
        {over > 0 && (
          <text className="sk-over" x={TX + TW / 2} y={12} textAnchor="middle">
            ▲ OVER SCALE
          </text>
        )}
        <rect className="sk-glass" x={TX} y={TOP} width={TW} height={TH} rx={5} />
        <rect
          className="sk-liquid"
          x={TX + 3}
          y={TOP}
          width={TW - 6}
          height={TH}
          rx={2}
          style={{ transform: `scaleY(${frac})` }}
        />
        {ticks(full).map((t) => {
          const y = FLOOR - (t.at / full) * TH;
          return (
            <line
              key={t.at}
              className={t.major ? "sk-tick sk-tick--major" : "sk-tick"}
              x1={TX}
              x2={TX + (t.major ? 12 : 7)}
              y1={y}
              y2={y}
            />
          );
        })}
        {marks
          .filter((m) => m.at > 0 && m.at <= full)
          .map((m) => (
            <MarkLine
              key={`${m.at}-${m.label}`}
              m={m}
              y={FLOOR - (m.at / full) * TH}
              x1={TX - 4}
              x2={TX + TW + 4}
            />
          ))}
        <Below id={hatch} under={under} full={full} x={TX} w={TW} y={FLOOR} />
      </svg>
      <Readout decl={decl} value={value} note={note} />
    </div>
  );
}

/** One column of liquid per variable, all on the shared scale so they compare at a glance. */
export function TankSkin({ vars, values, scale, panel }: SkinOf<"tank">) {
  return (
    <div className="skin__cols" data-cols={vars.length}>
      {vars.map((d, i) => (
        <Tank
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

// Jug: 120 wide, rim at y = 34; the bottle is `cap × UNIT` tall, so a bigger jug is taller.
const UNIT = 12;
const JUG_TOP = 34;
const CX = 50;

function jugPath(cap: number): string {
  const H = cap * UNIT;
  const w = 40 + cap * 4;
  const neck = w * 0.22;
  const left = CX - w / 2;
  const bottom = JUG_TOP + H;
  return [
    `M${CX - neck} ${JUG_TOP}`,
    `h ${2 * neck}`,
    `v 8`,
    `Q ${left + w} ${JUG_TOP + 10} ${left + w} ${JUG_TOP + 26}`,
    `V ${bottom - 5}`,
    `q 0 5 -5 5`,
    `H ${left + 5}`,
    `q -5 0 -5 -5`,
    `V ${JUG_TOP + 26}`,
    `Q ${left} ${JUG_TOP + 10} ${CX - neck} ${JUG_TOP + 8}`,
    "Z",
  ].join(" ");
}

function Jug({
  decl,
  value,
  cap,
  marks,
}: {
  decl: VarDecl;
  value: number;
  cap: number;
  marks: readonly GaugeMark[];
}) {
  const clip = useSvgId("jug");
  const hatch = useSvgId("hatch");
  const H = cap * UNIT;
  const bottom = JUG_TOP + H;
  const w = 40 + cap * 4;
  const { frac, over, under } = fillFraction(value, cap);
  const note = over > 0 ? `over capacity ${cap}` : under > 0 ? "below empty" : null;
  const path = jugPath(cap);
  const right = CX + w / 2;
  return (
    <div className="skin__col" data-part="jug">
      <SkinLabel text={decl.label} />
      <svg
        className="sk-svg"
        viewBox={`0 0 120 ${bottom + 44}`}
        // Same units per viewBox px for every jug, so a bigger capacity is a taller bottle.
        style={{ maxHeight: `${(bottom + 44) * 0.075}rem` }}
        aria-hidden
      >
        <defs>
          <clipPath id={clip}>
            <path d={path} />
          </clipPath>
          <Hatch id={hatch} />
        </defs>
        <path className="sk-glass" d={path} />
        <rect
          className="sk-liquid"
          clipPath={`url(#${clip})`}
          x={0}
          y={JUG_TOP}
          width={120}
          height={H}
          style={{ transform: `scaleY(${frac})` }}
        />
        {Array.from({ length: cap - 1 }, (_, i) => {
          const y = bottom - (i + 1) * UNIT;
          return (
            <line
              key={i}
              className="sk-tick"
              x1={CX - w / 2 + 1}
              x2={CX - w / 2 + 8}
              y1={y}
              y2={y}
            />
          );
        })}
        <text className="sk-rim" x={CX} y={JUG_TOP - 4} textAnchor="middle">
          RIM {cap}
        </text>
        {marks
          .filter((m) => m.at > 0 && m.at < cap)
          .map((m) => (
            <MarkLine
              key={`${m.at}-${m.label}`}
              m={m}
              y={bottom - m.at * UNIT}
              x1={CX - w / 2 - 3}
              x2={right + 1}
            />
          ))}
        {over > 0 && (
          <g className="sk-spill">
            <path
              d={`M${CX + w * 0.22} ${JUG_TOP} q 12 -2 14 14 v ${Math.min(60, 10 + over * 4)}`}
            />
            <text x={CX} y={12} textAnchor="middle">
              ▲ {over} OVER THE RIM
            </text>
          </g>
        )}
        <Below id={hatch} under={under} full={cap} x={CX - w / 2} w={w} y={bottom} />
      </svg>
      <Readout decl={decl} value={value} note={note} />
    </div>
  );
}

/** Bottles whose rim is a fixed capacity, one-unit ticks only (no emphasis on any multiple). */
export function JugSkin({ vars, values, panel }: SkinOf<"jug">) {
  return (
    <div className="skin__cols" data-cols={vars.length}>
      {vars.map((d, i) => (
        <Jug
          key={d.name}
          decl={d}
          value={values[i] ?? 0}
          cap={panel.capacity[d.name] ?? 1}
          marks={marksOf(panel.marks, d.name)}
        />
      ))}
    </div>
  );
}
