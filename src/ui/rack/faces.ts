// Face text of rack modules and hand items (UI only).

import type { ExprType } from "../../engine/expr.ts";
import type { CardId, Level } from "../../engine/level.ts";
import type { HandItem, RackModule } from "../../game/rack.ts";
import { cardLabel, cardName, CONST_MAX, CONST_MIN } from "../../game/rack.ts";

const CARD_FACE: Partial<Record<CardId, string>> = { add: "+", sub: "−" };

const CARD_CAPTION: Partial<Record<CardId, string>> = {
  add: "Add",
  sub: "Subtract",
  and: "Both",
  or: "Either",
  not: "Invert",
};

export interface Face {
  /** Big symbol on the plate: `A`, `+`, `MOD 2`, `≥`. */
  face: string;
  /** Small caption under it: the gauge label, `Equals`, `Dial`. */
  caption: string;
  /** Accessible name. */
  name: string;
}

function cardFace(card: CardId): Face {
  const name = cardName(card);
  return {
    face: CARD_FACE[card] ?? cardLabel(card),
    caption: CARD_CAPTION[card] ?? name.charAt(0).toUpperCase() + name.slice(1),
    name: `${name} card`,
  };
}

export function faceOf(m: RackModule | HandItem, level: Level): Face {
  switch (m.kind) {
    case "sensor": {
      const label = level.vars.find((x) => x.name === m.name)?.label ?? m.name;
      return { face: m.name, caption: label, name: `sensor ${m.name}` };
    }
    case "const":
      return "value" in m
        ? { face: String(m.value), caption: "Dial", name: `constant ${m.value}` }
        : { face: "#", caption: "Dial", name: `constant dial, ${CONST_MIN} to ${CONST_MAX}` };
    case "card":
      return cardFace(m.card);
  }
}

export const typeWord = (t: ExprType): string => (t === "num" ? "number" : "signal");
