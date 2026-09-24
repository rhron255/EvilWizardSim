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
import type { Offer, RunState } from '../../types';
import {
  demoArtifacts,
  demoContent,
  demoEarlyRun,
  demoFactions,
  demoOffer,
  demoOfferGated,
  demoRun,
} from './__fixtures__/demo';
import { OfferPanel } from './OfferPanel';

const show = (
  offer: Offer = demoOffer,
  disabled = false,
  run: RunState = demoRun,
  content: ContentBundle = demoContent,
  rawOffer?: Offer,
) => {
  const onChoose = vi.fn();
  render(
    <OfferPanel
      offer={offer}
      rawOffer={rawOffer}
      run={run}
      content={content}
      artifacts={demoArtifacts}
      factions={demoFactions}
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
    show(projected, false, demoEarlyRun, demoContent, demoOfferGated);
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
