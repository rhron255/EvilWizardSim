/**
 * The full changelog history screen (issue #67). Available regardless of
 * cookie state, so unlike the popup it never filters by what the player has
 * acknowledged — every authored entry renders, newest first.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Changelog } from '../types';
import { emptyCollection } from '../engine';
import { CHANGELOG } from '../content/changelog';
import { ChangelogScreen } from './ChangelogScreen';

const demoCollection = emptyCollection();

/** Real, shipped versions — the changelog is append-only, so these never change. */
const MORNING = '2026-09-22T09:15:00Z';
const EVENING = '2026-09-22T18:40:00Z';
const TWO_DETAILS = '2026-09-23T08:30:00Z';

const open = () => {
  const onBack = vi.fn();
  render(<ChangelogScreen changelog={CHANGELOG} collection={demoCollection} onBack={onBack} />);
  return { onBack, user: userEvent.setup() };
};

describe('ChangelogScreen', () => {
  it('lists every authored version, newest first, by its date alone', () => {
    open();
    const versions = screen.getAllByText(/^\d{4}-\d{2}-\d{2}$/);
    // Displayed dates only — the time-of-day each key carries for
    // uniqueness (issue #67) is not player-facing.
    const expected = Object.keys(CHANGELOG)
      .sort()
      .reverse()
      .map((v) => v.slice(0, 10));
    expect(versions.map((el) => el.textContent)).toEqual(expected);
  });

  it('orders two versions shipped on the same day by their time, not just their date', () => {
    // Two real same-day builds, keyed morning-first so the screen has to sort.
    const sameDay: Changelog = { [MORNING]: CHANGELOG[MORNING], [EVENING]: CHANGELOG[EVENING] };
    render(<ChangelogScreen changelog={sameDay} collection={demoCollection} onBack={vi.fn()} />);
    const evening = screen.getByText(CHANGELOG[EVENING].summary);
    const morning = screen.getByText(CHANGELOG[MORNING].summary);
    expect(evening.compareDocumentPosition(morning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('prints the fuller details, not just the popup summary', () => {
    open();
    expect(CHANGELOG[TWO_DETAILS].details.length).toBeGreaterThan(1);
    for (const detail of CHANGELOG[TWO_DETAILS].details) {
      expect(screen.getByText(detail)).toBeInTheDocument();
    }
  });

  it('goes back to the title from either exit', async () => {
    const { onBack, user } = open();
    const backButtons = screen.getAllByRole('button', { name: /back/i });
    await user.click(backButtons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
