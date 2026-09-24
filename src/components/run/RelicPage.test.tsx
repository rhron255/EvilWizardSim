/**
 * The relic page (issue #78) — held relics, the wards figure, the lost-this-
 * run section, and the empty state.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DefenseReadout } from '../../engine';
import type { RunState } from '../../types';
import { demoArtifacts, demoEarlyRun, demoFactions, demoRun } from './__fixtures__/demo';
import { RelicPage } from './RelicPage';

const wards = (relicsValue: number): DefenseReadout => ({
  total: 120,
  terms: [
    { label: 'Lair', value: 32, earned: true },
    { label: 'Relics', value: relicsValue, earned: true },
    { label: 'Standing ground', value: 42, earned: false },
  ],
});

const show = (
  run: RunState,
  defense: DefenseReadout | null = wards(6),
  onBack: () => void = () => {},
) =>
  render(
    <RelicPage run={run} artifacts={demoArtifacts} factions={demoFactions} defense={defense} onBack={onBack} />,
  );

describe('RelicPage · held relics', () => {
  it('renders every held relic by name', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: 'the Bone Crown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'the Antler Diadem' })).toBeInTheDocument();
  });

  it('prints the wards figure from the passed-down defense readout', () => {
    show(demoRun, wards(6));
    expect(screen.getByText(/Relics add/)).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('says nothing about wards when no defense readout is supplied', () => {
    show(demoRun, null);
    expect(screen.queryByText(/Relics add/)).toBeNull();
  });
});

describe('RelicPage · lost this run', () => {
  it('names a relic that was gained this run but is no longer held', () => {
    const lostRun = {
      ...demoRun,
      heldArtifactIds: demoRun.heldArtifactIds.filter((id) => id !== 'bone_crown'),
    } as RunState;
    show(lostRun);
    expect(screen.getByRole('heading', { name: 'Lost this run' })).toBeInTheDocument();
    // The Bone Crown is still gone-but-named — it appears once, in the lost
    // section, not among the held relics.
    const lostSection = screen.getByRole('heading', { name: 'Lost this run' }).closest('section')!;
    expect(within(lostSection).getByRole('heading', { name: 'the Bone Crown' })).toBeInTheDocument();
  });

  it('omits the section entirely when nothing gained this run was lost', () => {
    show(demoRun);
    expect(screen.queryByRole('heading', { name: 'Lost this run' })).toBeNull();
  });
});

describe('RelicPage · the empty state', () => {
  it('renders an empty state for a run with no relics at all', () => {
    show(demoEarlyRun, wards(0));
    expect(screen.getByText(/No relics recovered yet/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lost this run' })).toBeNull();
  });
});

describe('RelicPage · getting back', () => {
  it('calls back from both the top and bottom controls', async () => {
    const onBack = vi.fn();
    show(demoRun, wards(6), onBack);
    const backButtons = screen.getAllByRole('button', { name: /Back to the decision/ });
    expect(backButtons).toHaveLength(2);
    await userEvent.click(backButtons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
    await userEvent.click(backButtons[1]);
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});

describe('RelicPage · focus', () => {
  it('moves focus to the page heading on mount', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: 'Your relics' })).toHaveFocus();
  });
});
