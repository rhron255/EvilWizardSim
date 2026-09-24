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
import type { Effect, OfferOption } from '../../types';
import type { RelicReactionPreview } from '../../engine';
import { createRun, projectEffects } from '../../engine';
import { REAL_CONTENT, realOfferWhere } from '../../testing/realContent';
import * as C from '../../content';
import { OptionCard } from './OptionCard';

const artifacts = C.artifacts;
const factions = C.factions;

const followerCost = (effects: readonly Effect[]) =>
  -effects.reduce((sum, e) => (e.t === 'followers' && e.v < 0 ? sum + e.v : sum), 0);
const hostile = new Set(factions.filter((f) => f.hostileTo.length > 0).map((f) => f.id));

/**
 * A real certain option with a follower price, a hero-threat move, and a
 * standing change toward a faction with enemies — so the engine's own
 * projection adds contagion rows its authored list never names.
 */
const isPaying = (o: OfferOption) =>
  o.kind === 'certain' &&
  followerCost(o.effects) > 1 &&
  o.effects.some((e) => e.t === 'heroThreat') &&
  o.effects.some((e) => e.t === 'standing' && hostile.has(e.factionId));
const certainOption = realOfferWhere(
  'a certain option with a follower price, a hero-threat move, and a contagious standing change',
  (o) => o.options.some(isPaying),
).options.find(isPaying) as Extract<OfferOption, { kind: 'certain' }>;
const cost = followerCost(certainOption.effects);

const isUneven = (o: OfferOption) => o.kind === 'gamble' && o.odds !== 0.5;
const gambleOption = realOfferWhere('a card with a gamble at uneven odds', (o) =>
  o.options.some(isUneven),
).options.find(isUneven) as Extract<OfferOption, { kind: 'gamble' }>;

const start = createRun(
  { wizardName: 'Test', originId: C.origins[0].id, eraCount: 16, seed: 42 },
  REAL_CONTENT,
);
/** What the engine prints for `certainOption` to a wizard holding `have` followers. */
const projectedFor = (have: number) =>
  projectEffects({ ...start, followers: have }, certainOption.effects, REAL_CONTENT);
/**
 * A follower count short of the price whose floor-clamped figure is not a
 * number any other row on the card also prints, so the assertions below can
 * tell the clamped cost from the authored one.
 */
const HAVE = Array.from({ length: cost - 1 }, (_, i) => i + 1).find((n) =>
  projectedFor(n).every((e) => e.t === 'followers' || !('v' in e) || Math.abs(e.v) !== n),
)!;
const REASON = `Requires ${cost} Followers · you have ${HAVE}`;

