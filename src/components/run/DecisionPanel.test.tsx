/**
 * The run screen's decision content (issue #18). Three things this covers
 * that `WizardHeader.test.tsx` never had to: the next-threat line is now
 * UNCONDITIONAL (it used to be an armed-only warning), the patron line is new
 * entirely, and both have to render alongside the offer without the
 * disclosure guarantees the old header carried regressing.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentBundle, DefenseReadout } from '../../engine';
import { DEF_LICH, PACT_LIMIT } from '../../engine';
import type { EraRecord, Offer, RunState } from '../../types';
import * as C from '../../content';
import { DecisionPanel } from './DecisionPanel';
import { realDeed, realOfferWhere } from '../../testing/realContent';

const content: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};

// A mid-decline run, prophecy already fired, Notoriety just past the
// Kingdom-Level threshold and starting to erode.
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

const wards = (total: number): DefenseReadout => ({
  total,
  terms: [
    { label: 'Lair', value: 32, earned: true },
    { label: 'Relics', value: 6, earned: true },
    { label: 'Fame', value: Math.round(total - 32 - 6 - 42), earned: true },
    { label: 'Standing ground', value: 42, earned: false },
  ],
});

const show = (
  run: RunState,
  defense: DefenseReadout | null = wards(120),
  offer: Offer | null = demoOffer,
  disabled = false,
  bundle: ContentBundle = content,
) =>
  render(
    <DecisionPanel
      run={run}
      factions={C.factions}
      offer={offer}
      artifacts={C.artifacts}
      content={bundle}
      disabled={disabled}
      onChoose={() => {}}
      defense={defense}
    />,
  );

// The compact resources' labels ("Followers", "Loyalty", "Pact Debt"…) are
// not unique text on this panel — the offer's own effect chips print the
// same words (`+22 Followers`). Every query here is scoped to the stats
// `<dl>` itself rather than the whole document.
const statsList = (container: HTMLElement) => container.querySelector('dl')!;
const stat = (container: HTMLElement, label: string) =>
  within(statsList(container)).getByText(label).closest('div')!;

describe('DecisionPanel · disclosure', () => {
  it('prints every stat that can end a run', () => {
    const { container } = show(demoRun);
    for (const label of ['Followers', 'Relics', 'Apprentices', 'Loyalty', 'Pact Debt']) {
      expect(within(statsList(container)).getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the pact ceiling as a denominator, not a bare count', () => {
    const { container } = show(demoRun);
    expect(within(stat(container, 'Pact Debt')).getByText(`2 / ${PACT_LIMIT}`)).toBeInTheDocument();
  });

  it('keeps the caption reachable on a phone, where it is tap-to-reveal', async () => {
    const { container } = show(demoRun);
    const button = within(stat(container, 'Loyalty')).getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('DecisionPanel · the next-threat line', () => {
  it('names whichever faction is closest to acting, unconditionally', () => {
    // demoRun: the Crownlands sit lowest (−61) in the decline at 81 Notoriety —
    // the same case WizardHeader's warning test used to pin.
    show(demoRun);
    expect(screen.getByText(/The Crown/)).toBeInTheDocument();
  });

  it('speaks up even when nobody is anywhere near acting — this is the ambient line, not the alarm', () => {
    // Every faction tied well clear of the threshold. The OLD armed warning
    // would have said nothing here (nothing is close); the next-threat line
    // always has something to report — the tie resolves to FACTION_ORDER's
    // first entry, same as `nearestReprisalFaction` documents.
    const calm = {
      ...demoRun,
      factionStanding: {
        ashen_covenant: 40,
        gilded_hand: 40,
        pale_academy: 40,
        verdant_choir: 40,
        crownlands: 40,
        worm_below: 40,
      },
    } as RunState;
    // No offer: demoOffer's own title ("The Covenant Sends a Courier")
    // collides with the sentence this test is actually checking.
    show(calm, wards(120), null);
    expect(screen.getByText(/The Covenant/)).toBeInTheDocument();
  });

  /**
   * Reported from play: the Verdant Choir sat at −50 (5 points from ending
   * the run) while this panel named "The Academy is 75 from the gem" —
   * the Academy is live in every phase, so a `'live'`-only scan reported it
   * as "the" threat while the far closer, not-yet-live Choir went completely
   * unmentioned. Fixed by scanning every faction by standing regardless of
   * live status — pinned here at the component level, not just in
   * `allegiances.ts`.
   */
  it('names the closer faction even when its reprisal cannot fire yet', () => {
    const notYetLive = {
      ...demoRun,
      phase: 'ascent',
      erasSinceProphecy: 0,
      // Every other faction pinned well clear of the threshold, so the Choir
      // at −50 is unambiguously the lowest standing of the six — demoRun's
      // own Crownlands (−61) would otherwise still be the nearer number.
      factionStanding: {
        ashen_covenant: 0,
        gilded_hand: 0,
        pale_academy: 20,
        verdant_choir: -50,
        crownlands: 0,
        worm_below: 0,
      },
    } as RunState;
    show(notYetLive);
    expect(screen.getByText(/The Choir/)).toBeInTheDocument();
    expect(screen.queryByText(/The Academy/)).toBeNull();
  });
});

