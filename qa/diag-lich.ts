/** Does the lichdom card ever become eligible, and is it ever offered? */
import { writeFileSync } from 'node:fs';
import { createRun, nextOffer, resolveChoice, buildOfferPool } from '../src/engine';
import type { ContentBundle } from '../src/engine';
import * as C from '../src/content';
import type { RunState } from '../src/types';

const content: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};

const LICH_ID = 'scripted_the_long_arrangement';
let runsWhereEligible = 0;
let timesSurfaced = 0;
let runsWithWormStanding20 = 0;
let becameLich = 0;
const endings: Record<string, number> = {};
let lichRuns = 0;
const wormPeaks: number[] = [];

for (let r = 0; r < 600; r++) {
  let run: RunState = createRun(
    { wizardName: 'L', originId: C.origins[0].id, eraCount: 16, seed: r + 1 },
    content,
  );
  let eligibleHere = false;
  let wormPeak = 0;
  for (let s = 0; s < 40 && !run.ending; s++) {
    wormPeak = Math.max(wormPeak, run.factionStanding.worm_below ?? 0);
    const { pool } = buildOfferPool(run, content);
    if (pool.some((o) => o.id === LICH_ID)) eligibleHere = true;

    const offer = nextOffer(run, content);
    if (offer.id === LICH_ID) timesSurfaced++;

    // Lich-seeking policy: court the Worm, and take the rite when offered.
    let pick = 0;
    if (offer.id === LICH_ID) {
      pick = 0; // "Accept. Become the thing under the hill."
    } else {
      let best = -Infinity;
      for (let i = 0; i < offer.options.length; i++) {
        const o = offer.options[i];
        const es = o.kind === 'certain' ? o.effects : o.onSuccess;
        const g = es
          .filter((e) => e.t === 'standing' && e.factionId === 'worm_below')
          .reduce((a, e) => a + (e as { v: number }).v, 0);
        if (g > best) { best = g; pick = i; }
      }
    }
    run = resolveChoice(run, offer, pick, content).next;
    if (run.isLich) becameLich++;
  }
  if (run.ending) endings[run.ending] = (endings[run.ending] ?? 0) + 1;
  if (run.isLich) lichRuns++;
  wormPeaks.push(wormPeak);
  if (eligibleHere) runsWhereEligible++;
  if (wormPeak >= 20) runsWithWormStanding20++;
}

wormPeaks.sort((a, b) => a - b);
writeFileSync(
  'qa/diag-lich.txt',
  [
    'lich-seeking policy, 600 runs',
    `runs where worm_below peaked >= 20   ${runsWithWormStanding20} (${((runsWithWormStanding20 / 600) * 100).toFixed(1)}%)`,
    `median worm peak                     ${wormPeaks[300]}`,
    `runs where the card was ELIGIBLE     ${runsWhereEligible} (${((runsWhereEligible / 600) * 100).toFixed(1)}%)`,
    `times the card was actually OFFERED  ${timesSurfaced}`,
    `runs that became a lich              ${lichRuns} (${((lichRuns / 600) * 100).toFixed(1)}%)`,
    '',
    'endings for the lich-seeking policy:',
    ...Object.entries(endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k.padEnd(26)} ${v} (${((v / 600) * 100).toFixed(1)}%)`),
  ].join('\n'),
);
