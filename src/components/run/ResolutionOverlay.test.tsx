/**
 * The card that reports a death must show what caused it.
 *
 * Reported from play: "I died being consumed by the pact, even though the last
 * action I took had nothing to do with pacts." The interest tick that crossed
 * `PACT_LIMIT` was applied by the era-end systems, and the card renders the
 * OPTION's consequences, so the two never met.
 *
 * This renders the real overlay rather than calling `describeSystemic` alone.
 * A correct mapping that is never mounted is this repo's most repeated failure
 * (CLAUDE.md § 2), and the previous instance of it — the roll rail — survived a
 * whole build because nothing rendered the component with real engine output.
 */
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { artifacts } from '../../content/artifacts';
import { factions } from '../../content/factions';
import { BETRAYAL_MAX_LOYALTY, PACT_LIMIT } from '../../engine';
import type { Resolution, SystemicChange } from './resolution';
import { demoResolutionSuccess } from './__fixtures__/demo';
import { ResolutionOverlay } from './ResolutionOverlay';

const show = (systemic: SystemicChange[], over: Partial<Resolution> = {}) =>
  render(
    <ResolutionOverlay
      resolution={{ ...demoResolutionSuccess, systemic, ...over }}
      artifacts={artifacts}
      factions={factions}
      onContinue={() => {}}
    />,
  );

const section = () => screen.getByText('While you were elsewhere').closest('div')!;

