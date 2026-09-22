/**
 * `OptionCard` on its own, at the prop level — independent of whatever the
 * engine's `isOptionPickable`/`impliedGatesOf` actually compute. `OfferPanel`
 * is what wires those in and derives `reason`; this file only pins the
 * CONTRACT that a `reason` prop is supposed to render, so it holds regardless
 * of which agent's work lands first.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { demoArtifacts, demoFactions, demoOffer } from './__fixtures__/demo';
import { OptionCard } from './OptionCard';

const certainOption = demoOffer.options[1]!; // 'Pay the courier and burn the envelope'
const gambleOption = demoOffer.options[0]!; // "Accept the Covenant's offer"
const REASON = 'Requires 30 Followers · you have 10';

describe('OptionCard · unaffordable (reason prop)', () => {
  it('renders the reason line in place of a certain option’s effect list', () => {
    render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    expect(within(card).getByText(REASON)).toBeInTheDocument();
    // The effect list this option would otherwise show is gone, not merely
    // hidden alongside the reason — a shorter card, not a taller one.
    expect(within(card).queryByText(/Hero Threat/)).not.toBeInTheDocument();
  });

  it('renders the reason line in place of a gamble’s odds rail', () => {
    render(
      <OptionCard
        option={gambleOption}
        index={0}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    expect(within(card).getByText(REASON)).toBeInTheDocument();
    // Both branches of the gamble — odds, arrow, success/failure text — are
    // gone, not just the odds percentages.
    expect(within(card).queryByText('35%')).not.toBeInTheDocument();
    expect(within(card).queryByText('65%')).not.toBeInTheDocument();
  });

  it('keeps the keycap and the label unchanged', () => {
    render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    expect(within(card).getByText('2')).toBeInTheDocument(); // keycap, index 1 -> "2"
    expect(within(card).getByText(certainOption.label)).toBeInTheDocument();
  });

  it('states the reason in the aria-label, mirroring ThemeSwatch’s locked pattern', () => {
    render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /unaffordable/i })).toBeInTheDocument();
  });

  it('does not fire onChoose on a click', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        reason={REASON}
        onChoose={onChoose}
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(onChoose).not.toHaveBeenCalled();
  });
});

describe('OptionCard · disabled for a reason OTHER than affordability', () => {
  it('keeps today’s look: the full effect list, no reason line, no aria-label override', () => {
    // A resolution overlay disables every card; none of them are
    // "unaffordable", so this must not regress into the short variant.
    render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    expect(card).toBeDisabled();
    expect(within(card).getByText(/Followers/)).toBeInTheDocument();
    expect(card).not.toHaveAttribute('aria-label');
    expect(card).not.toHaveAttribute('data-unaffordable');
  });
});
