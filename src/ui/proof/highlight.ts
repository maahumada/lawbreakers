// Tiny Dafny tokenizer for the Show the Proof panel. Only covers what `toDafny` emits.

export type TokenKind = "comment" | "keyword" | "type" | "number" | "op" | "ident" | "text";

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  "method",
  "var",
  "while",
  "invariant",
  "decreases",
  "assert",
  "if",
  "case",
  "true",
  "false",
]);
const TYPES = new Set(["nat", "int"]);

// Order matters: comments first, then multi-char operators before single chars.
const TOKEN =
  /(\/\/.*)|([A-Za-z_][A-Za-z0-9_]*)|(\d+)|(:=|==|!=|<=|>=|=>|&&|\|\||[-+*%<>!=(){},;:])|(\s+|.)/gu;

/** Split one line of Dafny into highlighted tokens. Concatenating `text` gives the line back. */
export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  for (const m of line.matchAll(TOKEN)) {
    const [text, comment, word, number, op] = m;
    const kind: TokenKind = comment
      ? "comment"
      : word
        ? KEYWORDS.has(word)
          ? "keyword"
          : TYPES.has(word)
            ? "type"
            : "ident"
        : number
          ? "number"
          : op
            ? "op"
            : "text";
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind === "text") last.text += text;
    else tokens.push({ kind, text });
  }
  return tokens;
}
