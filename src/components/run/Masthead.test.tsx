/**
 * The identity block, split out of the old `WizardHeader` (issue #18). These
 * cases are the identity half of what `WizardHeader.test.tsx` used to cover —
 * moved, not rewritten, because the JSX moved verbatim.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RunState } from '../../types';
import { demoEarlyRun, demoLairs, demoRun } from './__fixtures__/demo';
import { Masthead } from './Masthead';

const show = (run: RunState, hasAscensionTrophy = false) =>
  render(<Masthead run={run} lairs={demoLairs} hasAscensionTrophy={hasAscensionTrophy} />);

describe('Masthead · identity', () => {
  it('prints the name, the epithet and the age', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: 'Malvorn Ashgrave' })).toBeInTheDocument();
    expect(screen.getByText(/the Unpaid Debt/)).toBeInTheDocument();
    expect(screen.getByText('Age 75')).toBeInTheDocument();
  });

  it('reads as one sentence: name, epithet, full stop', () => {
    show(demoRun);
    const line = screen.getByRole('heading', { name: 'Malvorn Ashgrave' }).parentElement!;
    expect(line.textContent).toBe('Malvorn Ashgrave, the Unpaid Debt.');
  });

  it('keeps the age out of that sentence, on its own line', () => {
    show(demoRun);
    const line = screen.getByRole('heading', { name: 'Malvorn Ashgrave' }).parentElement!;
    expect(line.textContent).not.toMatch(/Age/);
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

  it('earns the trophy once Ascension is the run\'s ending', () => {
    show(demoRun, true);
    expect(screen.getByTitle('Ascension')).toHaveAttribute('data-earned', 'true');
  });
});

describe('Masthead · the lich says so', () => {
  const lich = (over: Partial<RunState> = {}): RunState =>
    ({ ...demoRun, isLich: true, ...over }) as RunState;

  it('says nothing about undeath for a wizard who never took the rite', () => {
    show(demoRun);
    expect(screen.queryByText('Undying')).toBeNull();
  });

  it('names the state beside the epithet', () => {
    show(lich());
    expect(screen.getByText('Undying')).toBeInTheDocument();
  });

  it('joins Undying to the sentence with real spaces around the separator', () => {
    // Inline layout means the gaps are JSX `{' '}`, not a flex `gap` — drop one
    // and this renders "the Unpaid Debt.·Undying".
    show(lich());
    const line = screen.getByRole('heading', { name: 'Malvorn Ashgrave' }).parentElement!;
    expect(line.textContent).toBe('Malvorn Ashgrave, the Unpaid Debt. · Undying');
  });
});
