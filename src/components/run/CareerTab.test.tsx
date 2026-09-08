/**
 * The Career tab (issue #18) — the detailed surface. Where `DecisionTab`
 * moved the reprisal warning's UNGATED sibling, this keeps the original armed
 * warning's own gating unchanged (`WizardHeader.test.tsx`'s cases, moved),
 * and adds the two things that only make sense here: notes rendered as text
 * a phone can actually read (not a hover-only `title`), and the wards
 * itemisation that used to be computed and never shown beyond picking one
 * term.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { DefenseReadout } from '../../engine';
import type { RunState } from '../../types';
import { demoArtifacts, demoEarlyRun, demoFactions, demoLairs, demoRun } from './__fixtures__/demo';
import { CareerTab } from './CareerTab';

const wards = (total: number): DefenseReadout => ({
  total,
  terms: [
    { label: 'Lair', value: 32, earned: true },
    { label: 'Relics', value: 6, earned: true },
    { label: 'Fame', value: Math.round(total - 32 - 6 - 42), earned: true },
    { label: 'Standing ground', value: 42, earned: false },
  ],
});

const show = (run: RunState, defense: DefenseReadout | null = wards(120)) =>
  render(
    <CareerTab
      run={run}
      lairs={demoLairs}
      factions={demoFactions}
      artifacts={demoArtifacts}
      defense={defense}
      ledgerExpanded={false}
      onToggleLedgerExpanded={() => {}}
    />,
  );

describe('CareerTab · faction standing', () => {
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

describe('CareerTab · full stat captions', () => {
  // The Ledger's own column headers repeat some of these words ("Followers",
  // spelled out at 560px+) — every query here is scoped to the stats `<dl>`.
  const statsList = (container: HTMLElement) => container.querySelector('dl')!;

  it('prints every stat and its caption, with no tap required', () => {
    const { container } = show(demoRun);
    for (const label of ['Followers', 'Relics', 'Apprentices', 'Loyalty', 'Pact Debt']) {
      expect(within(statsList(container)).getByText(label)).toBeInTheDocument();
    }
    // Always shown, unlike the Decision tab's compact version — no button to
    // reveal it. demoRun carries 2/7 pact debt, so the caption is the
    // ceiling clause, not the zero-debt one.
    expect(within(statsList(container)).getByText('collected in full at 7')).toBeInTheDocument();
  });

  it('shows the pact ceiling as a denominator', () => {
    const { container } = show(demoRun);
    expect(within(statsList(container)).getByText('2 / 7')).toBeInTheDocument();
  });
});

describe('CareerTab · wards, explained', () => {
  it('itemises every term, largest first, in the decline', () => {
    show(demoRun, wards(120));
    expect(screen.getByText('Wards')).toBeInTheDocument();
    // The Ledger's own "Lair" column header repeats one of these labels, so
    // the itemised list is queried by its own accessible name.
    const list = screen.getByRole('list', { name: 'Wards breakdown' });
    expect(within(list).getByText('Lair')).toBeInTheDocument();
    expect(within(list).getByText('+32')).toBeInTheDocument();
    expect(within(list).getByText('Relics')).toBeInTheDocument();
    expect(within(list).getByText('Standing ground')).toBeInTheDocument();
  });

  it('stays out of the ascent', () => {
    show(demoEarlyRun, wards(60));
    expect(screen.queryByText('Wards')).toBeNull();
  });

  it('stays out when the screen has no defence to show', () => {
    show(demoRun, null);
    expect(screen.queryByText('Wards')).toBeNull();
  });
});

describe('CareerTab · the ledger', () => {
  it('renders the complete era history', () => {
    show(demoRun);
    expect(screen.getByText('The Ledger')).toBeInTheDocument();
    expect(screen.getByText(`${demoRun.eras.length} eras`)).toBeInTheDocument();
  });
});
