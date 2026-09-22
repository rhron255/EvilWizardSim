/**
 * The full changelog history screen (issue #67). Available regardless of
 * cookie state, so unlike the popup it never filters by what the player has
 * acknowledged — every authored entry renders, newest first.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Changelog } from '../types';
import { demoCollection } from '../components/meta/__fixtures__/demo';
import { ChangelogScreen } from './ChangelogScreen';

const CATALOG: Changelog = {
  '2026-01-01': { summary: 'First summary.', details: ['First detail.'] },
  '2026-06-30': { summary: 'Second summary.', details: ['Second detail A.', 'Second detail B.'] },
};

const open = () => {
  const onBack = vi.fn();
  render(<ChangelogScreen changelog={CATALOG} collection={demoCollection} onBack={onBack} />);
  return { onBack, user: userEvent.setup() };
};

describe('ChangelogScreen', () => {
  it('lists every authored version, newest first', () => {
    open();
    const versions = screen.getAllByText(/^2026-/);
    expect(versions.map((el) => el.textContent)).toEqual(['2026-06-30', '2026-01-01']);
  });

  it('prints the fuller details, not just the popup summary', () => {
    open();
    expect(screen.getByText('Second detail A.')).toBeInTheDocument();
    expect(screen.getByText('Second detail B.')).toBeInTheDocument();
  });

  it('goes back to the title from either exit', async () => {
    const { onBack, user } = open();
    const backButtons = screen.getAllByRole('button', { name: /back/i });
    await user.click(backButtons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
