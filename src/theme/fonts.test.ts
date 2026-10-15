import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const css = readFileSync(resolve(__dirname, 'fonts.css'), 'utf8');

describe('self-hosted fonts (#111)', () => {
  it('index.html makes no request to a font host', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('every @font-face points at a file that ships in public/fonts', () => {
    const urls = [...css.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBe(10);
    for (const f of urls) expect(existsSync(resolve(root, 'public/fonts', f)), f).toBe(true);
  });

  it('declares both families the tokens name, with their licences beside them', () => {
    expect(css).toContain("font-family: 'Cormorant Garamond'");
    expect(css).toContain("font-family: 'Inter'");
    expect(existsSync(resolve(root, 'public/fonts/OFL-CormorantGaramond.txt'))).toBe(true);
    expect(existsSync(resolve(root, 'public/fonts/OFL-Inter.txt'))).toBe(true);
  });
});
