import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DisplayPanel } from "../src/engine/display.ts";
import type { State } from "../src/engine/expr.ts";
import type { Level } from "../src/engine/level.ts";
import { initialState, loadBundledLevels } from "../src/engine/level.ts";
import type { DisplayMode } from "../src/game/missionStore.ts";
import { gaugeScale } from "../src/ui/machine/format.ts";
import { Gauge } from "../src/ui/machine/Gauge.tsx";
import { GaugePanel } from "../src/ui/machine/skins/GaugePanel.tsx";

const levels = loadBundledLevels();
const byId = (n: string): Level => {
  const l = levels.find((x) => x.id.startsWith(n));
  if (!l) throw new Error(`no mission ${n}`);
  return l;
};

function render(
  level: Level,
  panel: DisplayPanel,
  state: State,
  opts: { scale?: number; mode?: DisplayMode | null; history?: State[]; from?: State | null } = {},
): string {
  const maxAbs = Math.max(0, ...Object.values(state).map(Math.abs));
  return renderToStaticMarkup(
    createElement(GaugePanel, {
      panel,
      decls: level.vars,
      state,
      scale: opts.scale ?? gaugeScale(maxAbs),
      mode: opts.mode ?? null,
      from: opts.from ?? null,
      tick: 0,
      history: opts.history ?? [state],
    }),
  );
}

