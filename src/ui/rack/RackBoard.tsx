import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { SyntheticEvent } from "react";
import type { Level } from "../../engine/level.ts";
import type { RackNode, SlotPath } from "../../game/rack.ts";
import { moduleShape, pathKey } from "../../game/rack.ts";
import type { EngagePhase } from "../../game/engageStore.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useRack } from "../../game/rackStore.ts";
import { Dial } from "./Dial.tsx";
import { faceOf, typeWord } from "./faces.ts";
import type { RackLayout, RackMetrics, SlotCell } from "./layout.ts";
import { wirePath } from "./layout.ts";
import { Jacks, Plug } from "./Shapes.tsx";

/** Whether an empty socket would take what is being placed right now (`undefined`: nothing is). */
export type Accepts = (path: SlotPath) => boolean | undefined;

const stop = (e: SyntheticEvent) => e.stopPropagation();

function EmptySocket({ cell, accepts }: { cell: SlotCell; accepts: Accepts }) {
  const key = pathKey(cell.path);
  const ok = accepts(cell.path);
  const place = useRack((s) => s.place);
  // A socket that rejects the dragged module is disabled, so dnd-kit can never drop there.
  const { setNodeRef, isOver } = useDroppable({ id: `slot|${key}`, disabled: ok !== true });
  const where = cell.path.length === 0 ? "SHIELD socket" : `${typeWord(cell.type)} socket`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`socket socket--${cell.type}`}
      data-accept={ok === undefined ? undefined : ok ? "yes" : "no"}
      data-over={isOver || undefined}
      aria-disabled={ok !== true}
      aria-label={`Empty ${where}${ok === false ? ", does not fit" : ""}`}
      onClick={() => ok && place(cell.path)}
      data-testid={`slot-${key}`}
    >
      <span className={`socket__hole socket__hole--${cell.type}`} aria-hidden />
      <span className="socket__word">{typeWord(cell.type)}</span>
    </button>
  );
}

function PlacedModule({ node, path, level }: { node: RackNode; path: SlotPath; level: Level }) {
  const key = pathKey(path);
  const { remove, setConst } = useRack.getState();
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `node|${key}`,
    data: { source: "rack", path, node },
  });
  const shape = moduleShape(node.mod);
  const { face, caption, name } = faceOf(node.mod, level);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={`placed mod mod--${shape.out}`}
      data-dragging={isDragging || undefined}
      data-testid={`module-${key}`}
      role="group"
      aria-label={name}
    >
      <Jacks types={shape.inputs} />
      {node.mod.kind === "const" ? (
        <Dial value={node.mod.value} onChange={(v) => setConst(path, v)} testId={`dial-${key}`} />
      ) : (
        <span className="mod__face">{face}</span>
      )}
      <span className="mod__caption">{caption}</span>
      <button
        type="button"
        className="placed__remove"
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={() => remove(path)}
        aria-label={`Unplug ${name}`}
        data-testid={`remove-${key}`}
      >
        ×
      </button>
      <Plug type={shape.out} />
    </div>
  );
}

interface BoardProps {
  level: Level;
  layout: RackLayout;
  metrics: RackMetrics;
  live: boolean;
  accepts: Accepts;
}

type ShieldState = "scanning" | "breached" | "sealed";

const SHIELD_TEXT: Record<ShieldState, string> = {
  scanning: "Under attack",
  breached: "Breached",
  sealed: "Sealed",
};

function shieldState(phase: EngagePhase, holds: boolean | null): ShieldState | undefined {
  if (phase === "attacking" || phase === "replaying") return "scanning";
  if (phase === "idle" || holds === null) return undefined;
  return holds ? "sealed" : "breached";
}

export function RackBoard({ level, layout, metrics: m, live, accepts }: BoardProps) {
  const { shield } = layout;
  const verdictState = useEngage((s) =>
    shieldState(s.phase, s.verdict ? s.verdict.kind === "holds" : null),
  );
  return (
    <div
      className="board"
      data-live={live || undefined}
      data-shield={verdictState}
      data-testid="rack-board"
    >
      <div className="board__canvas" style={{ width: layout.width, height: layout.height }}>
        <svg
          className="board__wires"
          width={layout.width}
          height={layout.height}
          aria-hidden
          focusable="false"
        >
          {layout.wires.map((w) => (
            <g
              key={pathKey(w.path)}
              className={`wire wire--${w.type}`}
              data-plugged={w.plugged || undefined}
            >
              <path className="wire__glow" d={wirePath(w.from, w.to)} />
              <path className="wire__core" d={wirePath(w.from, w.to)} />
              {live && <path className="wire__current" d={wirePath(w.from, w.to)} />}
            </g>
          ))}
        </svg>

        {layout.cells.map((cell) => (
          <div
            key={cell.node ? `n${cell.node.id}` : `s${pathKey(cell.path)}`}
            className="board__cell"
            style={{ left: cell.x, top: cell.y, width: m.cellW, height: m.cellH }}
          >
            {cell.node ? (
              <PlacedModule node={cell.node} path={cell.path} level={level} />
            ) : (
              <EmptySocket cell={cell} accepts={accepts} />
            )}
          </div>
        ))}

        <div
          className="shield"
          style={{ left: shield.x, top: shield.y, width: shield.w, height: shield.h }}
          data-testid="shield"
        >
          <span className="jack jack--bool" style={{ top: shield.jack.y - shield.y }} aria-hidden />
          <span className="shield__lamp" aria-hidden />
          <span className="shield__name">Shield</span>
          <span className="shield__state" data-testid="shield-state">
            {verdictState ? SHIELD_TEXT[verdictState] : live ? "Closed" : "Open"}
          </span>
          {verdictState === "breached" && (
            <span className="shield__sparks" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="spark" />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
