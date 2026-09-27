/**
 * Writes one field's edit straight back into its source `.ts` file.
 *
 * Content files mostly hold plain object literals (`{ id: 'x', title: '...' }`),
 * but three offer files (`oaths.ts`, `concordats.ts`, `grievances.ts`) build a
 * private intermediate shape and `.map()` it into `Offer[]` — so the generated
 * offer's `title`/`options[i].label` do not always share a property NAME with
 * the literal that actually authors it (an oath's declined option's `label`
 * comes from a `declineLabel` field, not from a `label` field nested under an
 * `options` array that doesn't exist in the source at all).
 *
 * Rather than hand-write a structural path walker per DSL, this matches on the
 * field's CURRENT VALUE: find the object literal carrying the item's `id`,
 * then find the one string literal inside it whose text equals `oldValue`
 * (exactly the value the loader — and therefore the UI — just read out of the
 * live module). That works uniformly across every content file's shape, at
 * the cost of refusing an edit if the same sentence appears twice in one
 * record — an edge case cheap enough to just ask the user to resolve by hand.
 *
 * One shape has no `id` property at all: `src/content/changelog.ts`'s
 * `CHANGELOG` is a `Record<string, ChangelogEntry>`, so each entry is keyed by
 * its build-version STRING as an object property rather than carrying an `id`
 * field of its own. `findRecordById` falls back to matching a property NAME
 * for exactly that case.
 *
 * A third shape has no per-item record at all: `TEMPLATE_FILES` lists files
 * whose text is a shared wording TEMPLATE (see templateFragments.ts) rather
 * than per-item content — `src/components/meta/relicPower.ts`'s
 * `relicPowerText`, which renders every relic's power line from one function.
 * Those edits skip the record lookup entirely and match a literal fragment by
 * value across the whole file.
 */

import { Project, SyntaxKind, Node } from 'ts-morph';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { listTemplateFragments, setFragmentValue } from './templateFragments';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..', '..');

const project = new Project({ skipAddingFilesFromTsConfig: true });

// Kept in sync with loader.ts's own TEMPLATE_FILES list.
const TEMPLATE_FILES = new Set(['src/components/meta/relicPower.ts']);

export type EditRequest = {
  file: string;
  itemId: string;
  oldValue: string;
  newValue: string;
};

export type EditResult = {
  ok: true;
  file: string;
  confirmedValue: string;
  lintWarning?: string;
};

function findRecordById(sourceFilePath: string, itemId: string) {
  const sourceFile = project.addSourceFileAtPathIfExists(sourceFilePath)
    ?? project.addSourceFileAtPath(sourceFilePath);
  sourceFile.refreshFromFileSystemSync();

  const candidates = sourceFile
    .getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
    .filter((obj) => {
      const idProp = obj.getProperty('id');
      if (!idProp || !Node.isPropertyAssignment(idProp)) return false;
      const init = idProp.getInitializer();
      return Node.isStringLiteral(init) && init.getLiteralValue() === itemId;
    });

  if (candidates.length > 0) {
    // The record is the object that OWNS the id, not a smaller object nested
    // inside it — pick the widest match if more than one literal happens to
    // carry the same id property (not expected, but cheap to guard).
    const record = candidates.reduce((a, b) => (b.getFullWidth() > a.getFullWidth() ? b : a));
    return { sourceFile, record };
  }

  // Fallback for a record keyed by PROPERTY NAME rather than an `id` field
  // (e.g. `CHANGELOG`'s `Record<string, ChangelogEntry>`, keyed by build
  // version) — the object assigned to a property whose own name equals
  // itemId.
  const byPropertyName = sourceFile
    .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((p) => {
      const name = p.getNameNode();
      const key = Node.isStringLiteral(name) ? name.getLiteralValue() : name.getText();
      if (key !== itemId) return false;
      return Node.isObjectLiteralExpression(p.getInitializer());
    });
  const record = byPropertyName?.getInitializer();
  return { sourceFile, record: record && Node.isObjectLiteralExpression(record) ? record : undefined };
}

