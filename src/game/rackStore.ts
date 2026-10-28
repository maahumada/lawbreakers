// Rack editor state: the partial Law tree for the current mission, the hand selection used by
// click-to-place, and the derived `law` / `cost` that ENGAGE (M2-T4) reads.

import { create } from "zustand";
import type { BoolExpr } from "../engine/expr.ts";
import type { Level } from "../engine/level.ts";
import type { HandItem, Rack, SlotPath } from "./rack.ts";
import {
  canPlace,
  itemKey,
  moveTo,
  placeAt,
  rackCost,
  rackToLaw,
  removeAt,
  setConstAt,
} from "./rack.ts";

interface RackStore {
  level: Level | null;
  rack: Rack;
  /** Hand item picked for click-to-place, if any. */
  selected: HandItem | null;
  /** The complete Law, or `null` while any socket is empty. */
  law: BoolExpr | null;
  /** Modules in the rack (equals `size(law)` once complete). May exceed the budget. */
  cost: number;
  /** Empty rack for `level` (called whenever the mission changes). */
  reset: (level: Level) => void;
  clear: () => void;
  /** Pick a hand item for click-to-place; picking the selected item again drops it. */
  select: (item: HandItem | null) => void;
  /** Plug `item` (default: the selection) into an empty socket. Returns false if not allowed. */
  place: (path: SlotPath, item?: HandItem) => boolean;
  remove: (path: SlotPath) => void;
  move: (from: SlotPath, to: SlotPath) => void;
  setConst: (path: SlotPath, value: number) => void;
}

const derive = (rack: Rack) => ({ rack, law: rackToLaw(rack), cost: rackCost(rack) });

export const useRack = create<RackStore>()((set, get) => ({
  level: null,
  rack: null,
  selected: null,
  law: null,
  cost: 0,
  reset: (level) => set({ level, selected: null, ...derive(null) }),
  clear: () => set({ selected: null, ...derive(null) }),
  select: (item) => {
    const { selected } = get();
    const same = item !== null && selected !== null && itemKey(item) === itemKey(selected);
    set({ selected: same ? null : item });
  },
  place: (path, item) => {
    const { level, rack, selected } = get();
    const what = item ?? selected;
    if (!level || !what || canPlace(level, rack, path, what) !== "ok") return false;
    set({ selected: null, ...derive(placeAt(level, rack, path, what)) });
    return true;
  },
  remove: (path) => set(derive(removeAt(get().rack, path))),
  move: (from, to) => set(derive(moveTo(get().rack, from, to))),
  setConst: (path, value) => set(derive(setConstAt(get().rack, path, value))),
}));
