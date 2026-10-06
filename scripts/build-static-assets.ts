/**
 * Generates the game's static brand assets into `public/`:
 *
 *   favicon.svg               the tab icon
 *   apple-touch-icon.png      180px, what "Add to Home Screen" uses on iOS
 *   icons/icon-192.png        }  the manifest's installable icons
 *   icons/icon-512.png        }
 *   manifest.webmanifest      name, colours, icons, standalone display
 *   og.png                    1200x630 link preview (Discord, Slack, Twitter/X, iMessage)
 *
 *   npm run assets
 *
 * Why a script and not hand-drawn files: the game has no image assets on
 * purpose (`Sigil.tsx`: "the thing that has to carry the 'someone designed
 * this' weight"), and the icon should be THAT mark — the same procedural seal
 * the title screen shows — not a second identity invented for the browser
 * chrome. The geometry comes straight from `sigilGeometry.ts`, and the colours
 * from the same warm-dark tokens the game uses. Nothing here is a hex the
 * stylesheet does not already own.
 *
 * The outputs are committed. This is run by a person when the mark or the
 * tagline changes, not by the build, so a normal `npm run build` needs no
 * browser. The og image loads its two fonts from Google Fonts exactly as the
 * game does, so it needs a network connection to look right — check it.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildSigilGeometry, SIGIL_FIELD } from '../src/components/meta/sigilGeometry';

const OUT = path.resolve('public');

// Mirrors the tokens in `src/theme/tokens.css` (`:root`). Restated because a
// static file cannot read a custom property; if the palette moves, this moves.
const INK = '#e4dcc9';
const INK_BRIGHT = '#f2ecdd';
const INK_DIM = '#9a8f7c';
const INK_GHOST = '#5a5041';
const LINE_STRONG = '#3c3427';
const VOID = '#0b0a09';
const PANEL = '#13110e';

/** The mark's name. The title screen's own crest is `grimoire`. */
const MARK = 'grimoire';

