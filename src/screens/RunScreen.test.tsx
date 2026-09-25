/**
 * Undeath cools the room.
 *
 * `isLich` was mechanically enormous and visually silent — that is why the
 * lichdom ending was reported as arriving from nowhere. The header now says
 * what you are; this is the other half, and it is the half you feel before you
 * read anything: every surface token shifts cold, so the whole screen goes
 * violet the moment the rite resolves.
 *
 * Pinned here rather than left to the eye because it is a `data-` attribute
 * driving a stylesheet — jsdom cannot see the colour, but it can see whether
 * the switch is thrown, and a switch that stops being thrown is exactly the
 * kind of silent regression this repo keeps producing.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentBundle } from '../engine';
import { artifacts, endings, epithets, factions, lairs, offers, origins } from '../content';
import type { Resolution } from '../components/run/resolution';
import type { EraRecord, RunState, ThemeId } from '../types';
import { RunScreen } from './RunScreen';
import { realDeed, realOfferWhere } from '../testing/realContent';

// Mirrors `App.tsx`'s own `CONTENT` — the real catalog, frozen once here
// rather than rebuilt per test.
const content: ContentBundle = { factions, artifacts, lairs, origins, endings, offers, epithets };

// A mid-decline run holding five real relics across two factions.
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
  knownArtifactIds: ['ninth_clause_brazier', 'antler_baton'],
  heldArtifactIds: [
    'ninth_clause_brazier',
    'antler_baton',
    'cinder_testament',
    'bone_crown',
    'root_of_the_standing_vote',
  ],
  startingArtifactIds: [],
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
  relicState: { firedOnce: [] },
  eras,
  seenOfferIds: eras.map((e) => e.offerId),
};

/**
 * A real card that names no faction anywhere — no affiliation, no standing
 * or relic-draw effect, no faction word in its prose — so this file's
 * faction-name queries can only match the panel's own status lines.
 */
const FACTION_WORDS = /Covenant|Gilded|Hand|Academy|Choir|Crown|Worm/;
const demoOffer = realOfferWhere('a card that names no faction', (o) =>
  !o.factionId &&
  !o.scripted &&
  !FACTION_WORDS.test(JSON.stringify(o)) &&
  o.options.every((x) =>
    (x.kind === 'certain' ? x.effects : [...x.onSuccess, ...x.onFailure]).every(
      (e) => e.t !== 'standing' && e.t !== 'artifactFrom',
    ),
  ),
);

const show = (
  run: RunState,
  themeId: ThemeId = 'default',
  resolution: Resolution | null = null,
  onContinue: () => void = () => {},
) =>
  render(
    <RunScreen
      run={run}
      offer={demoOffer}
      resolution={resolution}
      lairs={lairs}
      artifacts={artifacts}
      factions={factions}
      content={content}
      onChoose={() => {}}
      onContinue={onContinue}
      defense={null}
      themeId={themeId}
    />,
  );

describe('RunScreen · the lich tint', () => {
  it('leaves a living wizard warm', () => {
    const { container } = show({ ...demoRun, isLich: false } as RunState);
    expect(container.querySelector('[data-theme]')).toBeNull();
  });

  it('cools the whole screen once the rite is paid for', () => {
    const { container } = show({ ...demoRun, isLich: true } as RunState);
    expect(container.querySelector('[data-theme="lichdom"]')).not.toBeNull();
  });

  it('puts the switch on the screen root, so everything inside inherits it', () => {
    // The override is a block of surface custom properties. If it ever moves
    // off the root the resolution overlay stops inheriting and the card that
    // performs the transformation is the one card that does not show it.
    const { container } = show({ ...demoRun, isLich: true } as RunState);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('data-theme', 'lichdom');
  });
});

describe('RunScreen · the chosen theme', () => {
  it('wears what the player selected', () => {
    const { container } = show({ ...demoRun, isLich: false } as RunState, 'ascension');
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'ascension');
  });

  it('sets no attribute at all for the default, so :root stands', () => {
    // An empty `data-theme=""` would match no block and read as a thrown
    // switch that does nothing. Absence is the off state.
    const { container } = show({ ...demoRun, isLich: false } as RunState, 'default');
    expect(container.firstElementChild).not.toHaveAttribute('data-theme');
  });

  it('lets undeath outrank the wardrobe', () => {
    // The cold IS the report that the rite landed. A player wearing Peat who
    // becomes a lich must still see the room change, or the state that was
    // "mechanically enormous and visually silent" is silent again.
    const { container } = show({ ...demoRun, isLich: true } as RunState, 'retired_to_swamp');
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'lichdom');
  });
});

/**
 * Issue #36 collapsed the Decision/Career tab split into one screen: the six
 * faction standings and the decision content are both always on screen now,
 * with no tab control and nothing to switch between.
 */
describe('RunScreen · a single continuous screen', () => {
  it('shows faction standings and the offer with no tabs at all', () => {
    show(demoRun);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    // Collapsed to the two most extreme rows by default — see
    // FactionStandings.test.tsx for the full expand/collapse behavior.
    const strip = screen.getByRole('list', { name: 'Faction standing' });
    expect(within(strip).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: demoOffer.title })).toBeInTheDocument();
  });

  it('never renders a ledger', () => {
    show(demoRun);
    expect(screen.queryByText('The Ledger')).toBeNull();
  });
});

/**
 * The relic page (issue #78) is an optional view swapped in for the decision
 * content, reached from the Relics stat and never persisted.
 */
describe('RunScreen · the relic page', () => {
  it('opens the relic page from the Relics stat and returns via Back', async () => {
    show(demoRun);
    const openButton = screen.getByRole('button', { name: /Relics · 5/ });
    await userEvent.click(openButton);

    expect(screen.getByRole('heading', { name: /Your Relics/ })).toBeInTheDocument();
    // The decision content is gone while the relic page is open.
    expect(screen.queryByRole('heading', { name: demoOffer.title })).toBeNull();

    const backButton = screen.getAllByRole('button', { name: /Back to the decision/ })[0];
    await userEvent.click(backButton);

    expect(screen.queryByRole('heading', { name: /Your Relics/ })).toBeNull();
    expect(screen.getByRole('heading', { name: demoOffer.title })).toBeInTheDocument();
  });

  it('keeps the faction standings on screen while the relic page is open', async () => {
    show(demoRun);
    await userEvent.click(screen.getByRole('button', { name: /Relics · 5/ }));
    expect(screen.getByRole('list', { name: 'Faction standing' })).toBeInTheDocument();
  });

  it('moves focus to the relic page heading on open, and back to the Relics button on close', async () => {
    show(demoRun);
    const openButton = screen.getByRole('button', { name: /Relics · 5/ });
    await userEvent.click(openButton);

    expect(screen.getByRole('heading', { name: /Your Relics/ })).toHaveFocus();

    const backButton = screen.getAllByRole('button', { name: /Back to the decision/ })[0];
    await userEvent.click(backButton);

    expect(screen.getByRole('button', { name: /Relics · 5/ })).toHaveFocus();
  });

  it('opens with the keyboard (Enter) and returns with the keyboard too', async () => {
    show(demoRun);
    const openButton = screen.getByRole('button', { name: /Relics · 5/ });
    openButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('heading', { name: /Your Relics/ })).toHaveFocus();

    const backButton = screen.getAllByRole('button', { name: /Back to the decision/ })[0];
    backButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: /Relics · 5/ })).toHaveFocus();
  });
});
