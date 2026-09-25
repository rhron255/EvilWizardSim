/**
 * The odds rule, as the player actually receives it.
 *
 * `src/types.ts` makes an undisclosed downside unauthorable and
 * `effectText.ts` makes every `Effect` printable, but neither guarantees the
 * renderer puts both branches on the screen — and a rule enforced everywhere
 * except at the pixel is not enforced. wiki/04 calls printed odds "the single
 * most important rule in the codebase"; this is the test that it reached the
 * card.
 *
 * The keyboard half is here for the same reason: number keys are the primary
 * input on a desktop and the double-tap guard has a UI half (`disabled`) that
 * the engine's guard cannot see.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRun, impliedGatesOf, projectEffects } from '../../engine';
import type { ContentBundle } from '../../engine';
import type { Effect, EraRecord, Offer, OfferOption, RunState } from '../../types';
import * as C from '../../content';
import { OfferPanel } from './OfferPanel';
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

const followerCost = (effects: readonly Effect[]) =>
  -effects.reduce((sum, e) => (e.t === 'followers' && e.v < 0 ? sum + e.v : sum), 0);

/** A gamble whose losing side puts the wizard in debt and whose winning side does not. */
const losesIntoDebt = (o: OfferOption) =>
  o.kind === 'gamble' &&
  o.odds !== 0.5 &&
  o.onFailure.some((e) => e.t === 'pactDebt' && e.v > 0) &&
  !o.onSuccess.some((e) => e.t === 'pactDebt');
const movesFollowers = (o: OfferOption) =>
  o.kind === 'certain' && o.effects.some((e) => e.t === 'followers');

/**
 * A real faction card carrying every disclosure the tests below check: a
 * gamble that can lose into debt, beside a certain option that moves
 * followers. Nothing on it is gated, so every option is choosable.
 */
const demoOffer = realOfferWhere(
  'a faction card with a debt-losing gamble and a follower-moving certain option',
  (o) =>
    !!o.factionId &&
    o.options.some(losesIntoDebt) &&
    o.options.some(movesFollowers) &&
    o.options.every((x) => impliedGatesOf(x).length === 0),
);
const gambleAt = demoOffer.options.findIndex(losesIntoDebt);
const certainAt = demoOffer.options.findIndex(movesFollowers);
const demoGamble = demoOffer.options[gambleAt] as Extract<OfferOption, { kind: 'gamble' }>;

/**
 * The issue #41 shape: exactly one option, a certain one, priced in followers
 * a new wizard does not have — so the per-option pickability tests have one
 * unaffordable card to find and nothing else greyed beside it.
 */
const demoOfferGated = realOfferWhere(
  'a card whose single gated option is a follower price a new wizard cannot pay',
  (o) => {
    const gated = o.options.filter((x) => impliedGatesOf(x).length > 0);
    if (gated.length !== 1 || gated[0].kind !== 'certain') return false;
    const gates = impliedGatesOf(gated[0]);
    return gates.length === 1 && gates[0].c === 'minFollowers' && gates[0].v > demoEarlyRun.followers;
  },
);
const gatedAt = demoOfferGated.options.findIndex((x) => impliedGatesOf(x).length > 0);
const gatedOption = demoOfferGated.options[gatedAt] as Extract<OfferOption, { kind: 'certain' }>;
/** The authored price, read off the card — not from the gate logic under test. */
const price = followerCost(gatedOption.effects);

/** The same projection `App.tsx` hands the panel as `shownOffer`. */
const projected = (offer: Offer, run: RunState): Offer => ({
  ...offer,
  options: offer.options.map((o) =>
    o.kind === 'certain'
      ? { ...o, effects: projectEffects(run, o.effects, content) }
      : {
          ...o,
          onSuccess: projectEffects(run, o.onSuccess, content),
          onFailure: projectEffects(run, o.onFailure, content),
        },
  ),
});

const show = (
  offer: Offer = demoOffer,
  disabled = false,
  run: RunState = demoRun,
  bundle: ContentBundle = content,
  rawOffer?: Offer,
) => {
  const onChoose = vi.fn();
  render(
    <OfferPanel
      offer={offer}
      rawOffer={rawOffer}
      run={run}
      content={bundle}
      artifacts={C.artifacts}
      factions={C.factions}
      disabled={disabled}
      onChoose={onChoose}
    />,
  );
  return { onChoose, user: userEvent.setup() };
};

