/**
 * Writes a string into an existing string/template literal so that it reads
 * back EXACTLY — or refuses before anything is saved.
 *
 * ts-morph's own `setLiteralValue` is not safe for arbitrary prose: it writes a
 * newline as a line continuation (which reads back with the break gone), drops
 * a backslash, and in a no-substitution template literal lets `${…}` through,
 * which turns the literal into a template EXPRESSION — code, in a content file.
 * Realistic prose (apostrophes, quotes, accents) is fine, which is how this
 * went unnoticed; Shift+Enter in the editor's textarea is how it gets reached.
 *
 * So the escaping here is explicit, and the guarantee does not rest on it: the
 * candidate source is re-parsed by the TypeScript parser in a scratch project
 * and must read back to the requested value before the real node is touched.
 * That check is anchored to the parser, not to this file's own escaper.
 */

import { Node, Project, type StringLiteral, type NoSubstitutionTemplateLiteral } from 'ts-morph';

type LiteralNode = StringLiteral | NoSubstitutionTemplateLiteral;

const scratch = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });

// The two line terminators a plain string literal cannot contain raw. Built
// from code points so this file never holds the characters themselves.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** The source text of `value` as a literal of the same quote kind as `node`. */
export function literalSource(node: Node, value: string): string {
  if (Node.isNoSubstitutionTemplateLiteral(node)) {
    // A raw CR in a template literal is normalised to LF by the language, so it
    // has to be written as an escape to survive.
    return '`' + value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\r/g, '\\r') + '`';
  }
  const quote = node.getText().charAt(0) === '"' ? '"' : "'";
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .split(LINE_SEPARATOR)
    .join('\\u2028')
    .split(PARAGRAPH_SEPARATOR)
    .join('\\u2029')
    .split(quote)
    .join('\\' + quote);
  return quote + escaped + quote;
}

/**
 * What the TypeScript parser reads `source` back as, or undefined when it is
 * not exactly one plain string literal (e.g. it became a template expression).
 */
export function readBackLiteral(source: string): string | undefined {
  const file = scratch.createSourceFile('probe.ts', `(${source});`, { overwrite: true });
  const literals = file.getDescendants().filter((n) => Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n));
  const hasOtherCode = file.getDescendants().some((n) => Node.isTemplateExpression(n));
  if (literals.length !== 1 || hasOtherCode) return undefined;
  return (literals[0] as LiteralNode).getLiteralValue();
}

/** Writes `source` over the literal only if the parser reads it back as `expected`; otherwise throws and writes nothing. */
export function replaceLiteralChecked(node: LiteralNode, source: string, expected: string): void {
  if (readBackLiteral(source) !== expected) {
    throw new Error(`refusing to write that text — it would not read back exactly as typed (${JSON.stringify(expected.slice(0, 40))}…)`);
  }
  node.replaceWithText(source);
}

/** Replaces the literal's text with `value`; throws, writing nothing, if it would not read back exactly. */
export function setLiteralExactly(node: LiteralNode, value: string): void {
  replaceLiteralChecked(node, literalSource(node, value), value);
}
