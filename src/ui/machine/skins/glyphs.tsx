import type { TokenGlyph } from "../../../engine/display.ts";

/**
 * One counted object, centred on (x, y) inside a 20×20 cell. Shapes are unrelated and the same
 * visual size on purpose: no glyph looks like "two of another" (that would draw a weight).
 */
export function Glyph({
  kind,
  x,
  y,
  ghost = false,
}: {
  kind: TokenGlyph;
  x: number;
  y: number;
  ghost?: boolean;
}) {
  const cls = ghost ? "sk-ghost" : "sk-tok";
  switch (kind) {
    case "pin":
      return <rect className={cls} x={x - 3.5} y={y - 9} width={7} height={18} rx={3.5} />;
    case "core":
      return (
        <polygon
          className={cls}
          points={[0, 60, 120, 180, 240, 300]
            .map(
              (a) =>
                `${x + 8 * Math.cos(((a + 30) * Math.PI) / 180)},${y + 8 * Math.sin(((a + 30) * Math.PI) / 180)}`,
            )
            .join(" ")}
        />
      );
    case "fragment":
      return (
        <polygon className={cls} points={`${x},${y - 8} ${x + 8},${y + 7} ${x - 8},${y + 7}`} />
      );
    case "reader":
      return (
        <g className={cls}>
          <circle cx={x} cy={y - 4.5} r={3.6} />
          <path d={`M${x - 6.5} ${y + 8} q 0 -8 6.5 -8 q 6.5 0 6.5 8 z`} />
        </g>
      );
    case "badge":
      return <path className={cls} d={`M${x - 7} ${y - 8} h 14 v 7 q 0 7 -7 9 q -7 -2 -7 -9 z`} />;
    case "token":
      return <circle className={`${cls} sk-tok--ring`} cx={x} cy={y} r={6} />;
    case "crate":
      return (
        <g className={cls}>
          <rect x={x - 8} y={y - 8} width={16} height={16} />
          <path className="sk-tok__line" d={`M${x - 8} ${y - 8} L${x + 8} ${y + 8}`} />
        </g>
      );
    case "barrel":
      return (
        <g className={cls}>
          <rect x={x - 6.5} y={y - 8.5} width={13} height={17} rx={4} />
          <path
            className="sk-tok__line"
            d={`M${x - 6.5} ${y - 3} h 13 M${x - 6.5} ${y + 3} h 13`}
          />
        </g>
      );
    case "coin":
      return (
        <g className={cls}>
          <ellipse cx={x} cy={y} rx={8} ry={8} />
          <ellipse className="sk-tok__line" cx={x} cy={y} rx={4.5} ry={4.5} />
        </g>
      );
  }
}
