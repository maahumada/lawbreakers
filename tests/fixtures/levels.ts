// Hand-built levels for engine tests (simulation and verification fixtures).

import type { Level } from "../../src/engine/level.ts";
import { loadLevel } from "../../src/engine/level.ts";

interface MiniLevel {
  vars: { name: string; domain?: "nat" | "int"; init: number }[];
  controls: { id: string; guard: string; update: Record<string, string> }[];
  meltdown: string;
}

/** Build a valid `Level` from just the parts the engine reads. */
export function mkLevel(id: string, m: MiniLevel): Level {
  return loadLevel({
    id: `99-${id}`,
    title: id.toUpperCase(),
    concept: "test",
    briefing: "test fixture",
    vars: m.vars.map((x) => ({
      name: x.name,
      label: x.name,
      domain: x.domain ?? "nat",
      init: x.init,
    })),
    controls: m.controls.map((ctl) => ({ ...ctl, label: ctl.id })),
    meltdown: m.meltdown,
    hand: { cards: {}, budget: 1 },
    solutions: ["true"],
    knownWrong: [],
    argus: { intro: ["TEST."] },
  });
}

/** A counter climbing from 0 to `limit` one step at a time; meltdown never happens. */
export const counter = (limit: number): Level =>
  mkLevel(`counter-${limit}`, {
    vars: [{ name: "x", init: 0 }],
    controls: [{ id: "inc", guard: `x < ${limit}`, update: { x: "x + 1" } }],
    meltdown: "false",
  });
