// @vitest-environment node
/**
 * The order the production build lays the CSS modules down in — the one thing
 * about a composed class that no source file can show.
 *
 * A screen class that composes `.btn` from craft.module.css and sets its own
 * `min-height` wins only if its rule comes AFTER craft's in the bundle. The
 * production build once put craft after almost every screen: postcss-modules
 * pasted a copy of craft into each of the thirteen modules that compose from
 * it, and the minifier kept the last copy. The Prophecy's continue button was
 * 44px instead of 52, the ending card wore the desktop frame on a phone, and
 * about eighty other overrides lost, while dev showed them winning.
 *
 * This builds the app in memory, exactly as `npm run build` does minus the
 * typecheck and the write, and reads the order off the CSS it emits. Craft is
 * recognised from its own source's class names (`scripts/check-css-order.ts`),
 * not from anything the build or the config supplies.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build, type Rollup } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import { CRAFT, cssOrder } from '../../scripts/check-css-order';

const ROOT = process.cwd();
const craftSource = readFileSync(resolve(ROOT, CRAFT), 'utf8');

/** Every `.name { composes: a b from '…craft.module.css' }` in the source, as [name, [a, b]]. */
function composedFromCraft(): Array<[string, string[]]> {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.module.css') ? [join(dir, e.name)] : [],
    );
  return walk(resolve(ROOT, 'src')).flatMap((file) => {
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    return [...text.matchAll(/(?<=^|[{}])\s*\.([\w-]+)\s*\{([^}]*)\}/g)].flatMap(([, name, body]) =>
      [...body.matchAll(/composes:\s*([\w\s-]+?)\s+from\s+['"][^'"]*craft\.module\.css['"]/g)].map(
        (m): [string, string[]] => [name, m[1].split(/\s+/)],
      ),
    );
  });
}

describe('the production build · craft.module.css comes before every screen', () => {
  let css = '';
  let js = '';

  beforeAll(async () => {
    const out = await build({
      root: ROOT,
      configFile: resolve(ROOT, 'vite.config.ts'),
      logLevel: 'silent',
      mode: 'production',
      build: { write: false, reportCompressedSize: false },
    });
    const outputs = (Array.isArray(out) ? out : [out]) as Rollup.RollupOutput[];
    const sheets = outputs
      .flatMap((o) => o.output)
      .filter((f): f is Rollup.OutputAsset => f.type === 'asset' && f.fileName.endsWith('.css'));
    expect(sheets).toHaveLength(1);
    css = String(sheets[0].source);
    js = outputs
      .flatMap((o) => o.output)
      .flatMap((f) => (f.type === 'chunk' ? [f.code] : []))
      .join('\n');
  }, 120_000);

  it('is checking something: it finds craft once, and the screen modules after it', () => {
    // Guards the guard. A CSS with craft missing, or a scoped-name pattern the
    // reader no longer recognises, would otherwise pass with nothing to order.
    const order = cssOrder(css, craftSource);
    expect(order.craftHash).not.toBeNull();
    expect(order.modules).toBeGreaterThan(20);
    // Craft's own rules all made it in — the import in main.tsx is a bare one,
    // and a bare import of a CSS module is shaken out of a build by default.
    for (const name of ['btn', 'btnPrimary', 'label', 'plateDoubleFrame', 'pips', 'sectionRule'])
      expect(css).toContain(`._${name}_${order.craftHash}_`);
  });

  it('still exports what each class composes from craft', () => {
    // Craft's CSS is no longer pasted into the modules that compose from it,
    // but their class strings must still carry craft's classes, or a composed
    // button renders as bare text. Anchored to the `composes:` lines in the
    // source, read independently of the loader that resolves them.
    const { craftHash } = cssOrder(css, craftSource);
    const wanted = composedFromCraft();
    expect(wanted.length).toBeGreaterThan(30);
    const strings = js.match(/"_[A-Za-z][\w-]*_[a-z0-9]{5}_\d+(?: [\w-]+)*"/g) ?? [];
    const missing = wanted.filter(
      ([name, from]) =>
        !strings.some(
          (str) =>
            str.startsWith(`"_${name}_`) && from.every((c) => new RegExp(`\\s_${c}_${craftHash}_\\d+\\b`).test(str)),
        ),
    );
    expect(missing).toEqual([]);
  });

  it('puts no rule of any other module before craft’s last rule', () => {
    expect(cssOrder(css, craftSource).problems).toEqual([]);
  });
});
