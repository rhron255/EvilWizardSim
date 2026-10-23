/**
 * Feats (issue #125). Anchored to real engine output, not to values this
 * file also supplies: careers are PLAYED with the real engine, and the
 * constants the content mirrors are read from the engine.
 */
import { describe, expect, it } from 'vitest';
import { feats, FEAT_THRESHOLDS } from './feats';
import { epithets } from './epithets';
import { createRun } from '../engine';
import { DEVOTION_STANDING, PACT_LIMIT } from '../engine/constants';
import { HERO_BANDS } from '../engine/systems';
import { tierFor } from '../theme/tokens';
import { REAL_CONTENT } from '../testing/realContent';
import type { EraRecord, RunState } from '../types';

const base = (): RunState => ({
  ...createRun(
    { wizardName: 'Test', originId: REAL_CONTENT.origins[0].id, eraCount: 16, seed: 3 },
    REAL_CONTENT,
  ),
  ending: 'retired_to_swamp',
  age: 95,
});

const era = (over: Partial<EraRecord> = {}): EraRecord => ({
  eraIndex: 0,
  age: 20,
  lairId: 'rented_cellar',
  notoriety: 10,
  notorietyDelta: 0,
  followers: 0,
  artifactsGained: [],
  deedSummary: '',
  offerId: 'x',
  optionLabel: 'x',
  outcome: 'deterministic',
  phase: 'ascent',
  ...over,
});

const featById = (id: string) => {
  const f = feats.find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
};

describe('feat thresholds mirror the engine', () => {
  it('matches the constants the content cannot import', () => {
    expect(FEAT_THRESHOLDS.pactDebtJustUnder).toBe(PACT_LIMIT - 1);
    expect(FEAT_THRESHOLDS.devotion).toBe(DEVOTION_STANDING);
    expect(FEAT_THRESHOLDS.heroDangerBand).toBe(HERO_BANDS.indexOf('danger'));
    expect(FEAT_THRESHOLDS.localMenaceFloor).toBe(tierFor(40).min);
    expect(tierFor(39).id).toBe('unknown');
    expect(tierFor(40).id).toBe('local_menace');
  });
});

