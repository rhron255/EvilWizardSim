/**
 * The launch popup for the changelog (issue #67). Both exits must persist the
 * acknowledgement — the caller (`App.tsx`) does the actual persisting on the
 * callback, so what this pins is that both buttons fire it and that Dismiss
 * never also opens the full changelog (the two actions are not the same).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThemeId } from '../../types';
import { DEFAULT_THEME_ID } from '../../theme/themes';
import { ChangelogPopup } from './ChangelogPopup';

const ENTRIES = [
  { version: '2026-06-30T09:00:00Z', entry: { summary: 'Third update.', details: ['c'] } },
  { version: '2026-03-15T09:00:00Z', entry: { summary: 'Second update.', details: ['b'] } },
];

const open = (entries = ENTRIES, themeId: ThemeId = DEFAULT_THEME_ID) => {
  const onDismiss = vi.fn();
  const onViewChangelog = vi.fn();
  render(
    <ChangelogPopup entries={entries} themeId={themeId} onDismiss={onDismiss} onViewChangelog={onViewChangelog} />,
  );
  return { onDismiss, onViewChangelog, user: userEvent.setup() };
};

describe('ChangelogPopup', () => {
  it('lists every pending entry, newest first, by its one-line summary', () => {
    open();
    const summaries = screen.getAllByText(/update\./);
    expect(summaries.map((el) => el.textContent)).toEqual(['Third update.', 'Second update.']);
  });

  it('shows the date a version shipped, not the time-of-day carried for key uniqueness', () => {
    open();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
    expect(screen.queryByText(/T09:00:00Z/)).not.toBeInTheDocument();
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

  it('carries no data-theme for the default theme', () => {
    open(ENTRIES, DEFAULT_THEME_ID);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-theme');
  });

  it('wears a non-default theme itself, not just the screen behind it', () => {
    // Rendered as a sibling of TitleScreen (see App.tsx), so it does not sit
    // under TitleScreen's own data-theme attribute and has to carry one.
    open(ENTRIES, 'lichdom');
    expect(screen.getByRole('dialog')).toHaveAttribute('data-theme', 'lichdom');
  });

  it('traps Tab inside the card instead of leaking focus to whatever is behind the scrim', async () => {
    const { user } = open();
    // Something a real page would have behind the scrim: still mounted,
    // still focusable, exactly the shape of the title screen's own buttons.
    const background = document.createElement('button');
    background.textContent = 'Begin a career';
    document.body.appendChild(background);

    const view = screen.getByRole('button', { name: /view changelog/i });
    const dismiss = screen.getByRole('button', { name: /dismiss/i });
    expect(view).toHaveFocus(); // initial focus, per the mount effect

    // Forward from the last focusable control wraps to the first, never to
    // `background`.
    await user.tab();
    expect(dismiss).toHaveFocus();

    // Backward from the first wraps to the last, same reasoning.
    await user.tab({ shift: true });
    expect(view).toHaveFocus();

    expect(background).not.toHaveFocus();
    background.remove();
  });
});
