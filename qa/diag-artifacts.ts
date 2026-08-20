/** Why do artifact grants fail? Count attempts vs. outcomes across real runs. */
import { writeFileSync } from 'node:fs';
import { createRun, nextOffer, resolveChoice } from '../src/engine';
import type { ContentBundle } from '../src/engine';
import { mulberry32 } from '../src/engine/rng';
import * as C from '../src/content';
import type { Effect, RunState } from '../src/types';

const content: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};

const effectsOf = (o: ReturnType<typeof nextOffer>, i: number): Effect[] => {
  const opt = o.options[i];
  return opt.kind === 'certain' ? opt.effects : [...opt.onSuccess, ...opt.onFailure];
};

let offersSeen = 0;
let offersWithArtifactOption = 0;
let grantsRequested = 0;
let grantsLanded = 0;
let losses = 0;
const requestedByRarity: Record<string, number> = {};
const landedByFaction: Record<string, number> = {};
const lockedOut: Record<string, number> = {};

// Policy: greedily take any option that can grant an artifact.
for (let r = 0; r < 800; r++) {
  const rng = mulberry32(r + 1);
  let run: RunState = createRun(
    { wizardName: 'Diag', originId: C.origins[0].id, eraCount: 16, seed: r + 1 },
    content,
  );
  for (let step = 0; step < 40 && !run.ending; step++) {
    const offer = nextOffer(run, content);
    offersSeen++;
    let pick = -1;
    for (let i = 0; i < offer.options.length; i++) {
      if (effectsOf(offer, i).some((e) => e.t === 'artifactFrom' || e.t === 'artifact')) {
        pick = i;
        break;
      }
    }
    if (pick >= 0) offersWithArtifactOption++;
    else pick = Math.floor(rng() * offer.options.length);

    const before = run.heldArtifactIds.length;
    const opt = offer.options[pick];
    const declared = (opt.kind === 'certain' ? opt.effects : opt.onSuccess).filter(
      (e) => e.t === 'artifactFrom' || e.t === 'artifact',
    );
    for (const d of declared) {
      grantsRequested++;
      if (d.t === 'artifactFrom') {
        requestedByRarity[d.rarity ?? 'any'] = (requestedByRarity[d.rarity ?? 'any'] ?? 0) + 1;
        const standing = run.factionStanding[d.factionId] ?? 0;
        if (standing <= -50) lockedOut[d.factionId] = (lockedOut[d.factionId] ?? 0) + 1;
      }
    }
    const { next, resolution } = resolveChoice(run, offer, pick, content);
    const gained = resolution.artifactsGained.length;
    grantsLanded += gained;
    for (const a of resolution.artifactsGained) {
      landedByFaction[`${a.factionId}/${a.rarity}`] = (landedByFaction[`${a.factionId}/${a.rarity}`] ?? 0) + 1;
    }
    if (next.heldArtifactIds.length < before) losses += before - next.heldArtifactIds.length;
    run = next;
  }
}

const out = [
  `runs 800`,
  `offers seen                 ${offersSeen}`,
  `offers with artifact option ${offersWithArtifactOption}  (${((offersWithArtifactOption / offersSeen) * 100).toFixed(1)}% of offers)`,
  `grants requested (success branch) ${grantsRequested}`,
  `grants LANDED                     ${grantsLanded}`,
  `artifacts LOST                    ${losses}`,
  '',
  `requested by rarity: ${JSON.stringify(requestedByRarity)}`,
  `locked out by standing: ${JSON.stringify(lockedOut)}`,
  '',
  'landed by faction/rarity:',
  ...Object.entries(landedByFaction)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k.padEnd(30)} ${v}`),
].join('\n');

writeFileSync('qa/diag-artifacts.txt', out);

// --- standing reach: how high does any faction actually get? ---
{
  const peaks: number[] = [];
  for (let r = 0; r < 600; r++) {
    const rng = mulberry32(r + 7000);
    let run: RunState = createRun(
      { wizardName: 'S', originId: C.origins[0].id, eraCount: 16, seed: r + 7000 },
      content,
    );
    let best = 0;
    for (let s = 0; s < 40 && !run.ending; s++) {
      const offer = nextOffer(run, content);
      // Greedy: maximise the best single standing.
      let pick = 0;
      let bestGain = -Infinity;
      for (let i = 0; i < offer.options.length; i++) {
        const o = offer.options[i];
        const es = o.kind === 'certain' ? o.effects : o.onSuccess;
        const g = es.filter((e) => e.t === 'standing').reduce((a, e) => a + (e as { v: number }).v, 0);
        if (g > bestGain) { bestGain = g; pick = i; }
      }
      if (bestGain <= 0) pick = Math.floor(rng() * offer.options.length);
      run = resolveChoice(run, offer, pick, content).next;
      best = Math.max(best, ...Object.values(run.factionStanding));
    }
    peaks.push(best);
  }
  peaks.sort((a, b) => a - b);
  const pct = (p: number) => peaks[Math.floor(peaks.length * p)];
  const atLeast = (n: number) => ((peaks.filter((v) => v >= n).length / peaks.length) * 100).toFixed(1);
  writeFileSync(
    'qa/diag-standing.txt',
    [
      'peak standing of the BEST faction, standing-greedy player, 600 runs',
      `median ${pct(0.5)}   p75 ${pct(0.75)}   p90 ${pct(0.9)}   max ${peaks[peaks.length - 1]}`,
      `>=45 ${atLeast(45)}%   >=55 ${atLeast(55)}%   >=70 ${atLeast(70)}%   >=85 ${atLeast(85)}%`,
    ].join('\n'),
  );
}
