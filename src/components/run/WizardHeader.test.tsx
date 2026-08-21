/**
 * The header is where this repo's most repeated bug lives: a number that
 * counts toward an ending and does not say so.
 *
 * `stakes.test.ts` covers the sentences. This covers whether they are MOUNTED,
 * and the two readouts that are conditional — the seal warning and the wards
 * line — because "correct and never rendered" is failure mode 2 and it has
 * happened four times here.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunState } from '../../types';
import { SEAL_MAX_STANDING } from '../../engine';
import { demoEarlyRun, demoFactions, demoLairs, demoRun } from './__fixtures__/demo';
import { WizardHeader } from './WizardHeader';

const show = (run: RunState, defense: number | null = 120) =>
  render(
    <WizardHeader
      run={run}
      lairs={demoLairs}
      factions={demoFactions}
      hasAscensionTrophy={false}
      defense={defense}
    />,
  );

const stat = (label: string) => screen.getByText(label).closest('div')!;

describe('WizardHeader · identity', () => {
  it('prints the name, the epithet and the age', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: 'Malvorn Ashgrave' })).toBeInTheDocument();
    expect(screen.getByText(/the Unpaid Debt/)).toBeInTheDocument();
    expect(screen.getByText('Age 75')).toBeInTheDocument();
  });

  it('names the era out of the total, and the lair', () => {
    show(demoRun);
    expect(screen.getByText('Era 12 of 18')).toBeInTheDocument();
    expect(screen.getByText('The Cathedral of Ash')).toBeInTheDocument();
  });

  it('shows the Ascension slot from era one, unearned', () => {
    // wiki/04 § Near-Miss Tuning: the empty trophy is the promise. It is never
    // explained and it is never hidden.
    show(demoEarlyRun);
    const trophy = screen.getByTitle('Ascension');
    expect(trophy).toBeInTheDocument();
    expect(trophy).not.toHaveAttribute('data-earned');
  });
});

describe('WizardHeader · disclosure', () => {
  it('prints every stat that can end a run', () => {
    show(demoRun);
    for (const label of ['Followers', 'Relics', 'Apprentices', 'Loyalty', 'Pact Debt']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the pact ceiling as a denominator, not a bare count', () => {
    show(demoRun);
    expect(within(stat('Pact Debt')).getByText('2 / 7')).toBeInTheDocument();
  });

  it('keeps the caption reachable on a phone, where it is tap-to-reveal', async () => {
    show(demoRun);
    const button = within(stat('Loyalty')).getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('lists all six factions, every run', () => {
    show(demoRun);
    const strip = screen.getByRole('list', { name: 'Faction standing' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(6);
  });

  it('warns about the seal once the Academy is close', () => {
    show(demoRun);
    expect(screen.getByText(/The Academy is/)).toBeInTheDocument();
  });

  it('says nothing about the seal when the Academy is indifferent', () => {
    const calm = {
      ...demoRun,
      factionStanding: { ...demoRun.factionStanding, pale_academy: 40 },
    };
    show(calm);
    expect(screen.queryByText(/The Academy is/)).toBeNull();
  });

  it('names the fame that arms the seal while fame is the half still missing', () => {
    const quiet = {
      ...demoRun,
      notoriety: 20,
      factionStanding: { ...demoRun.factionStanding, pale_academy: SEAL_MAX_STANDING },
    };
    show(quiet);
    expect(screen.getByText(/55 Notoriety/)).toBeInTheDocument();
  });
});

describe('WizardHeader · the wards readout', () => {
  it('appears in the decline, where a hero exists to compare against', () => {
    show(demoRun, 120);
    expect(screen.getByText('Wards')).toBeInTheDocument();
    expect(screen.getByText('The hero')).toBeInTheDocument();
  });

  it('stays out of the ascent, so the early run is clean', () => {
    show(demoEarlyRun, 60);
    expect(screen.queryByText('Wards')).toBeNull();
  });

  it('stays out when the screen has no defence to show', () => {
    show(demoRun, null);
    expect(screen.queryByText('Wards')).toBeNull();
  });
});
