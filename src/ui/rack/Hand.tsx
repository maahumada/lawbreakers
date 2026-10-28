import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { CardId, Level } from "../../engine/level.ts";
import type { HandItem } from "../../game/rack.ts";
import { cardsLeft, itemKey, moduleShape } from "../../game/rack.ts";
import { useRack } from "../../game/rackStore.ts";
import { faceOf } from "./faces.ts";
import { Jacks, Plug } from "./Shapes.tsx";

/** Drop id of the hand tray: a placed module dropped here goes back to the hand. */
export const HAND_DROP_ID = "hand";

interface ChipProps {
  item: HandItem;
  level: Level;
  /** Cards left, or `undefined` for unlimited modules. */
  left?: number;
}

function HandChip({ item, level, left }: ChipProps) {
  const key = itemKey(item);
  const exhausted = left !== undefined && left < 1;
  const selected = useRack((s) => s.selected !== null && itemKey(s.selected) === key);
  const select = useRack((s) => s.select);
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `hand|${key}`,
    data: { source: "hand", item },
    disabled: exhausted,
  });
  const shape = moduleShape(item);
  const { face, caption, name } = faceOf(item, level);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      className={`chip mod mod--${shape.out}`}
      data-dragging={isDragging || undefined}
      aria-pressed={selected}
      disabled={exhausted}
      onClick={() => select(item)}
      data-testid={`hand-${key.replace(":", "-")}`}
      aria-label={`${name}${left === undefined ? "" : `, ${left} left`}`}
    >
      <Jacks types={shape.inputs} />
      <span className="mod__face">{face}</span>
      <span className="mod__caption">{caption}</span>
      {left !== undefined && <span className="chip__count">×{left}</span>}
      <Plug type={shape.out} />
    </button>
  );
}

export function Hand({ level }: { level: Level }) {
  const rack = useRack((s) => s.rack);
  const left = cardsLeft(level.hand, rack);
  const { setNodeRef, isOver, active } = useDroppable({ id: HAND_DROP_ID });
  const returning = active?.data.current?.source === "rack";

  return (
    <div
      ref={setNodeRef}
      className="hand"
      data-returning={returning || undefined}
      data-over={(returning && isOver) || undefined}
      aria-label="Hand"
      role="group"
    >
      <div className="hand__group">
        <span className="hand__label">Sensors &amp; dial</span>
        <div className="hand__row">
          {level.vars.map((x) => (
            <HandChip key={x.name} item={{ kind: "sensor", name: x.name }} level={level} />
          ))}
          <HandChip item={{ kind: "const" }} level={level} />
        </div>
      </div>
      <div className="hand__group">
        <span className="hand__label">Cards</span>
        <div className="hand__row">
          {(Object.keys(level.hand.cards) as CardId[]).map((card) => (
            <HandChip
              key={card}
              item={{ kind: "card", card }}
              level={level}
              left={left[card] ?? 0}
            />
          ))}
        </div>
      </div>
      {returning && <span className="hand__return">Drop here to unplug</span>}
    </div>
  );
}
