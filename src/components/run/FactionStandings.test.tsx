/**
 * All six faction standings, with a readable note on each — moved out of the
 * removed Career tab (issue #36) to sit directly below the masthead.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { RunState } from '../../types';
import { demoFactions, demoRun } from './__fixtures__/demo';
import { FactionStandings } from './FactionStandings';

const show = (run: RunState) => render(<FactionStandings run={run} factions={demoFactions} />);

describe('FactionStandings', () => {
  it('lists all six factions, with a readable note on each', () => {
    show(demoRun);
    const strip = screen.getByRole('list', { name: 'Faction standing' });
    const rows = within(strip).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    // "indifferent" is `noteFor`'s neutral note — visible text, not a
    // hover-only `title`, because a phone has no hover.
    expect(within(strip).getAllByText(/indifferent|offers|reliquary|deliberating|appointment|writ|ash|auction|gem|loam/).length).toBeGreaterThan(0);
  });

  it('warns about whichever faction is closest to acting', () => {
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
