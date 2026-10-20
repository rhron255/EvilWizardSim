/**
 * The composed slain card (issue #121).
 *
 * Anchored to the engine's own facts where it can be: the hero name comes from
 * `heroNameFor`, the relic order from `RELIC_WARDS`, the lair from the real
 * ladder, and the route from a run built by the real reducer-side types.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artifacts } from '../../content/artifacts';
import { endings } from '../../content/endings';
import { ALL_HERO_NAMES, heroNameFor } from '../../content/heroes';
import { lairs } from '../../content/lairs';
import { SLAIN_LAIR_LINE } from '../../content/slainNarration';
import type { EraRecord, RunState } from '../../types';
import { composeSlain, DUEL_OPTION_LABEL, narrationFor, slainRoute, strongestHeldRelic } from './narration';
import { shareNarration } from './shareImage';

const slain = endings.find((e) => e.id === 'slain_by_chosen_one')!;
const reprisal = endings.find((e) => e.id === 'sealed_in_gem')!;

const era = (offerId: string, outcome: EraRecord['outcome'], optionLabel = DUEL_OPTION_LABEL): EraRecord =>
  ({ offerId, outcome, optionLabel }) as EraRecord;

const run = (over: Partial<RunState> = {}): RunState =>
  ({
    seed: 3,
    lairId: 'thornhollow_keep',
    heldArtifactIds: [],
    eras: [era('decline_sighting', 'deterministic')],
    ...over,
  }) as RunState;

const rare = artifacts.find((a) => a.rarity === 'rare')!;
const legendary = artifacts.find((a) => a.rarity === 'legendary')!;
const common = artifacts.find((a) => a.rarity === 'common')!;

describe('slainRoute', () => {
  it('the duel label is the real option whose failure ends in slain_by_chosen_one', async () => {
    const { offers } = await import('../../content');
    const offer = offers.find((o) => o.id === 'scripted_the_chosen_one')!;
    const enders = offer.options.filter(
      (o) => o.kind === 'gamble' && o.onFailure.some((e) => e.t === 'ending' && e.endingId === 'slain_by_chosen_one'),
    );
    expect(enders.map((o) => o.label)).toEqual([DUEL_OPTION_LABEL]);
  });

  it('is a breach when the failed gamble was the other one', () => {
    expect(slainRoute(run({ eras: [era('scripted_the_chosen_one', 'failure', 'Tell her about her father')] }))).toBe('breach');
  });

  it('is the duel only when the last era was the failed gate gamble', () => {
    expect(slainRoute(run({ eras: [era('scripted_the_chosen_one', 'failure')] }))).toBe('duel');
    expect(slainRoute(run({ eras: [era('scripted_the_chosen_one', 'success')] }))).toBe('breach');
    expect(slainRoute(run({ eras: [era('scripted_the_chosen_one', 'deterministic')] }))).toBe('breach');
    expect(slainRoute(run({ eras: [era('other', 'failure')] }))).toBe('breach');
    expect(slainRoute(run({ eras: [] }))).toBe('breach');
  });
});

describe('strongestHeldRelic', () => {
  it('prefers the higher rarity regardless of the order held', () => {
    const held = [common.id, legendary.id, rare.id];
    expect(strongestHeldRelic(held, artifacts)?.id).toBe(legendary.id);
  });

  it('breaks a rarity tie by catalogue order, not held order', () => {
    const [first, second] = artifacts.filter((a) => a.rarity === 'common');
    expect(strongestHeldRelic([second.id, first.id], artifacts)?.id).toBe(first.id);
  });

  it('is undefined when nothing is held', () => {
    expect(strongestHeldRelic([], artifacts)).toBeUndefined();
  });
});

describe('narrationFor', () => {
  it('leaves every other ending exactly as authored', () => {
    expect(narrationFor(reprisal, run(), { artifacts })).toBe(reprisal.narration);
  });

  it('names the hero of THIS seed in the first sentence, not "The Chosen One"', () => {
    const text = narrationFor(slain, run({ seed: 5 }), { artifacts });
    const first = text.split('. ')[0];
    expect(first.startsWith(heroNameFor(5))).toBe(true);
    expect(text).not.toContain('Chosen One');
  });

  it('prints the lair the wizard died in, and the relic as a quoted title', () => {
    const text = narrationFor(slain, run({ heldArtifactIds: [rare.id] }), { artifacts });
    expect(text).toContain(SLAIN_LAIR_LINE.thornhollow_keep);
    expect(text).toContain(`“${rare.name}.”`);
  });

  it('has a line for a wizard holding nothing and does not mention a relic', () => {
    const text = narrationFor(slain, run(), { artifacts });
    expect(text).toContain('one line long');
    expect(text).not.toContain('“');
  });

  it('tells the two routes differently', () => {
    const duel = narrationFor(slain, run({ eras: [era('scripted_the_chosen_one', 'failure')] }), { artifacts });
    const breach = narrationFor(slain, run(), { artifacts });
    expect(duel).not.toBe(breach);
  });

  it('never states a number (rule 4)', () => {
    for (const heroName of ALL_HERO_NAMES) {
      expect(composeSlain({ heroName, route: 'duel', lairId: 'rented_cellar', relicName: undefined })).not.toMatch(/\d/);
    }
  });
});

describe('every lair has a line', () => {
  it.each(lairs.map((l) => l.id))('%s', (id) => {
    expect(SLAIN_LAIR_LINE[id]).toBeTruthy();
  });
});

describe('the card and the share image tell one death', () => {
  const cases = [
    run(),
    run({ seed: 4, lairId: 'rented_cellar', heldArtifactIds: [legendary.id] }),
    run({ seed: 7, eras: [era('scripted_the_chosen_one', 'failure')], heldArtifactIds: [common.id] }),
  ];

  it.each(cases.map((c, i) => [i, c] as const))('case %i', (_i, r) => {
    const card = narrationFor(slain, r, { artifacts });
    expect(shareNarration({ run: r, ending: slain, lairs, artifacts })).toBe(card);
  });

  it('neither surface reads ending.narration directly', () => {
    for (const file of ['../../screens/EndingScreen.tsx', './shareImage.ts']) {
      const src = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(src, file).not.toMatch(/ending\.narration/);
    }
  });
});

describe('who paid', () => {
  it('has a payer line for every faction, replacing the generic nemesis line', async () => {
    const { nemesisLineFor } = await import('../../content/standing');
    for (const f of ['ashen_covenant', 'gilded_hand', 'pale_academy', 'verdant_choir', 'crownlands', 'worm_below'] as const) {
      expect(nemesisLineFor(f, 'slain_by_chosen_one')).toMatch(/bounty/);
      expect(nemesisLineFor(f, 'slain_by_chosen_one')).not.toBe(nemesisLineFor(f, 'betrayed_by_apprentice'));
    }
  });
});
