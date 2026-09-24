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
import type { ContentBundle } from '../../engine';
import type { EraRecord, Offer, RunState } from '../../types';
import * as C from '../../content';
import { OfferPanel } from './OfferPanel';

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
  deedSummary: `Era ${i} deed.`,
  offerId: `era_${i}_offer`,
  optionLabel: 'Chose an option',
  outcome: 'deterministic',
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

const demoOffer: Offer = {
  id: 'covenant_courier',
  title: 'The Covenant Sends a Courier',
  body:
    'He has walked four days to hand you an envelope, and he would like you to know that. ' +
    'Inside: an offer, a wax seal shaped like a molar, and an itemised invoice for the walking.',
  phase: 'decline',
  factionId: 'ashen_covenant',
  options: [
    {
      kind: 'gamble',
      label: "Accept the Covenant's offer",
      odds: 0.35,
      onSuccess: [
        { t: 'notoriety', v: 12 },
        { t: 'artifact', artifactId: 'bone_crown' },
      ],
      onFailure: [
        { t: 'apprentices', v: -1 },
        { t: 'pactDebt', v: 1 },
      ],
      successText: 'The molar seal opens for you. Something on the other side signs its half.',
      failureText: 'Your least favourite apprentice is now the Covenant’s least favourite apprentice.',
    },
    {
      kind: 'certain',
      label: 'Pay the courier and burn the envelope',
      effects: [
        { t: 'followers', v: -60 },
        { t: 'standing', factionId: 'ashen_covenant', v: -8 },
        { t: 'heroThreat', v: -3 },
      ],
      resultText: 'The envelope burns green, which the courier says is normal.',
    },
    {
      kind: 'gamble',
      label: 'Read clause nine aloud, in the courier’s hearing',
      odds: 0.72,
      onSuccess: [
        { t: 'pactDebt', v: -1 },
        { t: 'standing', factionId: 'ashen_covenant', v: 6 },
      ],
      onFailure: [
        { t: 'notoriety', v: -5 },
        { t: 'loyalty', v: -10 },
      ],
      successText: 'Clause nine, read aloud, turns out to be void. The courier is furious about it.',
      failureText: 'Clause nine, read aloud, turns out to be about you.',
    },
  ],
  weight: 2,
};

/**
 * The issue #41 shape, in miniature: a `certain` option that spends stock
 * (30 Followers) to fund a FIXED benefit (a named artifact grant, not a
 * random draw). Exists so the per-option pickability tests have a real
 * unaffordable option to exercise, without touching `demoOffer` — used
 * elsewhere in this file for other scenarios.
 */
const demoOfferGated: Offer = {
  id: 'gated_reliquary',
  title: 'The Reliquary Keeper Names a Price',
  body: 'Everything has a price here. Some of the prices are followers.',
  phase: 'any',
  factionId: 'gilded_hand',
  options: [
    {
      kind: 'certain',
      label: 'Buy the Bone Crown outright',
      effects: [
        { t: 'followers', v: -30 },
        { t: 'artifact', artifactId: 'bone_crown' },
      ],
      resultText: 'Thirty followers walk out. The crown stays.',
    },
    {
      kind: 'certain',
      label: 'Admire it and leave',
      effects: [{ t: 'notoriety', v: 2 }],
      resultText: 'You admire it. It is put away.',
    },
  ],
};

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
    const gamble = cards()[0];
    // 35% / 65% — the failure percentage is derived, and a renderer that
    // printed the same number twice would still look plausible.
    expect(within(gamble).getByText('35%')).toBeInTheDocument();
    expect(within(gamble).getByText('65%')).toBeInTheDocument();
  });

  it('prints the failure branch consequences, not only its probability', () => {
    show();
    const gamble = cards()[0];
    expect(within(gamble).getByText('Pact Debt')).toBeInTheDocument();
    expect(within(gamble).getByText('Apprentice')).toBeInTheDocument();
  });

  it('prints a certain option as one consequence list with no odds', () => {
    show();
    const certain = cards()[1];
    expect(within(certain).getByText(/Followers/)).toBeInTheDocument();
    expect(within(certain).queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('names the faction the offer belongs to', () => {
    show();
    expect(screen.getByText('The Ashen Covenant')).toBeInTheDocument();
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
 * cannot pay for it — `demoOfferGated`'s first option is exactly that shape.
 * The panel-wide `disabled` tests above cover the resolution-overlay case;
 * these cover the PER-OPTION case, which is new.
 */
describe('OfferPanel · affordability', () => {
  it('disables an option that spends stock the wizard does not have, and says why', () => {
    // demoEarlyRun.followers === 2; the gated option costs 30.
    show(demoOfferGated, false, demoEarlyRun);
    const gated = screen.getByRole('button', { name: /unaffordable/i });
    expect(gated).toBeDisabled();
    expect(
      within(gated).getByText('Requires 30 Followers · you have 2'),
    ).toBeInTheDocument();
  });

  it('does not fire onChoose on a click for an unaffordable option', async () => {
    const { onChoose, user } = show(demoOfferGated, false, demoEarlyRun);
    await user.click(screen.getByRole('button', { name: /unaffordable/i }));
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('refuses the number-key shortcut for an unaffordable option', async () => {
    // The gated option sits at index 0, so '1' is the number that would
    // normally choose it.
    const { onChoose, user } = show(demoOfferGated, false, demoEarlyRun);
    await user.keyboard('1');
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
    // demoEarlyRun.followers === 2; the authored cost is 30, but a projected
    // copy would floor-clamp the display to -2 — exactly what the wizard has.
    const projected: Offer = {
      ...demoOfferGated,
      options: demoOfferGated.options.map((o) =>
        o.kind === 'certain' && o.label === 'Buy the Bone Crown outright'
          ? { ...o, effects: [{ t: 'followers' as const, v: -2 }, ...o.effects.slice(1)] }
          : o,
      ),
    };
    // `offer` is the projected (falsely-affordable-looking) copy; `rawOffer`
    // is the authored one gating must actually use.
    show(projected, false, demoEarlyRun, content, demoOfferGated);
    const gated = screen.getByRole('button', { name: /unaffordable/i });
    expect(gated).toBeDisabled();
    expect(
      within(gated).getByText('Requires 30 Followers · you have 2'),
    ).toBeInTheDocument();
  });

  it('leaves the SAME option fully interactive once the wizard can pay', async () => {
    // demoRun.followers === 1284 — the exact same offer, a wizard who can
    // afford it. No `aria-label` override on an affordable card, so its
    // accessible name is its full text content (label + effect list) rather
    // than the label alone — match on the label text node instead.
    const { onChoose, user } = show(demoOfferGated, false, demoRun);
    const affordable = screen.getByText('Buy the Bone Crown outright').closest('button')!;
    expect(affordable).not.toBeDisabled();
    expect(affordable).not.toHaveAttribute('aria-label');
    await user.keyboard('1');
    expect(onChoose).toHaveBeenCalledWith(0);
  });
});
