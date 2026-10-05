/**
 * The loader postcss-modules uses to read a file named by
 * `composes: x from '...'` — the same as its default in every way but one: it
 * does NOT paste that file's CSS into the module that composes from it.
 *
 * Why that matters here: every screen composes its buttons, labels and frames
 * from `craft.module.css`, and the default loader prepends a full copy of craft
 * to each of those thirteen modules. In dev that left a copy of craft ahead of
 * each screen's own rules, so the screen's overrides won. In the production
 * build the minifier then removes duplicate rules and keeps the LAST copy —
 * which lands after almost every screen module, so every property a screen
 * overrode on a class it composes from craft (the Prophecy's 52px continue
 * button, the ending card's phone frame, the wordmark's size and tone) lost to
 * craft's value, about eighty-six of them. The source read one way and the
 * shipped page another, and nothing failed.
 *
 * With no copy pasted anywhere, craft is in the bundle exactly once, from
 * `src/main.tsx`, which imports it after tokens.css and before App — so it
 * comes before every screen module in dev and in the build alike, and an
 * equal-specificity override in a screen wins because it comes later.
 * `src/components/cascade.test.ts` holds both halves.
 *
 * The class names a composing module exports are unchanged: the composed file
 * is still read and scoped with the same plugins (and so the same generated
 * names) to resolve what `composes` refers to. Only its CSS is dropped here.
 */

import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';
import postcss, { type AcceptedPlugin, type Rule } from 'postcss';
import type { Plugin } from 'vite';

type Tokens = Record<string, string>;
type FileResolve = (file: string, importer: string) => Promise<string | undefined> | string | undefined;

const unquote = (text: string) => text.trim().replace(/^["']|["']$/g, '');

export class ComposesWithoutCopyLoader {
  private readonly tokensByFile = new Map<string, Promise<Tokens>>();

  constructor(
    private readonly root: string,
    private readonly plugins: AcceptedPlugin[],
    private readonly fileResolve?: FileResolve,
  ) {}

  /** The class names `file` exports, as `composes` from `relativeTo` sees them. */
  async fetch(file: string, relativeTo: string): Promise<Tokens> {
    const wanted = unquote(file);
    const resolved =
      (typeof this.fileResolve === 'function' ? await this.fileResolve(wanted, relativeTo) : undefined) ??
      resolvePath(this.root, dirname(relativeTo), wanted);
    if (!isAbsolute(resolved)) throw new Error(`composes: could not resolve ${wanted} from ${relativeTo}`);

    let tokens = this.tokensByFile.get(resolved);
    if (!tokens) {
      tokens = this.load(resolved);
      this.tokensByFile.set(resolved, tokens);
    }
    return tokens;
  }

  /**
   * Scope `path` with the same plugins the composing module ran, then read
   * the ICSS the scope plugin leaves behind: `:import("dep") { alias: name }`
   * for what it composes from elsewhere, `:export { name: scoped names }` for
   * what it offers. This is what postcss-modules' own parser does with them.
   */
  private async load(path: string): Promise<Tokens> {
    const source = await readFile(path, 'utf8');
    const { root } = await postcss(this.plugins).process(source, { from: path });
    const aliases = new Map<string, string>();
    const exported: Tokens = {};
    const rules: Rule[] = [];
    root.each((node) => {
      if (node.type === 'rule') rules.push(node);
    });
    for (const rule of rules) {
      const from = rule.selector.match(/^:import\((.+)\)$/);
      if (!from) continue;
      const theirs = await this.fetch(from[1], path);
      rule.walkDecls((d) => {
        aliases.set(d.prop, theirs[d.value.trim()] ?? d.value.trim());
      });
    }
    for (const rule of rules) {
      if (rule.selector !== ':export') continue;
      rule.walkDecls((d) => {
        exported[d.prop] = d.value
          .trim()
          .split(/\s+/)
          .map((name) => aliases.get(name) ?? name)
          .join(' ');
      });
    }
    return exported;
  }

  /** What postcss-modules prepends to the composing module: nothing. */
  get finalSource(): string {
    return '';
  }
}

/**
 * The plugin that puts the above into effect, and keeps the one copy of the
 * shared sheet in the build.
 *
 * Vite marks every CSS module side-effect free, so `import
 * './components/meta/craft.module.css'` with no bindings — the import in
 * `src/main.tsx` that exists only to place craft first — would be shaken out
 * of the build, and craft's CSS with it: with the pasted copies gone, nothing
 * else carries it. The `post` transform below runs after Vite's own and marks
 * that one sheet as having effects, so it stays where main.tsx put it.
 */
export function composesWithoutCopy({ shared }: { shared: string }): Plugin {
  let sheet = resolvePath(shared);
  return {
    name: 'evil-wizard:composes-without-copy',
    enforce: 'post',
    config: () => ({ css: { modules: { Loader: ComposesWithoutCopyLoader } as never } }),
    configResolved: (config) => {
      sheet = resolvePath(config.root, shared);
    },
    transform(code, id) {
      if (id.split('?')[0] !== sheet) return null;
      return { code, map: null, moduleSideEffects: 'no-treeshake' };
    },
  };
}
