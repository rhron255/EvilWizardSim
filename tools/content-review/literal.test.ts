// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { readBackLiteral, replaceLiteralChecked, setLiteralExactly } from './literal';

/**
 * The oracle is a FRESH parse of the file text the edit produced, by the
 * TypeScript parser — not `readBackLiteral` and not the escaper under test —
 * so a wrong escape cannot agree with itself.
 */
function editAndReparse(seed: string, value: string) {
  const edited = new Project({ useInMemoryFileSystem: true });
  const file = edited.createSourceFile('a.ts', `export const x = ${seed};\n`);
  const node = file.getFirstDescendant((n) => Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n));
  if (!node || !(Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node))) throw new Error('seed has no literal');
  setLiteralExactly(node, value);

  const fresh = new Project({ useInMemoryFileSystem: true }).createSourceFile('b.ts', file.getFullText());
  const literals = fresh.getDescendants().filter((n) => Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n));
  return {
    text: file.getFullText(),
    statements: fresh.getStatements().length,
    templateExpressions: fresh.getDescendantsOfKind(SyntaxKind.TemplateExpression).length,
    value: literals.length === 1 ? (literals[0] as import('ts-morph').StringLiteral).getLiteralValue() : undefined,
  };
}

const PROSE: [string, string][] = [
  ['an apostrophe', "He didn't stay"],
  ['double quotes', 'He said "no"'],
  ['both quote kinds', `it's "both"`],
  ['curly quotes and accents', 'It’s “fine”, café — ☠'],
  ['a newline (Shift+Enter in the editor)', 'line one\nline two'],
  ['a carriage return', 'line one\r\nline two'],
  ['a backslash', 'back\\slash'],
  ['a backtick', 'a `tick` b'],
  ['a dollar-brace', 'cost ${x} here'],
  ['a trailing backslash', 'ends with \\'],
  ['a line separator', 'one' + String.fromCharCode(0x2028) + 'two'],
];

describe('setLiteralExactly', () => {
  for (const seed of [`'seed'`, `"seed"`, '`seed`']) {
    describe(`into a literal written as ${seed}`, () => {
      for (const [name, value] of PROSE) {
        it(`round-trips ${name}`, () => {
          const out = editAndReparse(seed, value);
          expect(out.value).toBe(value);
          // Still exactly one statement, and never turned into code.
          expect(out.statements).toBe(1);
          expect(out.templateExpressions).toBe(0);
        });
      }
    });
  }

  it('keeps the literal on its original quote kind', () => {
    expect(editAndReparse(`"seed"`, 'plain').text).toContain('"plain"');
    expect(editAndReparse(`'seed'`, 'plain').text).toContain("'plain'");
    expect(editAndReparse('`seed`', 'plain').text).toContain('`plain`');
  });
});

describe('replaceLiteralChecked', () => {
  function literalIn(text: string) {
    const file = new Project({ useInMemoryFileSystem: true }).createSourceFile('c.ts', text);
    const node = file.getFirstDescendantByKindOrThrow(SyntaxKind.StringLiteral);
    return { file, node };
  }

  it('writes nothing when the source would not read back as the requested text', () => {
    const { file, node } = literalIn(`export const x = 'seed';\n`);
    const before = file.getFullText();
    // Source that is code (two literals joined), and source that is a different string.
    expect(() => replaceLiteralChecked(node, `'a' + 'b'`, 'ab')).toThrow(/read back/);
    expect(() => replaceLiteralChecked(node, `'wrong'`, 'right')).toThrow(/read back/);
    expect(file.getFullText()).toBe(before);
  });

  it('writes when the source reads back as the requested text', () => {
    const { file, node } = literalIn(`export const x = 'seed';\n`);
    replaceLiteralChecked(node, `'fresh'`, 'fresh');
    expect(file.getFullText()).toContain(`'fresh'`);
  });
});

describe('readBackLiteral', () => {
  it('reads a plain literal', () => {
    expect(readBackLiteral(`'a b'`)).toBe('a b');
  });

  it('refuses source that is code rather than one literal', () => {
    expect(readBackLiteral('`cost ${x}`')).toBeUndefined();
    expect(readBackLiteral(`'a' + 'b'`)).toBeUndefined();
  });
});
