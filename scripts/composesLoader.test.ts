/**
 * The composes loader keeps a composing module's class names in step with the
 * file it composes from, in dev as well as in the build.
 *
 * `cssOrder.test.ts` covers the build. What it cannot see is `npm run dev`:
 * a composed class name is hashed from the composed file's content, so after
 * an edit to craft.module.css every module composing from it has to be scoped
 * again, and Vite only does that for files it was told the module depends on.
 * Without the dependency message, editing craft under the dev server stripped
 * every composed style — the wallpaper, the buttons' frames — from every
 * screen until a restart (measured: the title's wallpaper mask went from a
 * url() to `none`, and stayed `none` across a reload).
 */

import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { composesDependencies, composesWithoutCopy } from './composesLoader';

const importer = resolve('/repo/src/screens/TitleScreen.module.css');

async function dependenciesOf(css: string) {
  const result = await postcss([composesDependencies()]).process(css, { from: importer });
  return result.messages.filter((m) => m.type === 'dependency').map((m) => m.file as string);
}

describe('composes loader · dev dependencies', () => {
  it('reports the file a class composes from, resolved against the composing module', async () => {
    expect(await dependenciesOf(`.screen { composes: screen from '../components/meta/craft.module.css'; }`)).toEqual([
      resolve('/repo/src/components/meta/craft.module.css'),
    ]);
  });

  it('reads double quotes and several composed classes', async () => {
    expect(await dependenciesOf(`.a { composes: btn btnQuiet from "./craft.module.css"; }`)).toEqual([
      resolve('/repo/src/screens/craft.module.css'),
    ]);
  });

  it('reports nothing for a local compose, or a module that composes nothing', async () => {
    expect(await dependenciesOf(`.a { composes: b; } .b { color: red; }`)).toEqual([]);
  });

  it('is wired into the Vite plugin, so the dev server actually receives it', () => {
    const plugin = composesWithoutCopy({ shared: 'src/components/meta/craft.module.css' });
    const config = (plugin.config as () => { css: { postcss: { plugins: { postcssPlugin?: string }[] } } })();
    const names = config.css.postcss.plugins.map((p) => p.postcssPlugin);
    expect(names).toContain('evil-wizard:composes-dependencies');
  });
});