function poly(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

/**
 * The full seal, as the title screen draws it, for the large og image. Same
 * layers as `Sigil.tsx`, in the same order.
 */
function fullSigil(size: number, accent: string): string {
  const g = buildSigilGeometry(MARK);
  const half = SIGIL_FIELD / 2;
  const arc = (a: { start: number; sweep: number; radius: number }) => {
    const pt = (deg: number) => {
      const r = ((deg - 90) * Math.PI) / 180;
      return { x: half + a.radius * Math.cos(r), y: half + a.radius * Math.sin(r) };
    };
    const from = pt(a.start);
    const to = pt(a.start + a.sweep);
    return `M${from.x.toFixed(2)} ${from.y.toFixed(2)} A${a.radius} ${a.radius} 0 ${a.sweep > 180 ? 1 : 0} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${SIGIL_FIELD} ${SIGIL_FIELD}" fill="none">
  <circle cx="${half}" cy="${half}" r="95" stroke="${LINE_STRONG}" stroke-width="1"/>
  <circle cx="${half}" cy="${half}" r="88" stroke="${LINE_STRONG}" stroke-width="1" stroke-dasharray="${g.dashOuter.join(' ')}" opacity="0.85"/>
  ${g.arcs.map((a) => `<path d="${arc(a)}" stroke="${accent}" stroke-width="1.4" opacity="0.55" stroke-linecap="round"/>`).join('\n  ')}
  <g stroke="${INK_GHOST}" stroke-width="1">${g.ticks.map((t) => `<line x1="${t.inner.x}" y1="${t.inner.y}" x2="${t.outer.x}" y2="${t.outer.y}"/>`).join('')}</g>
  <circle cx="${half}" cy="${half}" r="68" stroke="${LINE_STRONG}" stroke-width="1"/>
  <circle cx="${half}" cy="${half}" r="62" stroke="${INK_GHOST}" stroke-width="1" stroke-dasharray="${g.dashInner.join(' ')}" opacity="0.8"/>
  <g stroke="${accent}" stroke-width="1.5" stroke-linejoin="round" opacity="0.92">${g.starEdges.map((e) => `<line x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}"/>`).join('')}</g>
  <g fill="${accent}">${g.nodes.map((n, i) => `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" opacity="${i % 2 === 0 ? 0.95 : 0.6}"/>`).join('')}</g>
  <circle cx="${half}" cy="${half}" r="34" stroke="${LINE_STRONG}" stroke-width="1"/>
  <path d="${poly(g.innerPolygon)}" stroke="${accent}" stroke-width="1.2" opacity="0.65" stroke-linejoin="round"/>
  <g stroke="${INK_DIM}" stroke-width="1.1" stroke-linecap="round" opacity="0.75">${g.centreMarks.map((m) => `<line x1="${m.a.x}" y1="${m.a.y}" x2="${m.b.x}" y2="${m.b.y}"/>`).join('')}</g>
  <circle cx="${half}" cy="${half}" r="3.4" fill="${accent}"/>
</svg>`;
}

/**
 * The favicon: the same seal, cut down to what survives at 16px. Hairlines and
 * the tick ring vanish at that size, so this keeps only the star figure, its
 * nodes and one ring — drawn heavier — on a rounded dark tile.
 */
function iconSvg(): string {
  const g = buildSigilGeometry(MARK);
  const half = SIGIL_FIELD / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIGIL_FIELD} ${SIGIL_FIELD}" fill="none">
  <rect width="${SIGIL_FIELD}" height="${SIGIL_FIELD}" rx="44" fill="${PANEL}"/>
  <rect x="3" y="3" width="${SIGIL_FIELD - 6}" height="${SIGIL_FIELD - 6}" rx="41" stroke="${LINE_STRONG}" stroke-width="3"/>
  <circle cx="${half}" cy="${half}" r="80" stroke="${INK_DIM}" stroke-width="6"/>
  <g stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">${g.starEdges
    .map((e) => `<line x1="${(half + (e.a.x - half) * 1.16).toFixed(1)}" y1="${(half + (e.a.y - half) * 1.16).toFixed(1)}" x2="${(half + (e.b.x - half) * 1.16).toFixed(1)}" y2="${(half + (e.b.y - half) * 1.16).toFixed(1)}"/>`)
    .join('')}</g>
  <g fill="${INK_BRIGHT}">${g.nodes
    .map((n) => `<circle cx="${(half + (n.x - half) * 1.16).toFixed(1)}" cy="${(half + (n.y - half) * 1.16).toFixed(1)}" r="9"/>`)
    .join('')}</g>
  <circle cx="${half}" cy="${half}" r="8" fill="${INK_BRIGHT}"/>
</svg>`;
}

function ogHtml(): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=Inter:wght@500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;background:${VOID};overflow:hidden}
  .stage{position:relative;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;gap:64px;
    background:radial-gradient(70% 90% at 30% 40%, rgba(255,246,224,0.06), transparent 65%),radial-gradient(90% 60% at 50% 115%, rgba(0,0,0,.65), transparent 70%),${VOID}}
  .rule{position:absolute;inset:22px;border:1px solid ${LINE_STRONG};border-radius:10px;opacity:.7}
  .copy{display:flex;flex-direction:column;align-items:flex-start;max-width:660px}
  .kicker{font:500 20px/1 Inter,sans-serif;letter-spacing:.34em;text-transform:uppercase;color:${INK_DIM};margin:0 0 26px}
  h1{margin:0;font:600 118px/0.92 'Cormorant Garamond',serif;letter-spacing:-.012em;color:${INK_BRIGHT}}
  .sub{margin:20px 0 0;font:500 24px/1 Inter,sans-serif;letter-spacing:.5em;text-transform:uppercase;color:${INK_DIM}}
  .tag{margin:38px 0 0;font:italic 400 32px/1.35 'Cormorant Garamond',serif;color:${INK_DIM}}
</style></head><body><div class="stage"><div class="rule"></div>
  <div class="mark">${fullSigil(360, INK_DIM)}</div>
  <div class="copy">
    <p class="kicker">A career in eras</p>
    <h1>Evil Wizard</h1>
    <p class="sub">Simulator</p>
    <p class="tag">Build a reputation. Earn a prophecy.<br>Find out what they write about you afterwards.</p>
  </div>
</div></body></html>`;
}

async function main() {
  await mkdir(path.join(OUT, 'icons'), { recursive: true });

  const svg = iconSvg();
  await writeFile(path.join(OUT, 'favicon.svg'), svg + '\n');

  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  const page = await browser.newPage();

  // Rasterise the favicon at the three sizes a phone asks for.
  const targets: [string, number][] = [
    ['apple-touch-icon.png', 180],
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
  ];
  for (const [file, size] of targets) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body>`);
    await page.screenshot({ path: path.join(OUT, file), omitBackground: true });
  }

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(ogHtml());
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'og.png') });
  await browser.close();

  await writeFile(
    path.join(OUT, 'manifest.webmanifest'),
    JSON.stringify(
      {
        name: 'Evil Wizard Simulator',
        short_name: 'Evil Wizard',
        description: 'Build the career of an evil wizard, one era at a time. Two minutes. One life.',
        // Relative to the manifest, so it holds under the GitHub Pages
        // `/<repo>/` prefix as well as at a domain root.
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: VOID,
        theme_color: VOID,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      null,
      2,
    ) + '\n',
  );

  console.log('wrote public/{favicon.svg, apple-touch-icon.png, icons/*, manifest.webmanifest, og.png}');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
