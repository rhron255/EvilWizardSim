// How much sentence fits on ONE line of the seal warning at 393px.
// The header sits above the choice cards, so a second line costs 19px of the
// one budget that matters on the reference device.
import { chromium } from 'playwright';

const CANDIDATES = [
  'The Academy is 25 from the gem · you are famous enough.',
  'The Academy is 25 from the gem · and you qualify.',
  'The Academy is 25 from the gem · your fame qualifies.',
  'The Academy is done deliberating · your fame qualifies.',
  'The Academy is done deliberating · and you qualify.',
  'The Academy is 25 from the gem · it acts at 55 Notoriety.',
  'The Academy is done deliberating · it acts at 55 Notoriety.',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5178/qa/run-harness.html?scene=run', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
const out = await page.evaluate((texts) => {
  const seal = [...document.querySelectorAll('p')].find((p) =>
    p.textContent.startsWith('The Pale Academy') || p.textContent.startsWith('The Academy'),
  );
  const w = Math.round(seal.getBoundingClientRect().width);
  const rows = texts.map((t) => {
    seal.textContent = t;
    return { h: Math.round(seal.getBoundingClientRect().height), chars: t.length, t };
  });
  return { width: w, rows };
}, CANDIDATES);
console.log(`seal column: ${out.width}px`);
for (const r of out.rows) console.log(`${String(r.h).padStart(3)}px  ${String(r.chars).padStart(3)}ch  ${r.t}`);
await browser.close();
