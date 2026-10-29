import type { GaugeMark, TokenGlyph } from "../../../engine/display.ts";
import type { VarDecl } from "../../../engine/level.ts";
import { trayLayout } from "./geometry.ts";
import { Glyph } from "./glyphs.tsx";
import { marksOf } from "./svg.ts";
import { Readout, SkinLabel } from "./Readout.tsx";
import type { SkinOf } from "./types.ts";

const CELL = 22;
const PAD = 5;

function TrayView({
  decl,
  value,
  glyph,
  slots,
  cols,
  marks,
}: {
  decl: VarDecl;
  value: number;
  glyph: TokenGlyph;
  slots: number;
  cols: number;
  marks: readonly GaugeMark[];
}) {
  const t = trayLayout(value, slots);
  const rows = Math.ceil(slots / cols);
  const w = cols * CELL + 2 * PAD;
  const h = rows * CELL + 2 * PAD;
  const at = (i: number): [number, number] => [
    PAD + (i % cols) * CELL + CELL / 2,
    PAD + Math.floor(i / cols) * CELL + CELL / 2,
  ];
  const alarms = marks.filter((m) => m.at >= 1 && m.at <= slots);
  const note = value < 0 ? "below empty" : t.more > 0 ? `${t.more} more than the tray shows` : null;
  return (
    <div className="skin__col" data-part="tray">
      <SkinLabel text={decl.label} />
      <svg className="sk-svg sk-svg--tray" viewBox={`0 0 ${w} ${h + 14}`} aria-hidden>
        <rect className="sk-brass" x={0.5} y={0.5} width={w - 1} height={h - 1} rx={4} />
        {Array.from({ length: slots }, (_, i) => {
          const [x, y] = at(i);
          return <circle key={`s${i}`} className="sk-slot" cx={x} cy={y + 7} r={1.4} />;
        })}
        {alarms.map((m) => {
          const [x, y] = at(m.at - 1);
          return (
            <rect
              key={`m${m.at}`}
              className={m.alarm ? "sk-slotmark sk-slotmark--alarm" : "sk-slotmark"}
              x={x - CELL / 2 + 1}
              y={y - CELL / 2 + 1}
              width={CELL - 2}
              height={CELL - 2}
              rx={3}
            />
          );
        })}
        {Array.from({ length: t.shown }, (_, i) => {
          const [x, y] = at(i);
          // Keyed by slot: a new unit mounts (and pops in), a removed one leaves.
          return (
            <g key={`g${i}`} className="sk-pop">
              <Glyph kind={glyph} x={x} y={y} />
            </g>
          );
        })}
        {Array.from({ length: t.ghosts }, (_, i) => {
          const [x, y] = at(i);
          return <Glyph key={`o${i}`} kind={glyph} x={x} y={y} ghost />;
        })}
        {t.more > 0 && (
          <text
            className={value < 0 ? "sk-under-text" : "sk-over"}
            x={w}
            y={h + 11}
            textAnchor="end"
          >
            +{t.more} {value < 0 ? "OWED" : "MORE"}
          </text>
        )}
        {value < 0 && t.more === 0 && (
          <text className="sk-under-text" x={w} y={h + 11} textAnchor="end">
            {-value} OWED
          </text>
        )}
        {alarms.map((m) => (
          <text
            key={`l${m.at}`}
            className={m.alarm ? "sk-alarm-text" : "sk-small"}
            x={0}
            y={h + 11}
          >
            {m.label} AT {m.at}
          </text>
        ))}
      </svg>
      <Readout decl={decl} value={value} note={note} />
    </div>
  );
}

/** One glyph per unit, evenly spaced (never grouped), in a tray per variable. */
export function TokensSkin({ vars, values, panel }: SkinOf<"tokens">) {
  const slots = panel.slots ?? 12;
  const cols = Math.min(slots, panel.cols ?? 4);
  return (
    <div className="skin__cols" data-cols={vars.length}>
      {vars.map((d, i) => (
        <TrayView
          key={d.name}
          decl={d}
          value={values[i] ?? 0}
          glyph={panel.glyph[d.name] ?? "token"}
          slots={slots}
          cols={cols}
          marks={marksOf(panel.marks, d.name)}
        />
      ))}
    </div>
  );
}
