/**
 * The Use button lives in the icon column, under the glyph (issue #81) —
 * moved here from a standalone element on the relic page so the control that
 * ACTS on a relic sits with its portrait, not beside the prose describing it.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtifactCard } from './ArtifactCard';
import { artifacts } from '../../content/artifacts';

const finalLedger = artifacts.find((a) => a.id === 'final_ledger')!;

describe('ArtifactCard · onUseActive / activeSpent', () => {
  it('renders no button at all when onUseActive is omitted', () => {
    render(<ArtifactCard artifact={finalLedger} />);
    expect(screen.queryByRole('button', { name: 'Use' })).toBeNull();
    expect(screen.queryByText('Used')).toBeNull();
  });

  it('renders a Use button that calls onUseActive when pressed', async () => {
    const onUseActive = vi.fn();
    render(<ArtifactCard artifact={finalLedger} onUseActive={onUseActive} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(onUseActive).toHaveBeenCalledTimes(1);
  });

  it('shows "Used" instead of the button once activeSpent is true, even with onUseActive still supplied', () => {
    render(<ArtifactCard artifact={finalLedger} onUseActive={() => {}} activeSpent />);
    expect(screen.queryByRole('button', { name: 'Use' })).toBeNull();
    expect(screen.getByText('Used')).toBeInTheDocument();
  });

  it('shows neither the button nor "Used" on a locked card, regardless of the props', () => {
    render(<ArtifactCard artifact={finalLedger} locked onUseActive={() => {}} activeSpent />);
    expect(screen.queryByRole('button', { name: 'Use' })).toBeNull();
    expect(screen.queryByText('Used')).toBeNull();
  });
});
