/**
 * All six faction standings, with a readable note on each — moved out of the
 * removed Career tab (issue #36) to sit directly below the masthead, and
 * collapsed to the two most extreme rows by default (issue #36 follow-up) so
 * the full six no longer cost the choice cards their screen budget on a phone.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunState } from '../../types';
import { demoFactions, demoRun } from './__fixtures__/demo';
import { FactionStandings } from './FactionStandings';

const show = (run: RunState) => render(<FactionStandings run={run} factions={demoFactions} />);

describe('FactionStandings · collapsed by default', () => {
  it('starts showing only the two most extreme factions', () => {
    // demoRun: Ashen Covenant +46 (highest), Crownlands -61 (lowest).
    show(demoRun);
    const strip = screen.getByRole('list', { name: 'Faction standings' });
    const rows = within(strip).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(strip).getByText('Covenant')).toBeInTheDocument();
    expect(within(strip).getByText('Crown')).toBeInTheDocument();
  });

  it('offers a labeled toggle to see the rest', () => {
    show(demoRun);
    const toggle = screen.getByRole('button', { name: /show all six factions/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands to all six on tap, and back on a second tap', async () => {
    show(demoRun);
    const toggle = screen.getByRole('button', { name: /show all six factions/i });

    await userEvent.click(toggle);
    const strip = screen.getByRole('list', { name: 'Faction standings' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /show fewer factions/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: /show fewer factions/i }));
    expect(within(strip).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('FactionStandings · the per-row note', () => {
  it('is hidden while collapsed — DecisionPanel\'s ambient line already says it', () => {
    show(demoRun);
    const strip = screen.getByRole('list', { name: 'Faction standings' });
    expect(
      within(strip).queryByText(/offers surface more often|escorted over the border/),
    ).toBeNull();
  });

  it('comes back once expanded, where reading all six is the point', async () => {
    show(demoRun);
    await userEvent.click(screen.getByRole('button', { name: /show all six factions/i }));
    const strip = screen.getByRole('list', { name: 'Faction standings' });
    expect(within(strip).getByText(/offers surface more often/)).toBeInTheDocument();
  });
});

/**
 * `FactionStandings` used to carry a second alarm line of its own
 * (`reprisalWarningFor`), shown only when it named a different faction than
 * `DecisionPanel`'s ambient `nextThreatFor` line — possible back when five
 * of the six reprisals were decline-only and the two functions scanned
 * differently. Now that every reprisal is live in every phase, the two
 * functions always resolve to the same faction, so that alarm could never
 * fire again and was removed; `DecisionPanel.test.tsx` covers the ambient
 * line this section no longer duplicates.
 */
describe('FactionStandings · no second alarm line', () => {
  it('never prints a reprisal sentence of its own', () => {
    show(demoRun);
    expect(screen.queryByText(/is done deliberating|from the gem|from the writ/)).toBeNull();
  });
});