/** The readout element of `name`: its attributes as a map. */
function readout(html: string, name: string): Record<string, string> {
  const m = new RegExp(`<[^>]*data-testid="gauge-${name}"[^>]*>`).exec(html);
  if (!m) throw new Error(`no gauge-${name} in markup`);
  return Object.fromEntries([...m[0].matchAll(/([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
}

const fill = (level: Level, v: number): State =>
  Object.fromEntries(level.vars.map((x) => [x.name, v]));

describe("every mission's skins keep the gauge contract", () => {
  for (const level of levels) {
    it(`${level.id}: one labelled readout per variable for normal, negative and huge values`, () => {
      for (const state of [initialState(level), fill(level, -3), fill(level, 120)]) {
        const html = level.display.panels.map((p) => render(level, p, state)).join("");
        for (const x of level.vars) {
          const v = state[x.name] ?? 0;
          const count = html.split(`data-testid="gauge-${x.name}"`).length - 1;
          expect(count, `${level.id} ${x.name}`).toBe(1);
          const r = readout(html, x.name);
          expect(r["data-value"]).toBe(String(v));
          expect(r["role"]).toBe("img");
          expect(r["aria-label"]?.startsWith(`${x.label} reads ${v}`)).toBe(true);
        }
      }
    });
  }
});

describe("out-of-range states are drawn honestly", () => {
  it("nixie panels render exactly the original gauge", () => {
    const level = byId("01");
    const decl = level.vars[0];
    if (!decl) throw new Error("no var");
    const panel: DisplayPanel = { skin: "nixie", vars: [decl.name] };
    expect(render(level, panel, { A: 3, B: 3 }, { scale: 10 })).toBe(
      renderToStaticMarkup(createElement(Gauge, { decl, value: 3, scale: 10 })),
    );
  });

  it("jug: water over the rim is said and drawn", () => {
    const level = byId("13");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const html = render(level, panel, { a: 11, b: 2 });
    expect(readout(html, "a")["aria-label"]).toBe("TANK A reads 11, over capacity 9");
    expect(html).toContain("▲ 2 OVER THE RIM");
    expect(readout(html, "b")["data-note"]).toBeUndefined();
  });

  it("tank: below empty is a red hatch, not an empty tank", () => {
    const level = byId("01");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const html = render(level, panel, { A: -2, B: 4 });
    expect(readout(html, "A")["aria-label"]).toBe("CELL A reads -2, below empty");
    expect(html).toContain("BELOW EMPTY");
  });

  it("tokens: negative counts are owed ghosts, big counts a +k badge", () => {
    const pins = byId("04");
    const p = pins.display.panels[0];
    if (!p) throw new Error("no panel");
    const owed = render(pins, p, { n: -2 });
    expect(owed.match(/class="sk-ghost"/g)?.length).toBe(2);
    expect(owed).toContain("2 OWED");
    expect(readout(owed, "n")["aria-label"]).toBe("PINS reads -2, below empty");
    const many = render(pins, p, { n: 15 });
    expect(many).toContain("+3 MORE");
  });

  it("dial: a lab value past the notches sits in the unprinted zone; far past, it pegs", () => {
    const level = byId("02");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const twelve = render(level, panel, { x: 12 });
    expect(readout(twelve, "x")["aria-label"]).toBe("VALVE reads 12, past the last notch 10");
    expect(twelve).not.toContain("PEGGED");
    expect(render(level, panel, { x: 40 })).toContain("PEGGED");
    expect(readout(render(level, panel, { x: -1 }), "x")["data-note"]).toBe("below notch 0");
  });

  it("piston: a negative position retracts into a hatched zone", () => {
    const level = byId("03");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const html = render(level, panel, { x: 0, y: -2 });
    expect(html).toContain("RETRACTED PAST 0");
    expect(readout(html, "y")["data-note"]).toBe("retracted past zero");
  });

  it("selector: an unnamed position turns to the ? notch", () => {
    const level = byId("08");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    expect(readout(render(level, panel, { p: 2, a: 0 }), "p")["data-note"]).toBe(
      "no such position",
    );
    expect(readout(render(level, panel, { p: 1, a: 0 }), "p")["data-note"]).toBeUndefined();
  });

  it("scope: off-frame points are clamped with an arrow and said", () => {
    const level = byId("15");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const html = render(level, panel, { x: 14, y: 3 }, { scale: 10 });
    expect(html).toContain("OFF THE SCOPE");
    expect(readout(html, "x")["data-note"]).toBe("off the scope");
    expect(readout(html, "y")["data-note"]).toBeUndefined();
  });

  it("hoist: cable past the stop and owed blocks", () => {
    const level = byId("05");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const html = render(level, panel, { x: -4, y: -4 });
    expect(html).toContain("CABLE PAST STOP");
    expect(html).toContain("4 BLOCKS OWED");
  });
});

describe("spoiler guards", () => {
  it("scope: lab states never draw the real trail, only the invented step", () => {
    const level = byId("15");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const history = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 3 },
    ];
    const live = render(level, panel, { x: 3, y: 3 }, { history });
    expect(live.match(/class="sk-trail"/g)?.length).toBe(2);
    const lab = render(
      level,
      panel,
      { x: 2, y: 2 },
      { history, mode: "lab", from: { x: 1, y: 1 } },
    );
    expect(lab).not.toContain("sk-trail");
    expect(lab).toContain("sk-step");
  });

  it("scope: the trail is short (it must not draw the reachable set)", () => {
    const level = byId("15");
    const panel = level.display.panels[0];
    if (panel?.skin !== "scope") throw new Error("no scope");
    expect(panel.trail).toBeLessThanOrEqual(6);
    const history = Array.from({ length: 30 }, (_, i) => ({ x: i % 9, y: (i * 2) % 9 }));
    const html = render(level, panel, history.at(-1) ?? {}, { history });
    expect(html.match(/class="sk-trail"/g)?.length).toBe(panel.trail);
  });

  it("rotor: the rotor is drawn the same whatever the counts", () => {
    const level = byId("14");
    const panel = level.display.panels[0];
    if (!panel) throw new Error("no panel");
    const rotor = (s: State) =>
      /<g class="sk-rotor[^"]*"[^>]*>.*?<\/g>/.exec(render(level, panel, s))?.[0];
    expect(rotor({ r: 2, g: 3, b: 4 })).toBeDefined();
    expect(rotor({ r: 2, g: 3, b: 4 })).toBe(rotor({ r: 7, g: 1, b: 1 }));
  });

  it("no skin prints a sum, difference or total of several gauges", () => {
    for (const level of levels) {
      for (const panel of level.display.panels) {
        const html = render(level, panel, initialState(level));
        const text = html.replace(/<[^>]+>/g, " ");
        expect(text, level.id).not.toMatch(/TOTAL|SUM|RATIO/);
        if (panel.skin !== "deck")
          expect(text, level.id).not.toMatch(/[A-Za-z]\s*[+−-]\s*[A-Za-z]\b/);
      }
    }
  });
});
