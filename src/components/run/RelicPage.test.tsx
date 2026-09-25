/**
 * The relic page (issue #78) — held relics, the wards figure, the lost-this-
 * run section, and the empty state.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DefenseReadout } from '../../engine';
import type { EraRecord, RunState } from '../../types';
import { artifacts, factions } from '../../content';
import { RelicPage } from './RelicPage';
import { realDeed, REAL_CONTENT } from '../../testing/realContent';

const wards = (relicsValue: number): DefenseReadout => ({
  total: 120,
  terms: [
    { label: 'Lair', value: 32, earned: true },
    { label: 'Relics', value: relicsValue, earned: true },
    { label: 'Standing ground', value: 42, earned: false },
  ],
});

// A mid-decline run holding a real five-relic haul across two factions. The
// Bone Crown arrives on era 7's `artifactsGained`, so a test that later drops it from `heldArtifactIds` still finds it in the
// "ever gained" union the page derives "Lost this run" from.
const eras: EraRecord[] = Array.from({ length: 11 }, (_, i) => ({
  eraIndex: i,
  age: 20 + i * 5,
  lairId: 'sunless_cathedral',
  notoriety: 9 + i * 7,
  notorietyDelta: 7,
  followers: 2 + i * 100,
  artifactsGained: i === 7 ? ['bone_crown'] : [],
  ...realDeed(i),
  phase: i < 9 ? 'ascent' : 'decline',
}));

const baseRun: RunState = {
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
  knownArtifactIds: ['ninth_clause_brazier', 'antler_baton'],
  heldArtifactIds: [
    'ninth_clause_brazier',
    'antler_baton',
    'cinder_testament',
    'bone_crown',
    'root_of_the_standing_vote',
  ],
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
  relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
  eras,
  seenOfferIds: eras.map((e) => e.offerId),
};

const earlyRun: RunState = {
  ...baseRun,
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

const show = (
  run: RunState,
  defense: DefenseReadout | null = wards(6),
  onBack: () => void = () => {},
  onUseRelic: (id: string) => void = () => {},
) =>
  render(
    <RelicPage
      run={run}
      artifacts={artifacts}
      factions={factions}
      content={REAL_CONTENT}
      defense={defense}
      onBack={onBack}
      onUseRelic={onUseRelic}
    />,
  );

describe('RelicPage · held relics', () => {
  it('renders every held relic by name, under the Artifacts heading', () => {
    show(baseRun);
    expect(screen.getByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Bone Crown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Antler Baton' })).toBeInTheDocument();
  });

  it('shows the wards figure from the passed-down defense readout as a subtitle', () => {
    show(baseRun, wards(6));
    expect(screen.getByRole('heading', { name: 'Your Relics' })).toBeInTheDocument();
    expect(screen.getByText('+6 Wards')).toBeInTheDocument();
  });

  it('says nothing about wards when no defense readout is supplied', () => {
    show(baseRun, null);
    expect(screen.getByRole('heading', { name: 'Your Relics' })).toBeInTheDocument();
    // The subtitle reads "+N Wards"; a held card's own "Wards +N." line is a
    // different string and legitimately still on screen, so match precisely.
    expect(screen.queryByText(/^\+\d+ Wards$/)).toBeNull();
  });
});

describe('RelicPage · the relic summary', () => {
  it('lists every held relic by name, with no wards figure per relic', () => {
    show(baseRun);
    const summary = screen.getByRole('group', { name: 'Relic summary' });
    expect(within(summary).getByText('The Bone Crown')).toBeInTheDocument();
    expect(within(summary).getByText('The Antler Baton')).toBeInTheDocument();
    // The page heading already states the total; a relic that adds wards and
    // nothing else (baseRun's whole haul has no power) has no line of its own.
    expect(within(summary).queryByText(/Wards/)).toBeNull();
  });

  it('names a relic with a trigger power by its terse effect, not the full sentence', () => {
    const run = { ...baseRun, heldArtifactIds: [...baseRun.heldArtifactIds, 'mantle_of_slow_moss'] };
    show(run);
    const summary = screen.getByRole('group', { name: 'Relic summary' });
    // The number and its label render as separate spans (EffectList's own
    // colour-coded markup), so check each rather than one combined string.
    expect(within(summary).getByText('+2', { exact: true })).toBeInTheDocument();
    expect(within(summary).getByText('Standing · The Verdant Choir')).toBeInTheDocument();
    expect(within(summary).queryByText(/At every era's end/)).toBeNull();
  });

  it('falls back to the descriptive sentence for a passive with no discrete effect', () => {
    const run = { ...baseRun, heldArtifactIds: [...baseRun.heldArtifactIds, 'footnote_that_bites'] };
    show(run);
    const summary = screen.getByRole('group', { name: 'Relic summary' });
    expect(
      within(summary).getByText('Passive: favoring a faction costs its rivals 50% less standing than usual.'),
    ).toBeInTheDocument();
  });

  it('says nothing when there is nothing held', () => {
    show({ ...baseRun, heldArtifactIds: [] } as RunState);
    expect(screen.queryByRole('group', { name: 'Relic summary' })).toBeNull();
  });
});

describe('RelicPage · lost this run', () => {
  it('names a relic that was gained this run but is no longer held', () => {
    const lostRun = {
      ...baseRun,
      heldArtifactIds: baseRun.heldArtifactIds.filter((id) => id !== 'bone_crown'),
    } as RunState;
    show(lostRun);
    expect(screen.getByRole('heading', { name: 'Lost this run' })).toBeInTheDocument();
    // The Bone Crown is still gone-but-named — it appears once, in the lost
    // section, not among the held relics.
    const lostSection = screen.getByRole('heading', { name: 'Lost this run' }).closest('section')!;
    expect(within(lostSection).getByRole('heading', { name: 'The Bone Crown' })).toBeInTheDocument();
  });

  it('omits the section entirely when nothing gained this run was lost', () => {
    show(baseRun);
    expect(screen.queryByRole('heading', { name: 'Lost this run' })).toBeNull();
  });

  it('names an origin relic that was lost, even though it never appeared in any era record', () => {
    // An origin's relic grant lands in `createRun`, before `eras` has a single
    // entry — `startingArtifactIds` is the only record of it, and this page
    // must fold that in the same way `recordRun`/`EndingScreen` do (Codex
    // review, PR #87: a starting relic silently vanished from history the
    // moment it was lost, since neither `heldArtifactIds` nor any
    // `era.artifactsGained` still named it).
    // baseRun's held haul never included the Unpaid Purse, so setting only
    // `startingArtifactIds` is enough to model "granted at creation, since lost".
    const lostRun = { ...baseRun, startingArtifactIds: ['unpaid_purse'] };
    show(lostRun);
    const lostSection = screen.getByRole('heading', { name: 'Lost this run' }).closest('section')!;
    expect(within(lostSection).getByRole('heading', { name: 'The Unpaid Purse' })).toBeInTheDocument();
  });

  it('names an active-granted relic that was lost, even though it never appeared in any era record either (issue #81, PR #89 review)', () => {
    // Final Ledger's own grant lands via `activateRelic`, between eras, never
    // through `resolveChoice` — `activeGrantedArtifactIds` is the only record
    // of it, the same shape of gap `startingArtifactIds` closes for an
    // origin's own grant.
    const lostRun = { ...baseRun, activeGrantedArtifactIds: ['unpaid_purse'] };
    show(lostRun);
    const lostSection = screen.getByRole('heading', { name: 'Lost this run' }).closest('section')!;
    expect(within(lostSection).getByRole('heading', { name: 'The Unpaid Purse' })).toBeInTheDocument();
  });
});

describe('RelicPage · the empty state', () => {
  it('renders an empty state for a run with no relics at all', () => {
    show(earlyRun, wards(0));
    expect(screen.getByText(/No relics recovered yet/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lost this run' })).toBeNull();
  });

  it('does not claim nothing was ever recovered when everything held was lost', () => {
    // baseRun's full haul, all subsequently lost — held is empty but the
    // Lost this run section is not, so the empty-held copy must not say
    // "recovered yet" and contradict the section right below it.
    const allLostRun = { ...baseRun, heldArtifactIds: [] } as RunState;
    show(allLostRun, wards(0));
    expect(screen.queryByText(/No relics recovered yet/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Lost this run' })).toBeInTheDocument();
  });
});

describe('RelicPage · the Use button (issue #81)', () => {
  it('shows a Use button for an unspent active relic, and calls onUseRelic with its id', async () => {
    const holder = {
      ...baseRun,
      followers: 100,
      heldArtifactIds: [...baseRun.heldArtifactIds, 'final_ledger'],
    } as RunState;
    const onUseRelic = vi.fn();
    show(holder, wards(6), () => {}, onUseRelic);
    const useButton = screen.getByRole('button', { name: /^Use /i });
    await userEvent.click(useButton);
    expect(onUseRelic).toHaveBeenCalledWith('final_ledger');
  });

  it('shows no Use button once the active is spent, and says so instead', () => {
    const holder = {
      ...baseRun,
      followers: 100,
      heldArtifactIds: [...baseRun.heldArtifactIds, 'final_ledger'],
      relicState: { firedOnce: [], spent: ['final_ledger'], foresight: false, offerRedrawSalt: 0 },
    } as RunState;
    show(holder);
    expect(screen.queryByRole('button', { name: /^Use /i })).toBeNull();
    expect(screen.getByText('Used')).toBeInTheDocument();
  });

  it('shows no Use button for an unaffordable active', () => {
    const holder = {
      ...baseRun,
      followers: 5,
      heldArtifactIds: [...baseRun.heldArtifactIds, 'final_ledger'],
    } as RunState;
    show(holder);
    expect(screen.queryByRole('button', { name: /^Use /i })).toBeNull();
  });

  it('shows no Use button for a relic with an automatic power', () => {
    show(baseRun); // holds cinder_testament — a trigger, not an active
    expect(screen.queryByRole('button', { name: /^Use /i })).toBeNull();
  });
});

describe('RelicPage · getting back', () => {
  it('has exactly one back control, and it calls back', async () => {
    const onBack = vi.fn();
    show(baseRun, wards(6), onBack);
    const backButtons = screen.getAllByRole('button', { name: /Back to the decision/ });
    expect(backButtons).toHaveLength(1);
    await userEvent.click(backButtons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('RelicPage · focus', () => {
  it('moves focus to the page heading on mount', () => {
    show(baseRun, wards(6));
    expect(screen.getByRole('heading', { name: 'Your Relics' })).toHaveFocus();
  });
});
