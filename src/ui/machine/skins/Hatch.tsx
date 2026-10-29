/** Red diagonal hatch for "below empty" / "past the stop" blocks. */
export function Hatch({ id }: { id: string }) {
  return (
    <pattern
      id={id}
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <line className="sk-hatch-line" x1="0" y1="0" x2="0" y2="6" />
    </pattern>
  );
}