describe('feat predicates', () => {
  it('has unique ids and names, and none is called a deed', () => {
    expect(new Set(feats.map((f) => f.id)).size).toBe(feats.length);
    expect(new Set(feats.map((f) => f.name)).size).toBe(feats.length);
    for (const f of feats) expect(`${f.name} ${f.condition}`).not.toMatch(/\bdeeds?\b/i);
  });

  it('Six Addresses needs six distinct lairs', () => {
    const ids = ['rented_cellar', 'leaning_cottage', 'repossessed_mill', 'unfinished_tower', 'thornhollow_keep', 'screaming_spire'];
    const run = (n: number): RunState => ({
      ...base(),
      lairId: ids[n - 1],
      eras: ids.slice(0, n).map((lairId, i) => era({ eraIndex: i, lairId })),
    });
    expect(featById('six_addresses').when(run(5))).toBe(false);
    expect(featById('six_addresses').when(run(6))).toBe(true);
  });

  it('Took No Chances needs a career of eight or more eras with no gamble', () => {
    const outcomes = (o: EraRecord['outcome'][]): RunState => ({ ...base(), eras: o.map((outcome, i) => era({ eraIndex: i, outcome })) });
    const d = 'deterministic' as const;
    expect(featById('took_no_chances').when(outcomes([d, d, d, d, d, d, d]))).toBe(false);
    expect(featById('took_no_chances').when(outcomes([d, d, d, d, d, d, d, d]))).toBe(true);
    expect(featById('took_no_chances').when(outcomes([d, d, d, d, d, d, d, d, 'failure']))).toBe(false);
  });

  it('Three Throws Running needs three consecutive won gambles', () => {
    const o = (xs: EraRecord['outcome'][]): RunState => ({ ...base(), eras: xs.map((outcome, i) => era({ eraIndex: i, outcome })) });
    expect(featById('three_throws_running').when(o(['success', 'success', 'failure', 'success']))).toBe(false);
    expect(featById('three_throws_running').when(o(['success', 'success', 'success']))).toBe(true);
    // Certain choices in between do not break the streak; a lost gamble does.
    expect(featById('three_throws_running').when(o(['success', 'deterministic', 'success', 'deterministic', 'success']))).toBe(true);
  });

  it('Saw It Coming excludes the death it was a warning of', () => {
    const f = featById('saw_it_coming');
    expect(f.when({ ...base(), heroBandSeen: 2 })).toBe(true);
    expect(f.when({ ...base(), heroBandSeen: 1 })).toBe(false);
    expect(f.when({ ...base(), heroBandSeen: 2, ending: 'slain_by_chosen_one' })).toBe(false);
  });

  it('Took It With Them and Nobody to Carry the Luggage name their endings', () => {
    const held = ['a', 'b', 'c', 'd', 'e'];
    expect(featById('took_it_with_them').when({ ...base(), ending: 'slain_by_chosen_one', heldArtifactIds: held })).toBe(true);
    expect(featById('took_it_with_them').when({ ...base(), ending: 'slain_by_chosen_one', heldArtifactIds: held.slice(1) })).toBe(false);
    expect(featById('took_it_with_them').when({ ...base(), ending: 'retired_to_swamp', heldArtifactIds: held })).toBe(false);
    expect(featById('nobody_to_carry_the_luggage').when({ ...base(), followers: 0 })).toBe(true);
    expect(featById('nobody_to_carry_the_luggage').when({ ...base(), followers: 2 })).toBe(false);
    expect(featById('took_it_with_them').hiddenUntilEnding).toBe('slain_by_chosen_one');
    expect(featById('nobody_to_carry_the_luggage').hiddenUntilEnding).toBe('retired_to_swamp');
  });

  it('One Signature Short is one point under the limit and not consumed', () => {
    const f = featById('one_signature_short');
    expect(f.when({ ...base(), pactDebt: PACT_LIMIT - 1 })).toBe(true);
    expect(f.when({ ...base(), pactDebt: PACT_LIMIT - 2 })).toBe(false);
    expect(f.when({ ...base(), pactDebt: PACT_LIMIT, ending: 'consumed_by_pact' })).toBe(false);
  });

  it('Courted by Two needs two factions at devotion', () => {
    const f = featById('courted_by_two');
    const r = base();
    const st = (a: number, b: number): RunState => ({
      ...r,
      factionStanding: { ...r.factionStanding, ashen_covenant: a, gilded_hand: b },
    });
    expect(f.when(st(DEVOTION_STANDING, DEVOTION_STANDING - 1))).toBe(false);
    expect(f.when(st(DEVOTION_STANDING, DEVOTION_STANDING))).toBe(true);
  });

  it('Downsized needs a move DOWN the ladder', () => {
    const f = featById('downsized');
    const up = { ...base(), lairId: 'leaning_cottage', eras: [era({ lairId: 'rented_cellar' }), era({ eraIndex: 1, lairId: 'leaning_cottage' })] };
    const down = { ...base(), lairId: 'rented_cellar', eras: [era({ lairId: 'leaning_cottage' }), era({ eraIndex: 1, lairId: 'rented_cellar' })] };
    expect(f.when(up)).toBe(false);
    expect(f.when(down)).toBe(true);
  });

  it('Nobody Has Heard of Them needs the age limit and a peak under Local Menace', () => {
    const f = featById('nobody_has_heard_of_them');
    const done = { ...base(), eraIndex: 16, eraCount: 16 };
    expect(f.when({ ...done, notoriety: 39, eras: [era({ notoriety: 39 })] })).toBe(true);
    expect(f.when({ ...done, notoriety: 20, eras: [era({ notoriety: 40 })] })).toBe(false);
    expect(f.when({ ...done, eraIndex: 9, notoriety: 20 })).toBe(false);
  });

  it('Did Not See Sixty and Broke the Glass', () => {
    expect(featById('did_not_see_sixty').when({ ...base(), age: 59 })).toBe(true);
    expect(featById('did_not_see_sixty').when({ ...base(), age: 60 })).toBe(false);
    const r = base();
    expect(featById('broke_the_glass').when(r)).toBe(false);
    expect(featById('broke_the_glass').when({ ...r, relicState: { ...r.relicState, spent: ['x'] } })).toBe(true);
    // An automatic trigger firing is not "using" a relic.
    expect(featById('broke_the_glass').when({ ...r, relicState: { ...r.relicState, firedOnce: ['x'] } })).toBe(false);
  });
});

describe('the Good Wizard exception stays intact', () => {
  it('no predicate moves when goodActs / illActs sweep 0..10', () => {
    const run = base();
    const baseline = feats.map((f) => f.when(run));
    for (let good = 0; good <= 10; good++) {
      for (let ill = 0; ill <= 10; ill++) {
        const swept = { ...run, goodActs: good, illActs: ill };
        expect(feats.map((f) => f.when(swept))).toEqual(baseline);
      }
    }
  });
});

describe('feats and epithets stay separate vocabularies', () => {
  it('shares no name with an epithet', () => {
    const epithetTexts = new Set(epithets.map((e) => e.text.toLowerCase()));
    for (const f of feats) expect(epithetTexts.has(f.name.toLowerCase())).toBe(false);
  });
});
