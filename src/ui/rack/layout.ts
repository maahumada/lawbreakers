// Rack layout: places every socket of the partial tree on a grid that flows left to right into
// the SHIELD. Pure (no React/DOM) so it can be unit-tested. Leaves (and empty sockets) take one row
// each; a module sits vertically centred on its inputs; columns are tree depths, deepest leftmost.

import type { ExprType } from "../../engine/expr.ts";
import type { Rack, RackNode, SlotPath } from "../../game/rack.ts";
import { moduleShape } from "../../game/rack.ts";

export interface RackMetrics {
  /** Module plate size. */
  cellW: number;
  cellH: number;
  /** Horizontal room for wires between columns. */
  gapX: number;
  /** Vertical distance between rows (≥ cellH). */
  rowH: number;
  shieldW: number;
  pad: number;
}

export const METRICS: RackMetrics = {
  cellW: 132,
  cellH: 58,
  gapX: 44,
  rowH: 72,
  shieldW: 92,
  pad: 16,
};

export const METRICS_COMPACT: RackMetrics = {
  cellW: 86,
  cellH: 52,
  gapX: 22,
  rowH: 62,
  shieldW: 62,
  pad: 10,
};

export interface Point {
  x: number;
  y: number;
}

export interface SlotCell {
  path: SlotPath;
  /** Type the socket accepts. */
  type: ExprType;
  node: RackNode | null;
  x: number;
  y: number;
}

export interface Wire {
  /** Path of the socket whose content the wire carries. */
  path: SlotPath;
  type: ExprType;
  from: Point;
  to: Point;
  /** False when the socket is empty (drawn as a dim stub). */
  plugged: boolean;
}

export interface RackLayout {
  cells: SlotCell[];
  wires: Wire[];
  shield: { x: number; y: number; w: number; h: number; jack: Point };
  width: number;
  height: number;
}

function depth(n: Rack): number {
  if (!n || n.inputs.length === 0) return 0;
  return 1 + Math.max(...n.inputs.map(depth));
}

/** Jack position on the left edge of a plate, for input `i` of `count`. */
export function jackY(top: number, h: number, i: number, count: number): number {
  return top + (h * (i + 1)) / (count + 1);
}

export function layoutRack(rack: Rack, m: RackMetrics = METRICS): RackLayout {
  const maxDepth = depth(rack);
  const colW = m.cellW + m.gapX;
  const cells: SlotCell[] = [];
  const wires: Wire[] = [];
  let row = 0;

  const place = (node: RackNode | null, path: SlotPath, type: ExprType): SlotCell => {
    const x = m.pad + (maxDepth - path.length) * colW;
    const shape = node ? moduleShape(node.mod) : null;
    const children = (node?.inputs ?? []).map((child, i) =>
      place(child, [...path, i], shape?.inputs[i] ?? "num"),
    );
    const first = children[0];
    const last = children.at(-1);
    let y: number;
    if (first && last) {
      y = (first.y + last.y) / 2;
    } else {
      y = m.pad + row * m.rowH;
      row += 1;
    }
    const cell: SlotCell = { path, type, node, x, y };
    cells.push(cell);
    children.forEach((child, i) => {
      wires.push({
        path: child.path,
        type: child.type,
        from: { x: child.x + m.cellW, y: child.y + m.cellH / 2 },
        to: { x, y: jackY(y, m.cellH, i, children.length) },
        plugged: child.node !== null,
      });
    });
    return cell;
  };

  const rootCentre = place(rack, [], "bool").y + m.cellH / 2;
  const rows = Math.max(row, 1);
  const contentH = (rows - 1) * m.rowH + m.cellH;
  const shieldH = Math.max(m.cellH + 24, Math.min(contentH, 120));
  const shieldX = m.pad + (maxDepth + 1) * colW;
  const shieldTop = Math.max(m.pad, rootCentre - shieldH / 2);
  const jack = { x: shieldX, y: rootCentre };
  wires.push({
    path: [],
    type: "bool",
    from: { x: m.pad + maxDepth * colW + m.cellW, y: rootCentre },
    to: jack,
    plugged: rack !== null,
  });

  return {
    cells,
    wires,
    shield: { x: shieldX, y: shieldTop, w: m.shieldW, h: shieldH, jack },
    width: shieldX + m.shieldW + m.pad,
    height: Math.max(m.pad * 2 + contentH, shieldTop + shieldH + m.pad),
  };
}

/** Horizontal cubic Bézier between a plug and a jack. */
export function wirePath(from: Point, to: Point): string {
  const dx = Math.max(16, (to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}
