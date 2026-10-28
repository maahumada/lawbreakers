import type { ExprType } from "../../engine/expr.ts";

/** Output plug: round = number, square = signal. */
export function Plug({ type }: { type: ExprType }) {
  return <span className={`plug plug--${type}`} aria-hidden />;
}

/** Input jacks down the left edge, spaced like `jackY` in layout.ts. */
export function Jacks({ types }: { types: readonly ExprType[] }) {
  return (
    <>
      {types.map((t, i) => (
        <span
          key={i}
          className={`jack jack--${t}`}
          style={{ top: `${(100 * (i + 1)) / (types.length + 1)}%` }}
          aria-hidden
        />
      ))}
    </>
  );
}
