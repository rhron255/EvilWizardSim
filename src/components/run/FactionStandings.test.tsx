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
    const strip = screen.getByRole('list', { name: 'Faction standing' });
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
    const strip = screen.getByRole('list', { name: 'Faction standing' });
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
    const strip = screen.getByRole('list', { name: 'Faction standing' });
    expect(
      within(strip).queryByText(/offers surface more often|escorted over the border/),
    ).toBeNull();
  });

  it('comes back once expanded, where reading all six is the point', async () => {
    show(demoRun);
    await userEvent.click(screen.getByRole('button', { name: /show all six factions/i }));
    const strip = screen.getByRole('list', { name: 'Faction standing' });
    expect(within(strip).getByText(/offers surface more often/)).toBeInTheDocument();
  });
});

describe('FactionStandings · the reprisal alarm', () => {
  it('warns about whichever faction is closest to acting, even while collapsed', () => {
    show(demoRun);
    expect(screen.getByText(/The Crown/)).toBeInTheDocument();
  });

  it('says nothing at all when no faction is anywhere near acting', () => {
    const calm = {
      ...demoRun,
      factionStanding: { ...demoRun.factionStanding, pale_academy: 40, crownlands: 20 },
    } as RunState;
    show(calm);
    expect(screen.queryByText(/is done deliberating|from the gem|from the writ/)).toBeNull();
  });
});