const cards = () => screen.getAllByRole('button');

describe('OfferPanel · disclosure', () => {
  it('prints one card per option, and no more', () => {
    show();
    expect(cards()).toHaveLength(demoOffer.options.length);
  });

  it('prints BOTH branches of a gamble, with complementary odds', () => {
    show();
    const gamble = cards()[gambleAt];
    // Success and failure percentages — the failure one is derived, and a
    // renderer that printed the same number twice would still look plausible.
    const win = Math.round(demoGamble.odds * 100);
    expect(within(gamble).getByText(`${win}%`)).toBeInTheDocument();
    expect(within(gamble).getByText(`${100 - win}%`)).toBeInTheDocument();
  });

  it('prints the failure branch consequences, not only its probability', () => {
    show();
    // Pact debt appears only on this gamble's losing side.
    const gamble = cards()[gambleAt];
    expect(within(gamble).getByText('Pact Debt')).toBeInTheDocument();
  });

  it('prints a certain option as one consequence list with no odds', () => {
    show();
    const certain = cards()[certainAt];
    expect(within(certain).getByText(/Followers/)).toBeInTheDocument();
    expect(within(certain).queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('names the faction the offer belongs to', () => {
    show();
    const faction = C.factions.find((f) => f.id === demoOffer.factionId)!;
    expect(screen.getByText(faction.name)).toBeInTheDocument();
  });
});

describe('OfferPanel · keyboard', () => {
  it('picks by number from anywhere on the screen', async () => {
    const { onChoose, user } = show();
    await user.keyboard('2');
    expect(onChoose).toHaveBeenCalledWith(1);
  });

  it('ignores a number with no card behind it', async () => {
    const { onChoose, user } = show();
    await user.keyboard('9');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('is inert while a resolution is up', async () => {
    // The engine refuses a second choice too, but the era must not even look
    // choosable while the overlay is open.
    const { onChoose, user } = show(demoOffer, true);
    await user.keyboard('1');
    expect(onChoose).not.toHaveBeenCalled();
    expect(cards()[0]).toBeDisabled();
  });

  it('walks the cards with the arrow keys', async () => {
    const { user } = show();
    await user.keyboard('{ArrowDown}');
    expect(cards()[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(cards()[1]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(cards()[0]).toHaveFocus();
  });

  it('commits the focused card with Enter', async () => {
    const { onChoose, user } = show();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onChoose).toHaveBeenCalledWith(1);
  });
});

/**
 * Issue #41 follow-up: a `certain` option that spends stock (Followers) to
 * fund a fixed benefit must not be presented as choosable to a wizard who
 * cannot pay for it — `demoOfferGated`'s gated option is exactly that shape.
 * The panel-wide `disabled` tests above cover the resolution-overlay case;
 * these cover the PER-OPTION case, which is new.
 */
describe('OfferPanel · affordability', () => {
  it('disables an option that spends stock the wizard does not have, and says why', () => {
    show(demoOfferGated, false, demoEarlyRun);
    const gated = screen.getByRole('button', { name: /unaffordable/i });
    expect(gated).toBeDisabled();
    expect(
      within(gated).getByText(`Requires ${price} Followers · you have ${demoEarlyRun.followers}`),
    ).toBeInTheDocument();
  });

  it('does not fire onChoose on a click for an unaffordable option', async () => {
    const { onChoose, user } = show(demoOfferGated, false, demoEarlyRun);
    await user.click(screen.getByRole('button', { name: /unaffordable/i }));
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('refuses the number-key shortcut for an unaffordable option', async () => {
    // The number key that would normally choose the gated option.
    const { onChoose, user } = show(demoOfferGated, false, demoEarlyRun);
    await user.keyboard(String(gatedAt + 1));
    expect(onChoose).not.toHaveBeenCalled();
  });

  /**
   * `App.tsx` never passes `OfferPanel` the raw content offer — it passes
   * `shownOffer`, a copy whose `certain`/`gamble` effects have been run
   * through `projectEffects` so the card prints what the engine will
   * actually do, floor clamps included. Gating computed off THAT copy would
   * see a follower cost already clamped down to what the wizard has, and
   * wave the option through — exactly the failure mode 14 hole
   * `impliedGatesOf` exists to close, reopened one layer up. `rawOffer` is
   * how the caller hands back the authored magnitudes for gating alone.
   */
  it('gates on the authored cost via rawOffer, not a projected/clamped display copy', () => {
    // The projection floor-clamps the displayed cost down to exactly what
    // the wizard has — the falsely-affordable-looking copy.
    const shown = projected(demoOfferGated, demoEarlyRun);
    const shownOption = shown.options[gatedAt];
    if (shownOption.kind !== 'certain') throw new Error('unreachable');
    expect(followerCost(shownOption.effects)).toBe(demoEarlyRun.followers);
    // `offer` is the projected copy; `rawOffer` is the authored one gating
    // must actually use.
    show(shown, false, demoEarlyRun, content, demoOfferGated);
    const gated = screen.getByRole('button', { name: /unaffordable/i });
    expect(gated).toBeDisabled();
    expect(
      within(gated).getByText(`Requires ${price} Followers · you have ${demoEarlyRun.followers}`),
    ).toBeInTheDocument();
  });

  it('leaves the SAME option fully interactive once the wizard can pay', async () => {
    // The exact same offer, for a wizard who can afford it. No `aria-label`
    // override on an affordable card, so its accessible name is its full text
    // content (label + effect list) rather than the label alone — match on
    // the label text node instead.
    expect(demoRun.followers).toBeGreaterThanOrEqual(price);
    const { onChoose, user } = show(demoOfferGated, false, demoRun);
    const affordable = screen.getByText(gatedOption.label).closest('button')!;
    expect(affordable).not.toBeDisabled();
    expect(affordable).not.toHaveAttribute('aria-label');
    await user.keyboard(String(gatedAt + 1));
    expect(onChoose).toHaveBeenCalledWith(gatedAt);
  });
});

describe('OfferPanel · ambient relic reactions (issue #80 review, styling convention 3)', () => {
  /**
   * The Mantle of Slow Moss (Self-Taught-in-a-Bog's origin relic) is an
   * UNCONDITIONAL era-end trigger: it fires the identical reaction whichever
   * option a player picks. Printing it on every one of three-plus cards is
   * exactly the repeated disclosure convention 3 bans. That disclosure moved
   * to the Relics page entirely (see `RelicPage.test.tsx`), so the offer
   * card's own job is now just to stay silent about it — on the shared
   * "Whatever you choose" line (now gone) and on every card alike.
   */
  it('omits an option-invariant era-end reaction from the offer card entirely', () => {
    const bogRun = createRun({ wizardName: 'Test', originId: 'bog_autodidact', eraCount: 16, seed: 3 }, content);
    const offer: Offer = {
      id: 'test_offer',
      title: 'Test',
      body: 'Test.',
      phase: 'any',
      options: [
        { kind: 'certain', label: 'Option A', effects: [{ t: 'notoriety', v: 1 }] },
        { kind: 'certain', label: 'Option B', effects: [{ t: 'followers', v: 2 }] },
        {
          kind: 'gamble',
          label: 'Option C',
          odds: 0.5,
          onSuccess: [{ t: 'notoriety', v: 3 }],
          onFailure: [{ t: 'notoriety', v: -1 }],
          successText: 's',
          failureText: 'f',
        },
      ],
    };
    show(offer, false, bogRun);
    expect(screen.queryByText('Whatever you choose')).toBeNull();
    expect(screen.queryByText('Mantle of Slow Moss')).toBeNull();
  });

  it('still attributes an option-DEPENDENT reaction to its own card, not to the ambient line', () => {
    // Unpaid Purse only tops followers up on a branch that leaves the wizard
    // under ten — that varies by option (A pushes past the line, B does
    // not), so the reaction must stay per-card rather than merge into one
    // ambient line that would falsely promise it either way.
    const estateRun = createRun(
      { wizardName: 'Test', originId: 'sold_masters_estate', eraCount: 16, seed: 3 },
      content,
    );
    const poorRun = { ...estateRun, followers: 3 };
    const offer: Offer = {
      id: 'test_offer_2',
      title: 'Test',
      body: 'Test.',
      phase: 'any',
      options: [
        { kind: 'certain', label: 'Option A', effects: [{ t: 'followers', v: 20 }] },
        { kind: 'certain', label: 'Option B', effects: [{ t: 'notoriety', v: 1 }] },
      ],
    };
    show(offer, false, poorRun);
    expect(screen.queryByText('Whatever you choose')).toBeNull();
    expect(screen.getAllByText('The Unpaid Purse')).toHaveLength(1);
  });
});
