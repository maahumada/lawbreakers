import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import type { Level } from "../../engine/level.ts";
import type { HandItem, RackNode, SlotPath } from "../../game/rack.ts";
import {
  canPlace,
  isWithin,
  moduleShape,
  nodeAt,
  parsePathKey,
  slotType,
} from "../../game/rack.ts";
import { useRack } from "../../game/rackStore.ts";
import { faceOf } from "./faces.ts";
import { Hand, HAND_DROP_ID } from "./Hand.tsx";
import { layoutRack, METRICS, METRICS_COMPACT } from "./layout.ts";
import type { Accepts } from "./RackBoard.tsx";
import { RackBoard } from "./RackBoard.tsx";
import { Readout } from "./Readout.tsx";
import { Jacks, Plug } from "./Shapes.tsx";
import { useCompact } from "./useCompact.ts";
import "./rack.css";

type Dragging =
  { source: "hand"; item: HandItem } | { source: "rack"; path: SlotPath; node: RackNode };

function DragGhost({ dragging, level }: { dragging: Dragging; level: Level }) {
  const mod = dragging.source === "hand" ? dragging.item : dragging.node.mod;
  const shape = moduleShape(mod);
  const { face, caption } = faceOf(mod, level);
  return (
    <div className={`ghost mod mod--${shape.out}`}>
      <Jacks types={shape.inputs} />
      <span className="mod__face">{face}</span>
      <span className="mod__caption">{caption}</span>
      <Plug type={shape.out} />
    </div>
  );
}

export function RackEditor({ level }: { level: Level }) {
  const rack = useRack((s) => s.rack);
  const selected = useRack((s) => s.selected);
  const live = useRack((s) => s.law !== null);
  const { place, move, remove, select, clear } = useRack.getState();
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const compact = useCompact();
  const metrics = compact ? METRICS_COMPACT : METRICS;
  const layout = layoutRack(rack, metrics);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, select]);

  const accepts: Accepts = (path) => {
    if (dragging?.source === "rack") {
      const out = moduleShape(dragging.node.mod).out;
      return !isWithin(path, dragging.path) && !nodeAt(rack, path) && slotType(rack, path) === out;
    }
    const item = dragging?.item ?? selected;
    return item ? canPlace(level, rack, path, item) === "ok" : undefined;
  };

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as Dragging | undefined;
    if (data) setDragging(data);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const data = dragging;
    setDragging(null);
    const overId = e.over?.id;
    if (!data || typeof overId !== "string") return;
    if (overId === HAND_DROP_ID) {
      if (data.source === "rack") remove(data.path);
      return;
    }
    const to = overId.startsWith("slot|") ? parsePathKey(overId.slice(5)) : null;
    if (!to) return;
    if (data.source === "hand") place(to, data.item);
    else move(data.path, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="rack panel" data-testid="rack">
        <div className="panel__bar">
          <h2 className="panel__title">Law engine rack</h2>
          <button
            type="button"
            className="btn-reset"
            onClick={clear}
            disabled={rack === null}
            data-testid="rack-clear"
          >
            Clear
          </button>
        </div>
        <Hand level={level} />
        <p className="rack__hint" aria-live="polite">
          {selected
            ? `Plug ${faceOf(selected, level).face} into a lit ${
                moduleShape(selected).out === "num" ? "round" : "square"
              } socket. Esc to cancel.`
            : "Pick a module, then a socket. Or drag it in."}
        </p>
        <RackBoard level={level} layout={layout} metrics={metrics} live={live} accepts={accepts} />
        <Readout level={level} />
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && <DragGhost dragging={dragging} level={level} />}
      </DragOverlay>
    </DndContext>
  );
}
