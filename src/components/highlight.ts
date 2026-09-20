/**
 * A deliberately small JSX tinter for the Code frame. It only classifies
 * spans of the source; concatenating every token's text reproduces the input
 * exactly, so a misclassification can only mis-colour, never alter code.
 */

export type TokenKind = "plain" | "kw" | "fn" | "str" | "mut" | "tag" | "at";

export type Token = { kind: TokenKind; text: string };

const KEYWORDS =
  "const|let|var|function|return|export|default|if|else|for|while|switch|case|break|" +
  "true|false|null|undefined|new|typeof|import|from|async|await|of|in";

// Alternatives are tried in order at each position; the capture group that
// matched decides the token kind.
const PATTERN = new RegExp(
  [
    String.raw`(\/\/[^\n]*|\/\*[\s\S]*?\*\/)`, // 1 comment
    String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|` + "`(?:[^`\\\\]|\\\\.)*`)", // 2 string
    String.raw`(<\/?[A-Za-z][\w.]*|\/>)`, // 3 JSX tag open/close
    String.raw`\b(${KEYWORDS})\b`, // 4 keyword
    String.raw`\b([A-Za-z_$][\w$]*)(?=\s*\()`, // 5 call / function name
    String.raw`\b([A-Za-z][\w-]*)(?==)`, // 6 JSX attribute
  ].join("|"),
  "g",
);

const KINDS: TokenKind[] = ["mut", "str", "tag", "kw", "fn", "at"];

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of source.matchAll(PATTERN)) {
    const start = match.index;
    if (start > last) tokens.push({ kind: "plain", text: source.slice(last, start) });
    const group = match.slice(1).findIndex((g) => g !== undefined);
    tokens.push({ kind: KINDS[group] ?? "plain", text: match[0] });
    last = start + match[0].length;
  }
  if (last < source.length) tokens.push({ kind: "plain", text: source.slice(last) });
  return tokens;
}
