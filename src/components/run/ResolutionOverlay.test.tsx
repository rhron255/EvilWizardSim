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
import { render, screen, within } from '@testing-library/react';
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
