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
  it('renders the reason line ALONGSIDE a certain option’s effect list, not in place of it', () => {
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
    // The price is exactly the thing a player needs to see on a card they
    // cannot afford — hiding it is what let a floor-clamped display number
    // read as "paid for" when the real, authored cost was higher.
    expect(within(card).getByText(/Hero Threat/)).toBeInTheDocument();
  });

  it('renders the reason line alongside a gamble’s odds rail, not in place of it', () => {
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
    expect(within(card).getByText('35%')).toBeInTheDocument();
    expect(within(card).getByText('65%')).toBeInTheDocument();
  });

  it('merges the authored gated cost into the projected effect list, rather than swapping the whole option', () => {
    // PR #85 review: swapping `option` for `rawOption` wholesale on an
    // unaffordable card silently dropped the projected Standing contagion
    // row too — an undisclosed-consequence regression, not a fix. The
    // projected copy below stands in for what `projectEffects` would
    // actually produce: Followers floor-clamped to -8, plus a SECOND
    // Standing row (`pale_academy`) that only exists because contagion added
    // it — `certainOption`'s authored effects never mention that faction.
    const projected = {
      ...certainOption,
      kind: 'certain' as const,
      effects: [
        { t: 'followers' as const, v: -2 },
        { t: 'standing' as const, factionId: 'ashen_covenant' as const, v: -8 },
        { t: 'standing' as const, factionId: 'pale_academy' as const, v: -4 },
        { t: 'heroThreat' as const, v: -3 },
      ],
    };
    render(
      <OptionCard
        option={projected}
        rawOption={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    // The gated cost reverts to certainOption's authored -60, not the
    // projected/clamped -2 `option` carries.
    expect(within(card).getByText('−60')).toBeInTheDocument();
    expect(within(card).queryByText('−2')).not.toBeInTheDocument();
    // Both projected Standing rows survive, contagion included — it exists
    // only in the projected copy, and a whole-option swap would have
    // silently dropped it.
    expect(within(card).getByText(/The Ashen Covenant/)).toBeInTheDocument();
    expect(within(card).getByText(/The Pale Academy/)).toBeInTheDocument();
  });

  it('shows a lock mark for an unaffordable card, and none for an affordable one', () => {
    const { container, rerender } = render(
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
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={demoArtifacts}
        factions={demoFactions}
        onChoose={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
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
