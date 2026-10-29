import type { VarDecl } from "../../../engine/level.ts";
import { readingLabel } from "./geometry.ts";

const MIN_DIGITS = 2;

/**
 * The exact numeral every skin keeps (rule 5): small nixie tubes and the variable name. Carries
 * the gauge's test hooks and its accessible name, with out-of-range words in `note`.
 */
export function Readout({
  decl,
  value,
  note = null,
}: {
  decl: VarDecl;
  value: number;
  note?: string | null;
}) {
  const digits = String(Math.abs(value)).padStart(MIN_DIGITS, "0").split("");
  const signed = decl.domain === "int" || value < 0;
  return (
    <div
      className="readout"
      data-testid={`gauge-${decl.name}`}
      data-value={value}
      data-note={note ?? undefined}
      role="img"
      aria-label={readingLabel(decl.label, value, note)}
    >
      <span className="readout__tubes" aria-hidden>
        {signed && <span className="tube tube--sm tube--sign">{value < 0 ? "−" : "+"}</span>}
        {digits.map((d, i) => (
          // Re-keying on the digit restarts the strike animation when it changes.
          <span key={`${i}-${d}`} className="tube tube--sm">
            {d}
          </span>
        ))}
      </span>
      <span className="readout__var" aria-hidden>
        {decl.name}
      </span>
    </div>
  );
}

/** Column header of a skin (the accessible name lives on the readout). */
export function SkinLabel({ text }: { text: string }) {
  return (
    <span className="skin__label" aria-hidden>
      {text}
    </span>
  );
}
