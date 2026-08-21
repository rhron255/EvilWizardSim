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
import type { Offer } from '../../types';
import { demoArtifacts, demoFactions, demoOffer } from './__fixtures__/demo';
import { OfferPanel } from './OfferPanel';

const show = (offer: Offer = demoOffer, disabled = false) => {
  const onChoose = vi.fn();
  render(
    <OfferPanel
      offer={offer}
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