function findStringLiteralsByValue(container: Node, value: string) {
  const nodes = [
    ...container.getDescendantsOfKind(SyntaxKind.StringLiteral),
    ...container.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral),
  ];
  return nodes.filter((n) => n.getLiteralValue() === value);
}

function runEslintFix(file: string): string | undefined {
  const lint = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['eslint', '--fix', file], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (lint.status !== 0) {
    return `eslint --fix reported an issue after the edit:\n${lint.stdout}${lint.stderr}`;
  }
  return undefined;
}

function applyTemplateEdit(absPath: string, file: string, oldValue: string, newValue: string): EditResult {
  const sourceFile = project.addSourceFileAtPathIfExists(absPath) ?? project.addSourceFileAtPath(absPath);
  sourceFile.refreshFromFileSystemSync();

  const matches = listTemplateFragments(sourceFile).filter((f) => f.value === oldValue);
  if (matches.length === 0) {
    throw new Error(
      `could not find "${oldValue.slice(0, 50)}${oldValue.length > 50 ? '…' : ''}" in ${file} — the file changed on disk since this page loaded. Reload and try again.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `"${oldValue.slice(0, 50)}${oldValue.length > 50 ? '…' : ''}" appears ${matches.length} times in ${file} — ambiguous, edit it by hand.`,
    );
  }

  setFragmentValue(matches[0].node, newValue);
  sourceFile.saveSync();

  const lintWarning = runEslintFix(file);

  sourceFile.refreshFromFileSystemSync();
  const confirmed = listTemplateFragments(sourceFile).find((f) => f.value === newValue);
  if (!confirmed) {
    throw new Error(
      `wrote ${file} but could not re-read "${newValue.slice(0, 50)}" back from it afterward — check the file by hand.`,
    );
  }

  return { ok: true, file, confirmedValue: confirmed.value, lintWarning };
}

export function applyEdit({ file, itemId, oldValue, newValue }: EditRequest): EditResult {
  if (path.isAbsolute(file) || file.includes('..')) {
    throw new Error(`refusing to touch a path outside the content directories: "${file}"`);
  }
  const absPath = path.join(ROOT, file);
  const underContent = absPath.startsWith(path.join(ROOT, 'src', 'content') + path.sep);
  if (!underContent && !TEMPLATE_FILES.has(file)) {
    throw new Error(`refusing to write outside src/content (or the known template files): "${file}"`);
  }

  if (TEMPLATE_FILES.has(file)) {
    return applyTemplateEdit(absPath, file, oldValue, newValue);
  }

  const { record } = findRecordById(absPath, itemId);
  if (!record) {
    throw new Error(`no object with id "${itemId}" found in ${file} — it may have been renamed or removed`);
  }

  const matches = findStringLiteralsByValue(record, oldValue);
  if (matches.length === 0) {
    throw new Error(
      `could not find the current text for "${itemId}" in ${file} — the file changed on disk since this page loaded. Reload and try again.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `"${oldValue.slice(0, 50)}${oldValue.length > 50 ? '…' : ''}" appears ${matches.length} times in "${itemId}" — ambiguous, edit ${file} by hand.`,
    );
  }

  matches[0].setLiteralValue(newValue);
  matches[0].getSourceFile().saveSync();

  const lintWarning = runEslintFix(file);

  // Confirm what actually landed on disk, per the failure mode this repo
  // keeps re-learning: "I wrote it" is not "I verified what's there now".
  const { record: confirmedRecord } = findRecordById(absPath, itemId);
  const confirmed = confirmedRecord && findStringLiteralsByValue(confirmedRecord, newValue)[0];
  if (!confirmed) {
    throw new Error(
      `wrote ${file} but could not re-read "${newValue.slice(0, 50)}" back from it afterward — check the file by hand.`,
    );
  }

  return { ok: true, file, confirmedValue: confirmed.getLiteralValue(), lintWarning };
}
