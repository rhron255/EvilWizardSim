/**
 * The ledger is the game's most important element, and it has already shipped
 * two defects that a render test catches and a type checker cannot.
 *
 *   1. The empty state was a `<td colSpan={6}>` in a table that has FIVE
 *      columns on a phone, where the Lair column is hidden. The browser
 *      invented a sixth column and the pinned header background stopped short
 *      of the frame (CLAUDE.md § 8). It now lives outside the table entirely,
 *      which is a structural fact worth pinning.
 *   2. The frame is capped at three rows on a phone. The cap is a SCROLLPORT
 *      height, never a slice of the data — every era stays in the DOM, or the
 *      record has stopped being a record.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EraRecord } from '../../types';
import { demoArtifacts, demoEras, demoLairs } from './__fixtures__/demo';
import { Ledger } from './Ledger';

const show = (eras: EraRecord[]) =>
  render(<Ledger eras={eras} lairs={demoLairs} artifacts={demoArtifacts} />);

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

describe('Ledger', () => {
  it('renders every era, however long the run', () => {
    show(demoEras);
    expect(bodyRows()).toHaveLength(demoEras.length);
  });

  it('keeps every era in the DOM while collapsed — the cap is a height, not a slice', async () => {
    const { rerender } = show(demoEras);
    const before = bodyRows().length;
    await userEvent.click(screen.getByRole('button', { name: /eras/i }));
    rerender(<Ledger eras={demoEras} lairs={demoLairs} artifacts={demoArtifacts} />);
    expect(bodyRows()).toHaveLength(before);
  });

  it('marks the newest era as the live row, and only that one', () => {
    show(demoEras);
    const current = bodyRows().filter((r) => r.getAttribute('data-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0]).toBe(bodyRows().at(-1));
  });

  it('appends without rewriting what is already there', () => {
    const { rerender } = show(demoEras.slice(0, 3));
    const first = bodyRows()[0].textContent;
    rerender(<Ledger eras={demoEras} lairs={demoLairs} artifacts={demoArtifacts} />);
    expect(bodyRows()[0].textContent).toBe(first);
    expect(bodyRows().length).toBeGreaterThan(3);
  });

  it('keeps the empty state OUT of the table, so no colSpan can disagree with it', () => {
    // The bug this pins: a row spanning "all columns" is a lie at some
    // breakpoint, because the Lair column is hidden below 700px.
    show([]);
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryAllByRole('row')).toHaveLength(1);
    expect(document.querySelector('td[colspan]')).toBeNull();
  });

  it('offers the expand toggle only when there is something to expand', () => {
    const { unmount } = show([]);
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    show(demoEras);
    expect(screen.getByRole('button', { name: /eras/i })).toBeInTheDocument();
  });

  it('counts one era in the singular', () => {
    show(demoEras.slice(0, 1));
    expect(screen.getByRole('button', { name: /^1 era/ })).toBeInTheDocument();
  });

  it('names all six columns for a screen reader', () => {
    show(demoEras);
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Age',
      'Lair',
      'NotorietyNot.',
      'FollowersFol.',
      'ArtifactsRel.',
      'Deeds',
    ]);
  });
});
