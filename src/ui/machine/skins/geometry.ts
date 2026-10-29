// Pure geometry for the gauge skins (no React), unit-tested in tests/skinGeometry.test.ts.
// Every function is honest about values outside the drawable range: it clamps the picture and
// reports how far out the value is, so the skin can say so (rule 6 of docs/GAUGES-PROPOSAL.md).

export interface Fill {
  /** Drawn fraction of the full height, in [0, 1]. */
  frac: number;
  /** Units above full (0 if none). */
  over: number;
  /** Units below zero, as a positive number (0 if none). */
  under: number;
}

export function fillFraction(value: number, full: number): Fill {
  const f = full > 0 ? value / full : 0;
  return {
    frac: Math.min(1, Math.max(0, f)),
    over: Math.max(0, value - full),
    under: Math.max(0, -value),
  };
}

/** Units per tick: one per unit up to a full scale of 20, else a tenth of the full scale. */
export function tickStep(full: number): number {
  return full <= 20 ? 1 : full / 10;
}

/**
 * Every major tick is this many ticks apart. Five is a multiple of no modulus a mission uses
 * (2, 3), so the emphasis never groups readings the way a parity or "multiple of 3" Law would.
 */
export const MAJOR_EVERY = 5;

export interface Tick {
  at: number;
  major: boolean;
}

/** Uniform ticks strictly between 0 and `full`. */
export function ticks(full: number): Tick[] {
  const step = tickStep(full);
  const out: Tick[] = [];
  for (let i = 1; i * step < full; i++) out.push({ at: i * step, major: i % MAJOR_EVERY === 0 });
  return out;
}

/** Dial sweep: printed notches `min…max`, two unprinted units on each side, 240° of arc. */
export const DIAL_START_DEG = 150;
export const DIAL_SWEEP_DEG = 240;
export const DIAL_MARGIN = 2;

export interface Needle {
  /** Clockwise SVG angle (0° = +x, 90° = down). */
  deg: number;
  /** Past the drawn range: the needle rests on the stop. */
  pegged: "low" | "high" | null;
}

export function needleAngle(value: number, min: number, max: number): Needle {
  const lo = min - DIAL_MARGIN;
  const hi = max + DIAL_MARGIN;
  const t = Math.min(hi, Math.max(lo, value));
  return {
    deg: DIAL_START_DEG + ((t - lo) / (hi - lo)) * DIAL_SWEEP_DEG,
    pegged: value > hi ? "high" : value < lo ? "low" : null,
  };
}

export interface Clamped {
  x: number;
  y: number;
  /** −1 / +1 when the value lies past that edge of the frame, 0 inside. */
  outX: -1 | 0 | 1;
  outY: -1 | 0 | 1;
}

/** Clamp a point to the frame `[lo, hi]²` (in value units). */
export function clampToFrame(x: number, y: number, lo: number, hi: number): Clamped {
  const side = (v: number): -1 | 0 | 1 => (v < lo ? -1 : v > hi ? 1 : 0);
  const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
  return { x: clamp(x), y: clamp(y), outX: side(x), outY: side(y) };
}

/** Opacity of trail dot `i` of `n` (oldest first): faint to nearly solid, the head is 1. */
export function trailOpacity(i: number, n: number): number {
  if (n <= 1) return 1;
  return 0.15 + (0.7 * i) / (n - 1);
}

export interface Tray {
  /** Glyphs drawn (value ≥ 0). */
  shown: number;
  /** Red dashed "owed" glyphs (value < 0). */
  ghosts: number;
  /** Count beyond the tray, for the `+k MORE` / `+k OWED` badge. */
  more: number;
}

export function trayLayout(value: number, slots: number): Tray {
  const n = Math.abs(value);
  const drawn = Math.min(n, slots);
  return value >= 0
    ? { shown: drawn, ghosts: 0, more: n - drawn }
    : { shown: 0, ghosts: drawn, more: n - drawn };
}

/** Screen-reader text for a reading, with out-of-range words when the picture cannot show it. */
export function readingLabel(label: string, value: number, note?: string | null): string {
  return `${label} reads ${value}${note ? `, ${note}` : ""}`;
}
