/**
 * The identity block, split out of the old `WizardHeader` (issue #18). These
 * cases are the identity half of what `WizardHeader.test.tsx` used to cover —
 * moved, not rewritten, because the JSX moved verbatim.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EraRecord, RunState } from '../../types';
import { lairs } from '../../content';
import { Masthead } from './Masthead';
import { realDeed } from '../../testing/realContent';

const eras: EraRecord[] = Array.from({ length: 11 }, (_, i) => ({
  eraIndex: i,
  age: 20 + i * 5,
  lairId: 'sunless_cathedral',
  notoriety: 9 + i * 7,
  notorietyDelta: 7,
  followers: 2 + i * 100,
  artifactsGained: [],
  ...realDeed(i),
  phase: i < 9 ? 'ascent' : 'decline',
}));

const demoRun: RunState = {
  id: 'run_test_0001',
  seed: 448271,
  wizardName: 'Malvorn Ashgrave',
  epithet: 'the Unpaid Debt',
  originId: 'expelled_pale_academy',
  age: 75,
  eraIndex: 11,
  eraCount: 18,
  phase: 'decline',
  prophecyEra: 9,
  erasSinceProphecy: 2,
  notoriety: 81,
  followers: 1284,
  lairId: 'sunless_cathedral',
  knownArtifactIds: [],
  heldArtifactIds: [],
  startingArtifactIds: [],
  activeGrantedArtifactIds: [],
  heroBandSeen: 0,
  factionStanding: {
    ashen_covenant: 46,
    gilded_hand: 12,
    pale_academy: -38,
    verdant_choir: -20,
    crownlands: -61,
    worm_below: 4,
  },
  apprentices: { count: 3, loyalty: 41 },
  pactDebt: 2,
  heroThreat: 34,
  isLich: false,
  goodActs: 0,
  illActs: 0,
  goodWizardVowed: false,
  relicState: { firedOnce: [], spent: [], foresight: false },
  eras,
  seenOfferIds: eras.map((e) => e.offerId),
};

const demoEarlyRun: RunState = {
  ...demoRun,
  age: 25,
  eraIndex: 1,
  phase: 'ascent',
  notoriety: 9,
  followers: 2,
  lairId: 'rented_cellar',
  heldArtifactIds: [],
  heroBandSeen: 0,
  apprentices: { count: 0, loyalty: 0 },
  pactDebt: 0,
  heroThreat: 0,
  erasSinceProphecy: 0,
  eras: eras.slice(0, 1),
};

const show = (run: RunState, hasAscensionTrophy = false) =>
  render(<Masthead run={run} lairs={lairs} hasAscensionTrophy={hasAscensionTrophy} />);

describe('Masthead · identity', () => {
  it('prints the name, the epithet and the age', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: 'Malvorn Ashgrave' })).toBeInTheDocument();
    expect(screen.getByText(/the Unpaid Debt/)).toBeInTheDocument();
    expect(screen.getByText('Age 75')).toBeInTheDocument();
  });

  it('reads as one sentence: name, epithet, full stop', () => {
    show(demoRun);
    const line = screen.getByRole('heading', { name: 'Malvorn Ashgrave' }).parentElement!;
    expect(line.textContent).toBe('Malvorn Ashgrave, the Unpaid Debt.');
  });

  it('keeps the age out of that sentence, on its own line', () => {
    show(demoRun);
    const line = screen.getByRole('heading', { name: 'Malvorn Ashgrave' }).parentElement!;
    expect(line.textContent).not.toMatch(/Age/);
    expect(screen.getByText('Age 75')).toBeInTheDocument();
  });

  it('names the era out of the total, and the lair', () => {
    show(demoRun);
    expect(screen.getByText('Era 12 of 18')).toBeInTheDocument();
    expect(screen.getByText('The Sunless Cathedral')).toBeInTheDocument();
  });

  it('shows the Ascension slot from era one, unearned', () => {
    // wiki/04 § Near-Miss Tuning: the empty trophy is the promise. It is never
    // explained and it is never hidden.
    show(demoEarlyRun);
    const trophy = screen.getByTitle('Ascension');
    expect(trophy).toBeInTheDocument();
    expect(trophy).not.toHaveAttribute('data-earned');
  });

  it('earns the trophy once Ascension is the run\'s ending', () => {
    show(demoRun, true);
    expect(screen.getByTitle('Ascension')).toHaveAttribute('data-earned', 'true');
  });
});

describe('Masthead · the lich says so', () => {
  const lich = (over: Partial<RunState> = {}): RunState =>
    ({ ...demoRun, isLich: true, ...over }) as RunState;

  it('says nothing about undeath for a wizard who never took the rite', () => {
    show(demoRun);
    expect(screen.queryByText('Undying')).toBeNull();
  });

  it('names the state beside the epithet', () => {
    show(lich());
    expect(screen.getByText('Undying')).toBeInTheDocument();
  });

  it('joins Undying to the sentence with real spaces around the separator', () => {
    // Inline layout means the gaps are JSX `{' '}`, not a flex `gap` — drop one
    // and this renders "the Unpaid Debt.·Undying".
    show(lich());
    const line = screen.getByRole('heading', { name: 'Malvorn Ashgrave' }).parentElement!;
    expect(line.textContent).toBe('Malvorn Ashgrave, the Unpaid Debt. · Undying');
  });
});
