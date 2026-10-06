/**
 * Shared-wording fragments inside a TEMPLATE file.
 *
 * Some player-facing text is not authored per content item at all — it is
 * DERIVED by a single function shared across many items, by design (so the
 * text can never drift from what the mechanic actually does; see the doc
 * comment on `Effect` in `src/types.ts` and `src/components/meta/relicPower.ts`
 * for the concrete example: one `relicPowerText` function renders every
 * relic's power line from structured data).
 *
 * That function's own literal English fragments are still worth reviewing and
 * editing — "Passive: favoring {faction} costs its rivals {pct}% less
 * standing than usual." reads differently depending on how it is phrased —
 * but they live as plain/template string literals inside a function body, not
 * inside any per-item object literal with an `id`. So neither the record-by-id
 * lookup nor the "record keyed by property name" fallback in `writer.ts`
 * applies here; this module extracts and rewrites literal fragments directly,
 * wherever they sit in the file.
 *
 * A template literal's INTERPOLATED holes (`${...}`) are never touched — only
 * the static text between them. `StringLiteral`/`NoSubstitutionTemplateLiteral`
 * cover fragments with no interpolation at all; `TemplateHead`/`TemplateMiddle`/
 * `TemplateTail` cover the static pieces of one that does.
 */

import { Node, SourceFile, SyntaxKind } from 'ts-morph';
import { setLiteralExactly } from './literal';

/**
 * Files whose player-facing text is a shared TEMPLATE rather than per-item
 * content. The one list the loader (what to show) and the writer (how to route
 * an edit) both read.
 */
export const TEMPLATE_FILES = ['src/components/meta/relicPower.ts'];

export type Fragment = {
  index: number;
  value: string;
  node: Node;
};

// Filters out pure punctuation/glue fragments a template stitches its holes
// together with (".", ": ", "%.") — not meaningful English to expose as its
// own editable field.
const MEANINGFUL = /[a-zA-Z]{2,}/;

const EQUALITY_OPERATORS = new Set(['===', '!==', '==', '!=']);

// A plain StringLiteral can be CODE rather than prose: an import specifier
// (`import x from '../../types'`), a switch `case 'passive':` discriminant,
// one side of an `x === 'eraEnd'` comparison against a union member, or a
// string-literal TYPE (`Extract<RelicPower, { kind: 'trigger' }>`).
// Editing any of these would not reword anything a player sees — it would
// silently break the import, stop that branch/comparison from ever
// matching again, or fail the typecheck. All four are always the direct
// parent of the string literal itself, never of a TemplateHead/Middle/Tail
// (those can't appear in any of those positions), so this check only ever
// needs to run for that one kind.
function isCodeNotProse(node: Node): boolean {
  if (!Node.isStringLiteral(node)) return false;
  const parent = node.getParent();
  if (
    Node.isImportDeclaration(parent) ||
    Node.isExportDeclaration(parent) ||
    Node.isCaseClause(parent) ||
    Node.isLiteralTypeNode(parent)
  ) {
    return true;
  }
  return Node.isBinaryExpression(parent) && EQUALITY_OPERATORS.has(parent.getOperatorToken().getText());
}

function getFragmentValue(node: Node): string {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralValue();
  }
  // TemplateHead / TemplateMiddle / TemplateTail — the cooked text between
  // the backtick/`${`/`}` delimiters, with no direct type in this ts-morph
  // version to narrow to; `getLiteralText` exists on all three at runtime.
  return (node as unknown as { getLiteralText(): string }).getLiteralText();
}

export function listTemplateFragments(sourceFile: SourceFile): Fragment[] {
  const nodes = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateHead),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateMiddle),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateTail),
  ].sort((a, b) => a.getPos() - b.getPos());

  const fragments: Fragment[] = [];
  for (const node of nodes) {
    if (isCodeNotProse(node)) continue;
    const value = getFragmentValue(node);
    if (!MEANINGFUL.test(value)) continue;
    fragments.push({ index: fragments.length, value, node });
  }
  return fragments;
}

function escapeForTemplatePart(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** Rewrites one fragment's text in place, returning the (possibly new) node. */
export function setFragmentValue(node: Node, newValue: string): Node {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    setLiteralExactly(node, newValue);
    return node;
  }
  // Head/Middle/Tail have no `setLiteralValue` of their own — `replaceWithText`
  // needs the surrounding delimiter characters reproduced exactly, since it
  // substitutes raw source text rather than just the cooked value.
  const escaped = escapeForTemplatePart(newValue);
  switch (node.getKind()) {
    case SyntaxKind.TemplateHead:
      return node.replaceWithText('`' + escaped + '${');
    case SyntaxKind.TemplateMiddle:
      return node.replaceWithText('}' + escaped + '${');
    case SyntaxKind.TemplateTail:
      return node.replaceWithText('}' + escaped + '`');
    default:
      throw new Error(`unexpected fragment node kind: ${node.getKindName()}`);
  }
}
