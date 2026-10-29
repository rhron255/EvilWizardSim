import { describe, expect, it } from 'vitest';
import type { EraRecord, RunState } from '../../types';
import { endings } from '../../content/endings';
import { factions } from '../../content/factions';
import { heroNameFor } from '../../content/heroes';
import { resolutionRow, shareTextFor, SHARE_URL } from './shareText';

const SECRET = {
  offerId: 'offer_SECRET_ID',
  optionLabel: 'OPTION_LABEL_SECRET',
  deedSummary: 'DEED_SECRET_SUMMARY',
  artifactsGained: ['unpaid_purse'],
};

const outcomes = ['deterministic', 'deterministic', 'success', 'deterministic', 'failure'] as const;

const eras: EraRecord[] = outcomes.map((outcome, i) => ({
  eraIndex: i,
  age: 20 + i * 10,
  lairId: 'rented_cellar',
  notoriety: 30 + i * 10,
  notorietyDelta: 10,
  followers: 5,
  ...SECRET,
  outcome,
  phase: 'ascent',
}));

const run = {
  seed: 741_853_902,
  wizardName: 'Morgath',
  epithet: 'the Second Draft',
  age: 70,
  notoriety: 50,
  eras,
  heldArtifactIds: ['unpaid_purse'],
} as unknown as RunState;

const ending = (id: string) => {
  const e = endings.find((x) => x.id === id);
  if (!e) throw new Error(id);
  return e;
};

describe('shareTextFor', () => {
  it('prints an exact literal for a slain career', () => {
    const e = ending('slain_by_chosen_one');
    expect(shareTextFor({ run, ending: e, factions })).toBe(
      [
        `Morgath the Second Draft — ${e.name}`,
        'At the hands of Perrin of the Late Harvest. Aged 20 to 70, Named Threat.',
        '· · + · ×',
        SHARE_URL,
      ].join('\n'),
    );
    expect(heroNameFor(run.seed)).toBe('Perrin of the Late Harvest');
  });

  it('omits the attribution for a self-determined ending, with no placeholder', () => {
    const text = shareTextFor({ run, ending: ending('lichdom'), factions });
    expect(text.split('\n')[1]).toBe('Aged 20 to 70, Named Threat.');
    expect(text).not.toMatch(/At the hands of|At the head of|—\s*$/m);
  });

  it('puts a comma before a capitalised epithet', () => {
    const text = shareTextFor({
      run: { ...run, epithet: 'Who Ended the Argument' },
      ending: ending('lichdom'),
      factions,
    });
    expect(text.startsWith('Morgath, Who Ended the Argument — ')).toBe(true);
  });

  it('leaks nothing from the career log', () => {
    const text = shareTextFor({ run, ending: ending('slain_by_chosen_one'), factions });
    for (const s of [SECRET.offerId, SECRET.optionLabel, SECRET.deedSummary, 'unpaid_purse', 'Purse']) {
      expect(text).not.toContain(s);
    }
  });

  it('maps the glyphs at their extremes', () => {
    expect(resolutionRow([])).toBe('');
    expect(resolutionRow(outcomes.map((outcome) => ({ outcome }))).split(' ')).toEqual(
      ['·', '·', '+', '·', '×'],
    );
    expect(resolutionRow([{ outcome: 'failure' }, { outcome: 'failure' }])).toBe('× ×');
    expect(resolutionRow([{ outcome: 'success' }])).toBe('+');
  });
});
