import { describe, expect, it } from "vitest";
import { toDafny } from "../src/engine/dafny.ts";
import { loadBundledLevels } from "../src/engine/level.ts";
import { tokenizeLine } from "../src/ui/proof/highlight.ts";

describe("Show the Proof highlighter", () => {
  it("classifies keywords, types, numbers, operators and comments", () => {
    const kinds = tokenizeLine("  var A: nat := 2;  // CELL A")
      .filter((t) => t.text.trim() !== "")
      .map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toEqual([
      "keyword:var",
      "ident:A",
      "op::",
      "type:nat",
      "op::=",
      "number:2",
      "op:;",
      "comment:// CELL A",
    ]);
  });

  it("keeps two-character operators whole", () => {
    const ops = tokenizeLine("case !(A >= 1 || B == 0) && x != y =>")
      .filter((t) => t.kind === "op")
      .map((t) => t.text);
    expect(ops).toEqual(["!", "(", ">=", "||", "==", ")", "&&", "!=", "=>"]);
  });

  it("round-trips every generated program", () => {
    for (const level of loadBundledLevels()) {
      const code = toDafny(level, level.solutions[0] ?? { k: "bool", value: true });
      for (const line of code.split("\n")) {
        expect(
          tokenizeLine(line)
            .map((t) => t.text)
            .join(""),
        ).toBe(line);
      }
    }
  });
});
