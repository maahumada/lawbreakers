// Post-playtest: the one-time explainer cards for the first lab breach and the first insufficient
// verdict (seen flags per kind) and their copy.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadBundledLevels } from "../src/engine/level.ts";
import { parseBool } from "../src/engine/parse.ts";
import { VERDICT_KINDS } from "../src/engine/types.ts";
import {
  explainerFor,
  explainerKey,
  explainerSeen,
  markExplainerSeen,
} from "../src/game/explainerSeen.ts";
import { explainerCopy } from "../src/ui/argus/verdictText.ts";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("explainer seen flags", () => {
  it("offers an explainer only for lab breaches and insufficient verdicts", () => {
    const offered = VERDICT_KINDS.filter((k) => explainerFor(k) !== null);
    expect(offered).toEqual(["lab_breach", "insufficient"]);
  });

  it("shows each kind once, independently", () => {
    expect(explainerFor("lab_breach")).toBe("lab_breach");
    markExplainerSeen("lab_breach");
    expect(explainerSeen("lab_breach")).toBe(true);
    expect(explainerFor("lab_breach")).toBeNull();
    expect(explainerFor("insufficient")).toBe("insufficient");
    markExplainerSeen("insufficient");
    expect(explainerFor("insufficient")).toBeNull();
    expect(window.localStorage.getItem(explainerKey("lab_breach"))).toBe("1");
  });

  it("survives storage that throws: never seen, marking is a no-op", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    vi.stubGlobal("window", { localStorage: broken });
    expect(() => markExplainerSeen("insufficient")).not.toThrow();
    expect(explainerSeen("insufficient")).toBe(false);
    expect(explainerFor("insufficient")).toBe("insufficient");
  });
});

describe("explainer copy", () => {
  const levels = loadBundledLevels();
  const m05 = levels[4];
  const m06 = levels[5];
  if (!m05 || !m06) throw new Error("missions missing");
  const plain = (s: string) => s.replace(/\u00a0/g, " ");

  it("explains a lab breach with the fence and the real control, in three lines", () => {
    const copy = explainerCopy(m05, parseBool("x >= 0 && y >= 0"), {
      kind: "lab_breach",
      before: { x: 0, y: 1 },
      control: "pull",
      after: { x: -1, y: 0 },
    });
    expect(copy?.title).toBe("Why does ARGUS use a state that never happens?");
    expect(copy?.lines).toHaveLength(3);
    const text = plain(copy?.lines.join(" ") ?? "");
    expect(text).toContain("x = 0, y = 1");
    expect(text).toContain("one HOIST gives x = −1, y = 0");
  });

  it("explains an insufficient verdict as never happening, not proven impossible", () => {
    const copy = explainerCopy(m06, parseBool("A + B = 6"), {
      kind: "insufficient",
      state: { A: 3, B: 3 },
    });
    expect(copy?.title).toBe("Never happening ≠ proven impossible");
    expect(copy?.lines.length).toBeLessThanOrEqual(3);
    expect(plain(copy?.lines[0] ?? "")).toBe(
      "The machine may never reach A = 3, B = 3. Your Law A + B = 6 still allows it.",
    );
  });

  it("has no card for the other verdicts", () => {
    expect(explainerCopy(m06, parseBool("A = 0"), { kind: "holds" })).toBeNull();
  });
});
