/** Throwaway orchestrator check: verify content-author claims independently. */
import { writeFileSync } from 'node:fs';
import { artifacts } from '../src/content/artifacts';
import { factions } from '../src/content/factions';
import { offers } from '../src/content/offers';
import type { FactionId, Rarity } from '../src/types';

const RARITIES: Rarity[] = ['common', 'rare', 'legendary'];

// (6) Does every faction have at least one common and one rare, so that
//     `artifactFrom` grants can never silently no-op?
const coverage = factions.map((f) => {
  const mine = artifacts.filter((a) => a.factionId === f.id);
  const counts = RARITIES.map((r) => `${r}:${mine.filter((a) => a.rarity === r).length}`);
  return `${f.id.padEnd(16)} ${counts.join('  ')}`;
});

// Which (faction, rarity) pairs do offers actually ask for?
const asked = new Set<string>();
for (const o of offers) {
  for (const opt of o.options) {
    const effs = opt.kind === 'certain' ? opt.effects : [...opt.onSuccess, ...opt.onFailure];
    for (const e of effs) {
      if (e.t === 'artifactFrom') asked.add(`${e.factionId}/${e.rarity ?? 'any'}`);
    }
  }
}
const unsatisfiable = [...asked].filter((k) => {
  const [fid, r] = k.split('/') as [FactionId, string];
  const pool = artifacts.filter((a) => a.factionId === fid);
  if (r === 'any') return pool.length === 0;
  // `rarity` is documented as a CAP, so anything at or below the cap satisfies it.
  const cap = RARITIES.indexOf(r as Rarity);
  return !pool.some((a) => RARITIES.indexOf(a.rarity) <= cap);
});

// Offer-level invariants the engine also guarantees, checked here on real content.
const noCertain = offers.filter((o) => !o.options.some((x) => x.kind === 'certain')).map((o) => o.id);
const badCount = offers.filter((o) => o.options.length < 2 || o.options.length > 4).map((o) => o.id);
const badOdds = offers
  .flatMap((o) => o.options.map((x) => ({ o, x })))
  .filter(({ x }) => x.kind === 'gamble' && !(x.odds > 0 && x.odds < 1))
  .map(({ o }) => o.id);
const emptyBranch = offers
  .flatMap((o) => o.options.map((x) => ({ o, x })))
  .filter(({ x }) => x.kind === 'gamble' && (!x.onSuccess.length || !x.onFailure.length))
  .map(({ o }) => o.id);
const dupIds = offers.map((o) => o.id).filter((id, i, a) => a.indexOf(id) !== i);

// The sentinel values flagged in the content report.
const sentinels: string[] = [];
for (const o of offers) {
  for (const opt of o.options) {
    const effs = opt.kind === 'certain' ? opt.effects : [...opt.onSuccess, ...opt.onFailure];
    const loses = effs.filter((e) => e.t === 'loseArtifact').length;
    for (const e of effs) {
      if (e.t === 'followers' && Math.abs(e.v) > 200) sentinels.push(`${o.id}: followers ${e.v}`);
      if (e.t === 'lairTier' && Math.abs(e.v) > 1) sentinels.push(`${o.id}: lairTier ${e.v}`);
    }
    if (loses > 2) sentinels.push(`${o.id}: ${loses}x loseArtifact`);
  }
}

const out = [
  `offers: ${offers.length}`,
  '',
  'rarity coverage per faction:',
  ...coverage,
  '',
  `artifactFrom asks: ${[...asked].sort().join(', ')}`,
  `UNSATISFIABLE asks: ${unsatisfiable.length ? unsatisfiable.join(', ') : 'none'}`,
  '',
  `offers with no certain option: ${noCertain.length ? noCertain.join(', ') : 'none'}`,
  `offers with bad option count : ${badCount.length ? badCount.join(', ') : 'none'}`,
  `gambles with odds outside 0..1: ${badOdds.length ? badOdds.join(', ') : 'none'}`,
  `gambles with an empty branch : ${emptyBranch.length ? emptyBranch.join(', ') : 'none'}`,
  `duplicate offer ids          : ${dupIds.length ? dupIds.join(', ') : 'none'}`,
  '',
  'sentinel / magic values:',
  ...(sentinels.length ? sentinels.map((s) => `  ${s}`) : ['  none']),
].join('\n');

writeFileSync('qa/verify-content.txt', out);
