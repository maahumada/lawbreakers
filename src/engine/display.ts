// How a level's gauges are drawn: an optional `display` block in the level JSON, a list of panels,
// each a skin over one or more variables. Pure data (no DOM): the UI picks a component per skin,
// the verifier never reads it. Absent → one `nixie` panel per variable (the original gauges).
// Design rules and the per-mission mapping: docs/GAUGES-PROPOSAL.md.

import { z } from "zod";

const nonEmpty = z.string().min(1);
const varName = z.string().min(1);

/**
 * A printed mark on a gauge, backed by a public fact (meltdown placard, guard, briefing).
 * `alarm` marks are the meltdown's own thresholds; a test checks that the meltdown flips there.
 */
const mark = z.strictObject({
  at: z.int(),
  label: nonEmpty,
  alarm: z.boolean().optional(),
});

/** Marks per variable of the panel. */
const marks = z.record(varName, z.array(mark).min(1)).optional();

/** Glyphs for the `tokens` skin. Shapes are unrelated on purpose (no glyph is "two of another"). */
export const TOKEN_GLYPHS = [
  "pin",
  "core",
  "fragment",
  "reader",
  "badge",
  "token",
  "crate",
  "barrel",
  "coin",
] as const;
export type TokenGlyph = (typeof TOKEN_GLYPHS)[number];

const one = z.array(varName).length(1);
const two = z.array(varName).length(2);
const upTo3 = z.array(varName).min(1).max(3);

export const rawPanelSchema = z.discriminatedUnion("skin", [
  /** Nixie tubes + bar on the shared scale (the original gauge). */
  z.strictObject({ skin: z.literal("nixie"), vars: one }),
  /** Vertical column of liquid/charge on the shared scale. */
  z.strictObject({ skin: z.literal("tank"), vars: upTo3, marks }),
  /** A bottle whose rim is a fixed capacity (one-unit ticks only). */
  z.strictObject({
    skin: z.literal("jug"),
    vars: upTo3,
    capacity: z.record(varName, z.int().positive()),
    marks,
  }),
  /** Needle over printed notches `min…max`; anything past them is an unprinted (dashed) zone. */
  z.strictObject({ skin: z.literal("dial"), vars: one, min: z.int(), max: z.int(), marks }),
  /** Cylinders with rods on one ruler (one unit length for every piston of the panel). */
  z.strictObject({ skin: z.literal("piston"), vars: upTo3, marks }),
  /** One glyph per unit in a tray of `slots`, `+k MORE` beyond. */
  z.strictObject({
    skin: z.literal("tokens"),
    vars: upTo3,
    glyph: z.record(varName, z.enum(TOKEN_GLYPHS)),
    slots: z.int().min(4).max(24).optional(),
    cols: z.int().min(2).max(24).optional(),
    marks,
  }),
  /** A rotary switch with named positions; any other value lights an unlabelled `?` notch. */
  z.strictObject({
    skin: z.literal("selector"),
    vars: one,
    positions: z.record(z.string().regex(/^-?\d+$/, "must be an integer"), nonEmpty),
  }),
  /** Phosphor dot at (x, y) with a short fading trail of real (logged) states. */
  z.strictObject({
    skin: z.literal("scope"),
    vars: two,
    trail: z.int().min(0).max(12),
    /** Meltdown points from the placard, drawn as red crosses. */
    alarms: z.array(z.strictObject({ at: z.tuple([z.int(), z.int()]) })).optional(),
  }),
  /** A deck on two jacks; the tilt is the difference (left − right) the meltdown is about. */
  z.strictObject({
    skin: z.literal("deck"),
    vars: two,
    tipAt: z.int().positive(),
    label: nonEmpty,
  }),
  /** Cable drum (first var: cable paid out) + a rack of counterweight blocks (second var). */
  z.strictObject({ skin: z.literal("hoist"), vars: two, marks }),
  /** Three coils around a rotor, one count each; the rotor spins only as fire feedback. */
  z.strictObject({ skin: z.literal("rotor"), vars: z.array(varName).length(3) }),
]);

export const rawDisplaySchema = z.strictObject({ panels: z.array(rawPanelSchema).min(1) });

export type DisplayPanel = z.infer<typeof rawPanelSchema>;
export type SkinId = DisplayPanel["skin"];
export type PanelOf<S extends SkinId> = Extract<DisplayPanel, { skin: S }>;
export type GaugeMark = z.infer<typeof mark>;

export interface DisplaySpec {
  panels: DisplayPanel[];
}

/** Today's gauges: one nixie panel per variable. */
export function defaultDisplay(vars: readonly { name: string }[]): DisplaySpec {
  return { panels: vars.map((x) => ({ skin: "nixie", vars: [x.name] })) };
}

/** Keys of a per-variable record that are not variables of the panel. */
function strayKeys(rec: Record<string, unknown> | undefined, vars: readonly string[]): string[] {
  return Object.keys(rec ?? {}).filter((k) => !vars.includes(k));
}

/**
 * Static checks the schema cannot express: every declared variable sits in exactly one panel,
 * per-variable params only name panel variables, and required per-variable params are complete.
 */
export function displayIssues(spec: DisplaySpec, declared: readonly string[]): string[] {
  const issues: string[] = [];
  const seen = new Map<string, number>();
  spec.panels.forEach((p, i) => {
    const where = `display.panels[${i}] (${p.skin})`;
    for (const v of p.vars) {
      if (!declared.includes(v)) issues.push(`${where}: unknown variable '${v}'`);
      seen.set(v, (seen.get(v) ?? 0) + 1);
    }
    if ("marks" in p) {
      for (const k of strayKeys(p.marks, p.vars))
        issues.push(`${where}.marks: '${k}' not in panel`);
    }
    if (p.skin === "jug") {
      for (const k of strayKeys(p.capacity, p.vars))
        issues.push(`${where}.capacity: '${k}' not in panel`);
      for (const v of p.vars)
        if (p.capacity[v] === undefined) issues.push(`${where}.capacity: missing '${v}'`);
    }
    if (p.skin === "tokens") {
      for (const k of strayKeys(p.glyph, p.vars))
        issues.push(`${where}.glyph: '${k}' not in panel`);
      for (const v of p.vars)
        if (p.glyph[v] === undefined) issues.push(`${where}.glyph: missing '${v}'`);
    }
    if (p.skin === "dial" && p.min >= p.max) issues.push(`${where}: min must be below max`);
    if (p.skin === "selector" && Object.keys(p.positions).length === 0)
      issues.push(`${where}: needs at least one position`);
  });
  for (const v of declared) {
    const n = seen.get(v) ?? 0;
    if (n !== 1) issues.push(`display: variable '${v}' appears in ${n} panels (must be exactly 1)`);
  }
  return issues;
}
