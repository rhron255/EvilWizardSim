/**
 * Does the share image cut every ending off mid-sentence?
 *
 * `renderEndingImage` wraps `ending.narration` and keeps `.slice(0, 5)` with
 * no ellipsis. Whether that truncates is a text-measurement question, so it is
 * answered by measuring text — in a browser, with the real font loaded, using
 * the same greedy wrap the renderer uses.
 *
 * The share card is specified as the most-shared object in the game
 * (wiki/01 § 8), so an ending that always stops on a fragment is not cosmetic.
 */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const rows = await page.evaluate(async () => {
  const { endings } = await import('/src/content/index.ts');

  // Mirrors shareImage.ts: W 1080, MARGIN 46, inner = W - MARGIN*2 - 44, and
  // the narration wraps at inner - 120 in italic 25px Cormorant.
  const W = 1080;
  const MARGIN = 46;
  const inner = W - MARGIN * 2 - 44;
  const maxWidth = inner - 120;
  const font = 'italic 400 25px "Cormorant Garamond", Georgia, serif';
  const KEPT = 5;

  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  const wrap = (str) => {
    const words = str.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Mirrors `fitSentences` in shareImage.ts.
  const fitSentences = (text) => {
    const sentences = text.match(/[^.!?]+[.!?]+["’]?\s*/g) ?? [text];
    let acc = '';
    for (const sentence of sentences) {
      const candidate = `${acc}${sentence}`.trim();
      if (wrap(candidate).length > KEPT) break;
      acc = `${candidate} `;
    }
    const whole = acc.trim();
    if (whole) return wrap(whole);
    const lines = wrap(text).slice(0, KEPT);
    const last = lines.length - 1;
    if (last >= 0) lines[last] = `${lines[last].replace(/[,;:\s]+$/, '')}…`;
    return lines;
  };

  // Issue #121: the slain card is composed, so measure the composed variants
  // — every hero against the longest lair line, the longest relic name and
  // both routes — and require the hero's name to survive the share cut.
  const { composeSlain } = await import('/src/components/meta/narration.ts');
  const { ALL_HERO_NAMES } = await import('/src/content/heroes.ts');
  const { artifacts, lairs } = await import('/src/content/index.ts');
  const { SLAIN_LAIR_LINE } = await import('/src/content/slainNarration.ts');
  const longestLair = lairs.map((l) => l.id).sort((a, b) => SLAIN_LAIR_LINE[b].length - SLAIN_LAIR_LINE[a].length)[0];
  const longestRelic = artifacts.map((a) => a.name).sort((a, b) => b.length - a.length)[0];
  const variants = [];
  for (const heroName of ALL_HERO_NAMES) {
    for (const route of ['duel', 'breach']) {
      for (const relicName of [undefined, longestRelic]) {
        const text = composeSlain({ heroName, route, lairId: longestLair, relicName });
        const kept = fitSentences(text);
        variants.push({
          heroName,
          route,
          relic: relicName ?? 'none',
          chars: text.length,
          lines: wrap(text).length,
          keptLines: kept.length,
          keepsHero: kept.join(' ').includes(heroName),
          droppedSentences: Math.max(0, (text.match(/[.!?]["”’]?(\s|$)/g) ?? []).length - (kept.join(' ').match(/[.!?]["”’]?(\s|$)/g) ?? []).length),
        });
      }
    }
  }
  const longest = variants.reduce((a, b) => (b.chars > a.chars ? b : a));

  const endingRows = endings.map((e) => {
    const lines = wrap(e.narration);
    const kept = fitSentences(e.narration);
    const lastKept = kept[kept.length - 1] ?? '';
    return {
      id: e.id,
      chars: e.narration.length,
      lines: lines.length,
      overruns: lines.length > KEPT,
      keptLines: kept.length,
      endsMidSentence: !/[.!?…]["’]?$/.test(lastKept.trim()),
      keptShare: `${Math.round((kept.join(' ').length / e.narration.length) * 100)}%`,
      lastKeptTail: lastKept.slice(-46),
      summaryLines: wrap(e.summary).length,
    };
  });
  return { endingRows, variants, longest };
});
const { endingRows, variants, longest } = rows;

for (const r of endingRows) {
  console.log(
    `${r.id.padEnd(24)} ${String(r.chars).padStart(4)}ch full=${String(r.lines).padStart(2)} ` +
      `kept=${r.keptLines} (${r.keptShare.padStart(4)}) ` +
      `${r.endsMidSentence ? 'MID-SENTENCE' : 'ends clean  '} …${r.lastKeptTail}`,
  );
}
console.log(`\nsummaries all fit on one line: ${endingRows.every((r) => r.summaryLines === 1)}`);

const lost = variants.filter((v) => !v.keepsHero);
const cut = variants.filter((v) => v.droppedSentences > 0);
console.log(
  `\nslain card, ${variants.length} composed variants (every hero x both routes x longest lair x longest relic or none)`,
);
console.log(`  longest: ${longest.chars}ch, ${longest.lines} lines full, ${longest.keptLines} kept (${longest.heroName}, ${longest.route}, ${longest.relic})`);
console.log(`  hero's name survives the share cut in all of them: ${lost.length === 0}`);
console.log(`  variants where the share cut drops a whole sentence: ${cut.length} of ${variants.length}`);
if (lost.length) process.exitCode = 1;
await browser.close();
