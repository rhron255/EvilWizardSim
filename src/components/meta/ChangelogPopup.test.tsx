/**
 * The launch popup for the changelog (issue #67). Both exits must persist the
 * acknowledgement — the caller (`App.tsx`) does the actual persisting on the
 * callback, so what this pins is that both buttons fire it and that Dismiss
 * never also opens the full changelog (the two actions are not the same).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangelogPopup } from './ChangelogPopup';

const ENTRIES = [
  { version: '2026-06-30', entry: { summary: 'Third update.', details: ['c'] } },
  { version: '2026-03-15', entry: { summary: 'Second update.', details: ['b'] } },
];

const open = (entries = ENTRIES) => {
  const onDismiss = vi.fn();
  const onViewChangelog = vi.fn();
  render(<ChangelogPopup entries={entries} onDismiss={onDismiss} onViewChangelog={onViewChangelog} />);
  return { onDismiss, onViewChangelog, user: userEvent.setup() };
};

describe('ChangelogPopup', () => {
  it('lists every pending entry, newest first, by its one-line summary', () => {
    open();
    const summaries = screen.getAllByText(/update\./);
    expect(summaries.map((el) => el.textContent)).toEqual(['Third update.', 'Second update.']);
  });

  it('dismisses without opening the changelog', async () => {
    const { onDismiss, onViewChangelog, user } = open();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onViewChangelog).not.toHaveBeenCalled();
  });

  it('opens the changelog on the other action, without also dismissing', async () => {
    const { onDismiss, onViewChangelog, user } = open();
    await user.click(screen.getByRole('button', { name: /view changelog/i }));
    expect(onViewChangelog).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('closes on Escape the same way Dismiss does', async () => {
    const { onDismiss, user } = open();
    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