describe('DecisionPanel · the patron line', () => {
  it('says "None yet" when no faction has cleared the devotion bar and margin', () => {
    // demoRun's highest standing (Ashen Covenant, 46) sits under
    // DEVOTION_STANDING (50).
    show(demoRun);
    expect(screen.getByText('Patron')).toBeInTheDocument();
    expect(screen.getByText('None yet')).toBeInTheDocument();
  });

  it('names the faction once devotion and the exclusivity margin both clear', () => {
    const devoted = {
      ...demoRun,
      factionStanding: {
        ...demoRun.factionStanding,
        ashen_covenant: 70,
        gilded_hand: 30,
        pale_academy: -38,
      },
    } as RunState;
    // No offer, so the faction's name cannot ALSO appear as an unrelated
    // offer eyebrow — this test is about the patron line specifically.
    show(devoted, wards(120), null);
    expect(screen.getByText('The Ashen Covenant')).toBeInTheDocument();
    expect(screen.queryByText('None yet')).toBeNull();
  });
});

describe('DecisionPanel · the wards readout', () => {
  it('appears in the decline, where a hero exists to compare against', () => {
    show(demoRun, wards(120));
    expect(screen.getByText('Wards')).toBeInTheDocument();
    expect(screen.getByText('The hero')).toBeInTheDocument();
  });

  it('stays out of the ascent, so the early run is clean', () => {
    show(demoEarlyRun, wards(60));
    expect(screen.queryByText('Wards')).toBeNull();
  });

  it('stays out when the screen has no defence to show', () => {
    show(demoRun, null);
    expect(screen.queryByText('Wards')).toBeNull();
  });
});

describe('DecisionPanel · the lich says so', () => {
  it('states both things the rite changed, for as long as they are true', () => {
    const lich = { ...demoRun, isLich: true } as RunState;
    show(lich);
    const line = screen.getByText(/Undeath adds/);
    expect(line.textContent).toContain(`${DEF_LICH} Wards`);
    expect(line.textContent).toMatch(/no longer decays/i);
  });

  it('says nothing for a wizard who never took the rite', () => {
    show(demoRun);
    expect(screen.queryByText(/Undeath adds/)).toBeNull();
  });
});

describe('DecisionPanel · the Relics navigation button', () => {
  it('renders Relics as a plain caption toggle when no onOpenRelics is given', async () => {
    const { container } = show(demoRun);
    const relicsStat = stat(container, 'Relics');
    const button = within(relicsStat).getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onOpenRelics instead of toggling a caption when supplied', async () => {
    const onOpenRelics = () => {
      calls += 1;
    };
    let calls = 0;
    render(
      <DecisionPanel
        run={demoRun}
        factions={C.factions}
        offer={demoOffer}
        artifacts={C.artifacts}
        content={content}
        disabled={false}
        onChoose={() => {}}
        defense={wards(120)}
        onOpenRelics={onOpenRelics}
      />,
    );
    const button = screen.getByRole('button', { name: /Relics · 5/ });
    expect(button).not.toHaveAttribute('aria-expanded');
    await userEvent.click(button);
    expect(calls).toBe(1);
  });

  it('does not disturb the other four stats when onOpenRelics is supplied', async () => {
    const rendered = render(
      <DecisionPanel
        run={demoRun}
        factions={C.factions}
        offer={demoOffer}
        artifacts={C.artifacts}
        content={content}
        disabled={false}
        onChoose={() => {}}
        defense={wards(120)}
        onOpenRelics={() => {}}
      />,
    );
    const container = rendered.container;
    const button = within(stat(container, 'Loyalty')).getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('DecisionPanel · the offer', () => {
  it('renders the offer and its choices', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: demoOffer.title })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Choices' })).toBeInTheDocument();
  });

  it('shows a quiet placeholder between offers', () => {
    show(demoRun, wards(120), null);
    expect(screen.getByText('The era turns.')).toBeInTheDocument();
  });
});
