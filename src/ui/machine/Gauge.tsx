import type { VarDecl } from "../../engine/level.ts";

interface GaugeProps {
  decl: VarDecl;
  value: number;
  /** Full-scale reading of the bar (shared by every gauge so they compare at a glance). */
  scale: number;
}

const MIN_DIGITS = 2;

export function Gauge({ decl, value, scale }: GaugeProps) {
  const digits = String(Math.abs(value)).padStart(MIN_DIGITS, "0").split("");
  const signed = decl.domain === "int";
  const fraction = Math.min(1, Math.abs(value) / scale);
  // int gauges are centred on zero; nat gauges fill from the left.
  const fill = signed
    ? { left: value < 0 ? `${50 - fraction * 50}%` : "50%", width: `${fraction * 50}%` }
    : { left: "0%", width: `${fraction * 100}%` };

  return (
    <figure className="gauge" data-testid={`gauge-${decl.name}`} data-value={value}>
      <figcaption className="gauge__label">
        <span className="gauge__name">{decl.label}</span>
        <span className="gauge__var">{decl.name}</span>
      </figcaption>
      <div className="gauge__tubes" aria-label={`${decl.label} reads ${value}`} role="img">
        {signed && (
          <span className="tube tube--sign" aria-hidden>
            {value < 0 ? "−" : "+"}
          </span>
        )}
        {digits.map((d, i) => (
          // Re-keying on the digit restarts the strike animation when it changes.
          <span key={`${i}-${d}`} className="tube" aria-hidden>
            {d}
          </span>
        ))}
      </div>
      <div className={`gauge__bar ${signed ? "gauge__bar--signed" : ""}`} aria-hidden>
        <span className="gauge__fill" style={fill} />
      </div>
      <div className="gauge__scale" aria-hidden data-testid={`gauge-scale-${decl.name}`}>
        <span>{signed ? `−${scale}` : "0"}</span>
        {signed && <span>0</span>}
        <span>{scale}</span>
      </div>
    </figure>
  );
}
