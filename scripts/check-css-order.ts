/**
 * Does the BUILT stylesheet put craft.module.css ahead of every other CSS
 * module?
 *
 * Every screen composes its buttons, labels and frames from craft and then
 * overrides some of what it composed — at the same specificity, so the
 * override wins only by coming later. The source cannot show the order; only
 * the bundle can, and the bundle once put craft after almost every screen
 * (about eighty-six overrides lost in production and won in dev). See
 * `scripts/composesLoader.ts` for why, and `src/main.tsx` for the import that
 * places it.
 *
 *   npm run build && npx tsx scripts/check-css-order.ts          # dist/assets
 *   npx tsx scripts/check-css-order.ts path/to/built.css
 *
 * `src/components/cssOrder.test.ts` runs the same check against an in-memory
 * build on every `npm run test`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CRAFT = 'src/components/meta/craft.module.css';

/** Every class a stylesheet's selectors name, comments and strings aside. */
export function classesInSource(source: string): Set<string> {
  const bare = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""');
  const selectors = [...bare.matchAll(/([^{};]+)\{/g)].map((m) => m[1]).filter((s) => !s.trim().startsWith('@'));
  return new Set(selectors.flatMap((s) => [...s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])));
}

/**
 * A scoped class as the production build names it: `_<local>_<hash>_<n>`,
 * the hash shared by every class of one module.
 */
const SCOPED = /\._([A-Za-z][\w-]*)_([a-z0-9]{5})_\d+(?![\w-])/g;

export type CssOrder = {
  /** The hash the build gave craft's classes, or null if none of craft's classes are in the CSS. */
  craftHash: string | null;
  /** How many distinct modules' scoped classes the CSS holds, craft included. */
  modules: number;
  /** One line per module that has a rule before craft's last rule. Empty when the order holds. */
  problems: string[];
};

/**
 * Read the order off built CSS. Craft is recognised by its own source — the
 * module every one of whose scoped classes is a class craft.module.css
 * declares, and that carries most of them — not by any name the build or this
 * repo's config supplies.
 */
export function cssOrder(css: string, craftSource: string): CssOrder {
  const craftClasses = classesInSource(craftSource);
  const byHash = new Map<string, { locals: Set<string>; first: number; last: number; example: string }>();
  for (const m of css.matchAll(SCOPED)) {
    const [whole, local, hash] = m;
    const at = m.index ?? 0;
    const seen = byHash.get(hash);
    if (seen) {
      seen.locals.add(local);
      seen.last = at;
    } else byHash.set(hash, { locals: new Set([local]), first: at, last: at, example: whole });
  }

  const candidates = [...byHash].filter(
    ([, v]) => [...v.locals].every((l) => craftClasses.has(l)) && v.locals.size * 2 >= craftClasses.size,
  );
  if (candidates.length !== 1) {
    return {
      craftHash: null,
      modules: byHash.size,
      problems: [
        candidates.length === 0
          ? `craft.module.css's rules are not in this CSS (none of ${byHash.size} modules matches its classes)`
          : `more than one module matches craft.module.css's classes: ${candidates.map(([h]) => h).join(', ')}`,
      ],
    };
  }

  const [craftHash, craft] = candidates[0];
  const problems = [...byHash]
    .filter(([hash, v]) => hash !== craftHash && v.first < craft.last)
    .map(
      ([, v]) =>
        `${v.example} (a rule at ${v.first}) comes before craft's last rule (at ${craft.last}): ` +
        `craft's value wins any property both set at equal specificity`,
    );
  return { craftHash, modules: byHash.size, problems };
}

function main() {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const arg = process.argv[2] ?? join(root, 'dist', 'assets');
  const files = statSync(arg).isDirectory()
    ? readdirSync(arg)
        .filter((f) => f.endsWith('.css'))
        .map((f) => join(arg, f))
    : [arg];
  if (files.length === 0) {
    console.error(`no .css in ${arg} — run \`npm run build\` first`);
    process.exit(1);
  }
  const craftSource = readFileSync(join(root, CRAFT), 'utf8');
  let failed = false;
  for (const file of files) {
    const { craftHash, modules, problems } = cssOrder(readFileSync(file, 'utf8'), craftSource);
    if (problems.length > 0) {
      failed = true;
      console.error(`FAIL ${file}: ${problems.length} module(s) out of order`);
      for (const p of problems) console.error(`  ${p}`);
    } else {
      console.log(`ok   ${file}: craft (${craftHash}) comes before all ${modules - 1} other CSS modules`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
