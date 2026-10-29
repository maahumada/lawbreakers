import { describe, expect, it } from "vitest";
import { defaultDisplay, displayIssues, rawDisplaySchema } from "../src/engine/display.ts";
import type { State } from "../src/engine/expr.ts";
import { evalBool } from "../src/engine/expr.ts";
import type { Level } from "../src/engine/level.ts";
import { initialState, LevelError, loadBundledLevels, loadLevel } from "../src/engine/level.ts";
import malformed from "./fixtures/malformed-level.json";

const levels = loadBundledLevels();

/** A valid two-variable level to graft a `display` onto. */
const base = {
  ...malformed,
  vars: [
    { name: "x", label: "X", domain: "nat", init: 0 },
    { name: "y", label: "Y", domain: "int", init: 0 },
  ],
  controls: [{ id: "up", label: "UP", guard: "true", update: { x: "x + 1" } }],
  meltdown: "x = 5",
  solutions: ["x >= 0"],
  knownWrong: [],
};

const issuesOf = (display: unknown): string[] => {
  try {
    loadLevel({ ...base, display });
  } catch (e) {
    if (e instanceof LevelError) return e.issues;
    throw e;
  }
  return [];
};

describe("display schema", () => {
  it("defaults to one nixie panel per variable", () => {
    const level = loadLevel(base);
    expect(level.display).toEqual({
      panels: [
        { skin: "nixie", vars: ["x"] },
        { skin: "nixie", vars: ["y"] },
      ],
    });
    expect(defaultDisplay(base.vars)).toEqual(level.display);
  });

  it("accepts a valid display", () => {
    expect(issuesOf({ panels: [{ skin: "piston", vars: ["x", "y"] }] })).toEqual([]);
    expect(
      issuesOf({
        panels: [{ skin: "scope", vars: ["x", "y"], trail: 6, alarms: [{ at: [5, 0] }] }],
      }),
    ).toEqual([]);
  });

  it("requires every variable in exactly one panel", () => {
    expect(issuesOf({ panels: [{ skin: "tank", vars: ["x"] }] })).toEqual([
      "display: variable 'y' appears in 0 panels (must be exactly 1)",
    ]);
    expect(
      issuesOf({
        panels: [
          { skin: "tank", vars: ["x", "y"] },
          { skin: "nixie", vars: ["y"] },
        ],
      }),
    ).toEqual(["display: variable 'y' appears in 2 panels (must be exactly 1)"]);
  });

  it("rejects unknown variables, stray params and missing per-variable params", () => {
    const issues = issuesOf({
      panels: [
        { skin: "tank", vars: ["x"], marks: { z: [{ at: 1, label: "Z" }] } },
        { skin: "jug", vars: ["y", "q"], capacity: { q: 3 } },
      ],
    });
    expect(issues).toContain("display.panels[0] (tank).marks: 'z' not in panel");
    expect(issues).toContain("display.panels[1] (jug): unknown variable 'q'");
    expect(issues).toContain("display.panels[1] (jug).capacity: missing 'y'");
  });

  it("checks per-skin arity and parameters", () => {
    expect(issuesOf({ panels: [{ skin: "scope", vars: ["x"], trail: 3 }] }).length).toBeGreaterThan(
      0,
    );
    expect(issuesOf({ panels: [{ skin: "rotor", vars: ["x", "y"] }] }).length).toBeGreaterThan(0);
    expect(issuesOf({ panels: [{ skin: "nixie", vars: ["x", "y"] }] }).length).toBeGreaterThan(0);
    expect(
      issuesOf({
        panels: [
          { skin: "dial", vars: ["x"], min: 5, max: 5 },
          { skin: "nixie", vars: ["y"] },
        ],
      }),
    ).toEqual(["display.panels[0] (dial): min must be below max"]);
    expect(
      issuesOf({ panels: [{ skin: "tokens", vars: ["x", "y"], glyph: { x: "pin", y: "dragon" } }] })
        .length,
    ).toBeGreaterThan(0);
    expect(
      issuesOf({ panels: [{ skin: "warp", vars: ["x", "y"] }] }).some((i) =>
        i.startsWith("display"),
      ),
    ).toBe(true);
    expect(rawDisplaySchema.safeParse({ panels: [] }).success).toBe(false);
  });

  it("is a pure UI concern: the display never changes the parsed rules", () => {
    const plain = loadLevel(base);
    const skinned = loadLevel({
      ...base,
      display: { panels: [{ skin: "piston", vars: ["x", "y"] }] },
    });
    expect({ ...skinned, display: plain.display }).toEqual(plain);
  });
});

describe("bundled displays", () => {
  it("every mission has an authored display that passes the static checks", () => {
    for (const level of levels) {
      expect(level.display.panels.length, level.id).toBeGreaterThan(0);
      expect(
        displayIssues(
          level.display,
          level.vars.map((x) => x.name),
        ),
        level.id,
      ).toEqual([]);
    }
  });

  /** `level`'s power-on state with some variables replaced. */
  const at = (level: Level, over: State): State => ({ ...initialState(level), ...over });

  it("every alarm mark sits exactly where the meltdown flips (public facts only)", () => {
    let checked = 0;
    for (const level of levels) {
      for (const panel of level.display.panels) {
        if (!("marks" in panel) || !panel.marks) continue;
        for (const [name, marks] of Object.entries(panel.marks)) {
          for (const m of marks.filter((k) => k.alarm)) {
            const init = initialState(level)[name] ?? 0;
            const safe = m.at > init ? m.at - 1 : m.at + 1;
            expect(
              evalBool(level.meltdown, at(level, { [name]: m.at })),
              `${level.id} ${name}=${m.at}`,
            ).toBe(true);
            expect(
              evalBool(level.meltdown, at(level, { [name]: safe })),
              `${level.id} ${name}=${safe}`,
            ).toBe(false);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(9);
  });

  it("deck tipping points and scope crosses are meltdown states", () => {
    for (const level of levels) {
      for (const panel of level.display.panels) {
        if (panel.skin === "deck") {
          const [l = "", r = ""] = panel.vars;
          expect(evalBool(level.meltdown, at(level, { [l]: panel.tipAt, [r]: 0 }))).toBe(true);
          expect(evalBool(level.meltdown, at(level, { [l]: panel.tipAt - 1, [r]: 0 }))).toBe(false);
          expect(panel.label).toContain(String(panel.tipAt));
        }
        if (panel.skin === "scope") {
          const [x = "", y = ""] = panel.vars;
          for (const {
            at: [ax, ay],
          } of panel.alarms ?? []) {
            expect(
              evalBool(level.meltdown, at(level, { [x]: ax, [y]: ay })),
              `${level.id} (${ax}, ${ay})`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("non-alarm marks and capacities come from the briefing", () => {
    for (const level of levels) {
      for (const panel of level.display.panels) {
        if ("marks" in panel && panel.marks) {
          for (const m of Object.values(panel.marks)
            .flat()
            .filter((k) => !k.alarm)) {
            expect(level.briefing, `${level.id} mark ${m.label}`).toMatch(
              new RegExp(`\\b${m.at}\\b`),
            );
          }
        }
        if (panel.skin === "jug") {
          for (const cap of Object.values(panel.capacity)) {
            expect(level.briefing, `${level.id} capacity ${cap}`).toMatch(
              new RegExp(`\\b${cap}\\b`),
            );
          }
        }
      }
    }
  });
});