describe('OptionCard · unaffordable (reason prop)', () => {
  it('renders the reason line ALONGSIDE a certain option’s effect list, not in place of it', () => {
    render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={artifacts}
        factions={factions}
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
        artifacts={artifacts}
        factions={factions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    expect(within(card).getByText(REASON)).toBeInTheDocument();
    const win = Math.round(gambleOption.odds * 100);
    expect(within(card).getByText(`${win}%`)).toBeInTheDocument();
    expect(within(card).getByText(`${100 - win}%`)).toBeInTheDocument();
  });

  it('merges the authored gated cost into the projected effect list, rather than swapping the whole option', () => {
    // PR #85 review: swapping `option` for `rawOption` wholesale on an
    // unaffordable card silently dropped the projected Standing contagion
    // row too — an undisclosed-consequence regression, not a fix. `projected`
    // is what `projectEffects` really prints to a wizard this short: the
    // follower cost floor-clamped, plus Standing rows for factions the
    // authored option never mentions — contagion along `hostileTo`.
    const projected = { ...certainOption, effects: projectedFor(HAVE) };
    expect(projected.effects).toContainEqual({ t: 'followers', v: -HAVE });
    const authoredFactions = new Set(
      certainOption.effects.flatMap((e) => (e.t === 'standing' ? [e.factionId] : [])),
    );
    const shownFactions = projected.effects.flatMap((e) => (e.t === 'standing' ? [e.factionId] : []));
    expect(shownFactions.some((id) => !authoredFactions.has(id))).toBe(true);
    render(
      <OptionCard
        option={projected}
        rawOption={certainOption}
        index={1}
        artifacts={artifacts}
        factions={factions}
        disabled
        reason={REASON}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    // The gated cost reverts to the authored price, not the projected/clamped
    // figure `option` carries.
    expect(within(card).getByText(`\u2212${cost}`)).toBeInTheDocument();
    expect(within(card).queryByText(`\u2212${HAVE}`)).not.toBeInTheDocument();
    // Every projected Standing row survives, contagion included — those rows
    // exist only in the projected copy, and a whole-option swap would have
    // silently dropped them.
    for (const id of shownFactions) {
      const name = factions.find((f) => f.id === id)!.name;
      expect(within(card).getByText(new RegExp(name))).toBeInTheDocument();
    }
  });

  it('shows a lock mark for an unaffordable card, and none for an affordable one', () => {
    const { container, rerender } = render(
      <OptionCard
        option={certainOption}
        index={1}
        artifacts={artifacts}
        factions={factions}
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
        artifacts={artifacts}
        factions={factions}
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
        artifacts={artifacts}
        factions={factions}
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
        artifacts={artifacts}
        factions={factions}
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
        artifacts={artifacts}
        factions={factions}
        disabled
        reason={REASON}
        onChoose={onChoose}
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(onChoose).not.toHaveBeenCalled();
  });
});

/**
 * Rule 1's newest corollary (issue #80): "any deterministic relic reaction is
 * projected onto the offer card before the player commits." `reactions` is
 * the prop `OfferPanel` derives from `projectReactions`; this file pins only
 * what `OptionCard` does with it, the same contract-at-the-prop-level split
 * the file's own header comment describes for `reason`.
 */
describe('OptionCard · relic reactions (issue #80)', () => {
  const option: OfferOption = { kind: 'certain', label: 'Sign it', effects: [{ t: 'pactDebt', v: 2 }] };
  const reactions: RelicReactionPreview = {
    kind: 'certain',
    events: [{ artifactId: 'ashen_signature', applied: [{ t: 'pactDebt', v: -1 }] }],
  };

  it('renders one attributed line for the relic that reacts, alongside the option’s own effects', () => {
    render(
      <OptionCard
        option={option}
        index={0}
        artifacts={artifacts}
        factions={factions}
        reactions={reactions}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    expect(within(card).getByText('The Ashen Signature')).toBeInTheDocument();
    expect(within(card).getByText('+2')).toBeInTheDocument(); // the option's own, untouched
    expect(within(card).getByText('−1')).toBeInTheDocument(); // the relic's own, attributed
  });

  it('renders nothing extra when no relic reacts to this option', () => {
    render(
      <OptionCard option={option} index={0} artifacts={artifacts} factions={factions} onChoose={() => {}} />,
    );
    const card = screen.getByRole('button');
    expect(within(card).queryByText('The Ashen Signature')).not.toBeInTheDocument();
  });

  it('attributes a gamble’s two branches separately, never merging them', () => {
    const gamble: OfferOption = {
      kind: 'gamble',
      label: 'Risk it',
      odds: 0.5,
      onSuccess: [{ t: 'pactDebt', v: 2 }],
      onFailure: [{ t: 'pactDebt', v: 3 }],
      successText: 'It goes well.',
      failureText: 'It does not.',
    };
    const gambleReactions: RelicReactionPreview = {
      kind: 'gamble',
      onSuccess: [{ artifactId: 'ashen_signature', applied: [{ t: 'pactDebt', v: -1 }] }],
      onFailure: [],
    };
    render(
      <OptionCard
        option={gamble}
        index={0}
        artifacts={artifacts}
        factions={factions}
        reactions={gambleReactions}
        onChoose={() => {}}
      />,
    );
    const card = screen.getByRole('button');
    // Exactly one attribution — the failure branch's own preview is empty.
    expect(within(card).getAllByText('The Ashen Signature')).toHaveLength(1);
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
        artifacts={artifacts}
        factions={factions}
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
