/**
 * Render the actual share card and write it to disk.
 *
 * The card is the most-shared object in the game and it is drawn on a canvas,
 * so nothing about it is visible in the DOM — screenshotting the ending screen
 * does not show it. This calls the real `renderEndingImage` through Vite and
 * saves the PNG it would hand to the share sheet.
 *
 *   node qa/shoot-share.mjs [endingId]
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const wanted = process.argv[2] ?? 'consumed_by_pact';
await mkdir('qa/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const dataUrl = await page.evaluate(async (endingId) => {
  const [share, content, fixtures] = await Promise.all([
    import('/src/components/meta/shareImage.ts'),
    import('/src/content/index.ts'),
    import('/src/components/run/__fixtures__/demo.ts'),
  ]);
  await share.preloadShareFonts();

  const ending = content.endings.find((e) => e.id === endingId) ?? content.endings[0];
  const run = { ...fixtures.demoRun, ending: ending.id };
  // The fixture run's lair and relic ids belong to the FIXTURE catalogs. Hand
  // the renderer the real ones and every lookup misses, which reads on the
  // card as empty sections and looks exactly like a bug in the card.
  const blob = await share.renderEndingImage({
    run,
    ending,
    lairs: fixtures.demoLairs,
    artifacts: fixtures.demoArtifacts,
  });
  if (!blob) return null;
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}, wanted);

if (!dataUrl) {
  console.log('renderEndingImage returned null — this browser cannot produce the card');
  process.exit(1);
}

const out = `qa/screenshots/share-${wanted}.png`;
await writeFile(out, Buffer.from(String(dataUrl).split(',')[1], 'base64'));
console.log(`wrote ${out}`);
await browser.close();
