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
  const [share, content] = await Promise.all([
    import('/src/components/meta/shareImage.ts'),
    import('/src/content/index.ts'),
  ]);
  await share.preloadShareFonts();

  const ending = content.endings.find((e) => e.id === endingId) ?? content.endings[0];
  // A run's lair/relic ids must come from the SAME catalog handed to the
  // renderer below, or every lookup misses and the card reads as empty
  // sections — which looks exactly like a bug in the card.
  const lair = content.lairs[Math.min(3, content.lairs.length - 1)];
  const heldArtifacts = content.artifacts.slice(0, 3);
  const run = {
    id: 'qa-share-shot',
    seed: 1,
    wizardName: 'Malachar',
    epithet: 'the Unpaid',
    originId: content.origins[0].id,
    age: 65,
    eraIndex: 10,
    eraCount: 16,
    phase: 'decline',
    prophecyEra: 9,
    erasSinceProphecy: 1,
    notoriety: 62,
    followers: 40,
    lairId: lair.id,
    heldArtifactIds: heldArtifacts.map((a) => a.id),
    knownArtifactIds: [],
    heroBandSeen: 0,
    factionStanding: Object.fromEntries(content.factions.map((f) => [f.id, 0])),
    apprentices: { count: 1, loyalty: 50 },
    pactDebt: 0,
    heroThreat: 40,
    isLich: false,
    goodActs: 0,
    illActs: 0,
    goodWizardVowed: false,
    eras: [],
    seenOfferIds: [],
    ending: ending.id,
  };
  const blob = await share.renderEndingImage({
    run,
    ending,
    lairs: content.lairs,
    artifacts: content.artifacts,
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