describe('ResolutionOverlay · the verdict', () => {
  it('names a win and a loss with different words', () => {
    // "the failure / success indication is not clear enough" — the two cases
    // used to differ by one shade of grey on a six-point word.
    show([], { outcome: 'success' });
    expect(screen.getByText('Success')).toBeInTheDocument();
    cleanup();
    show([], { outcome: 'failure' });
    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  it('carries the verdict on the card itself, not only in the word', () => {
    show([], { outcome: 'failure' });
    expect(document.querySelector('[data-outcome="failure"]')).toBeInTheDocument();
  });

  it('says so when a long shot comes off', () => {
    show([], { outcome: 'success', odds: 0.18, roll: 0.05 });
    expect(screen.getByText(/Against the odds/)).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
  });

  it('keeps quiet about a win that was always likely', () => {
    show([], { outcome: 'success', odds: 0.85, roll: 0.1 });
    expect(screen.queryByText(/Against the odds/)).toBeNull();
  });

  it('never congratulates a loss at long odds', () => {
    show([], { outcome: 'failure', odds: 0.18, roll: 0.9 });
    expect(screen.queryByText(/Against the odds/)).toBeNull();
  });

  it('says nothing about odds on a certain choice', () => {
    show([], { outcome: 'deterministic', odds: undefined, roll: undefined });
    expect(screen.queryByText(/Against the odds/)).toBeNull();
  });
});

describe('ResolutionOverlay · a relic the collection has never held', () => {
  it('marks a first-ever find', () => {
    show([], { artifactsGained: [artifacts[0]], newToCollection: [artifacts[0]] });
    expect(screen.getByText('Never seen before')).toBeInTheDocument();
  });

  it('says nothing for a relic the player has found before', () => {
    // Same relic, same card — only the collection differs.
    show([], { artifactsGained: [artifacts[0]], newToCollection: [] });
    expect(screen.getByText(artifacts[0].name)).toBeInTheDocument();
    expect(screen.queryByText('Never seen before')).toBeNull();
  });

  it('marks only the new one when a card grants two', () => {
    show([], { artifactsGained: [artifacts[0], artifacts[1]], newToCollection: [artifacts[1]] });
    expect(screen.getAllByText('Never seen before')).toHaveLength(1);
  });
});

describe('ResolutionOverlay · while you were elsewhere', () => {
  it('prints the pact interest, its ceiling and the distance left', () => {
    show([{ t: 'pactInterest', v: 1, debt: 6 }]);
    const block = within(section());
    expect(block.getByText('+1')).toBeInTheDocument();
    expect(block.getByText('Pact Debt')).toBeInTheDocument();
    expect(block.getByText(new RegExp(`6 / ${PACT_LIMIT}`))).toBeInTheDocument();
  });

  it('names the Covenant, so the tick is not read as the option misfiring', () => {
    show([{ t: 'pactInterest', v: 1, debt: 6 }]);
    expect(within(section()).getByText(/Covenant/)).toBeInTheDocument();
  });

  it('prints the loyalty drift against the threshold it is walking toward', () => {
    show([{ t: 'loyaltyDrift', v: -5, loyalty: 22 }]);
    const block = within(section());
    expect(block.getByText('−5')).toBeInTheDocument();
    expect(block.getByText(new RegExp(`${BETRAYAL_MAX_LOYALTY}%`))).toBeInTheDocument();
  });

  it('says the debt is called in on the era it kills', () => {
    show([{ t: 'pactInterest', v: 1, debt: PACT_LIMIT }], { ending: 'consumed_by_pact' });
    expect(within(section()).getByText(/called in/)).toBeInTheDocument();
    expect(screen.getByText(/The run ends/)).toBeInTheDocument();
  });

  it('shows nothing at all when no tick fired', () => {
    // The ascent must stay clean: an empty block every era would be the doom
    // meter wiki/04 forbids, dressed as disclosure.
    show([]);
    expect(screen.queryByText('While you were elsewhere')).not.toBeInTheDocument();
  });

  it('keeps the systemic ticks out of the option consequence list', () => {
    show([{ t: 'pactInterest', v: 1, debt: 6 }]);
    // The fixture's own effects are +12 Notoriety and a relic; the tick must
    // not have joined them.
    expect(screen.getAllByText('Pact Debt')).toHaveLength(1);
  });
});

/**
 * The roll has to decide the verdict, not follow it.
 *
 * The pieces were always right — a rail, a threshold tick, and a needle that
 * genuinely travels to the roll. The ORDER was wrong: the verdict word
 * finished its reveal at 320ms while the needle did not land until 720ms, so
 * the card announced Success or Failure and then invited the player to watch a
 * marker slide to a position whose meaning had already been spent.
 *
 * The schedule itself is CSS and cannot be asserted in jsdom. What can be
 * pinned is the switch the schedule hangs off, and the one thing the reordering
 * must never do: withhold the verdict from the accessibility tree.
 */
describe('ResolutionOverlay · the roll decides the verdict', () => {
  const card = () => screen.getByRole('dialog').querySelector('[data-outcome]')!;

  it('marks a gamble as rolling, so the reveal waits for the needle', () => {
    show([], { outcome: 'success', roll: 0.2, odds: 0.6 });
    expect(card()).toHaveAttribute('data-rolling', 'true');
  });

  it('does NOT mark a certain choice as rolling — there is nothing to watch', () => {
    // A deterministic era has no roll and must keep the fast reveal. If this
    // ever flips, every certain choice gains a second of dead air.
    show([], { outcome: 'deterministic', roll: undefined, odds: undefined });
    expect(card()).not.toHaveAttribute('data-rolling');
  });

  it('does not mark a gamble as rolling when the engine supplied no roll', () => {
    // The roll rail shipped broken for an entire build because the engine
    // never set `roll`/`odds` (CLAUDE.md § 2). If that regresses, the card must
    // fall back to the fast reveal rather than waiting for a needle that will
    // never move.
    show([], { outcome: 'success', roll: undefined, odds: undefined });
    expect(card()).not.toHaveAttribute('data-rolling');
  });

  it('keeps the verdict in the accessibility tree from the first frame', () => {
    // The delay is presentational ONLY. The dialog is `aria-labelledby` the
    // verdict, so withholding the element — rather than its opacity — would
    // strip the dialog's accessible name for the whole sweep.
    show([], { outcome: 'failure', roll: 0.9, odds: 0.4 });
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const label = document.getElementById(labelledBy!);
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Failure');
    expect(dialog).toHaveAccessibleName('Failure');
  });
});
