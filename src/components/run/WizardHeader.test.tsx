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
import { DEF_LICH, SEAL_MAX_STANDING } from '../../engine';
import { LICH_LINE } from './effectText';
import { lichSentence } from './stakes';
import type { DefenseReadout } from '../../engine';
import { demoEarlyRun, demoFactions, demoLairs, demoRun } from './__fixtures__/demo';
import { WizardHeader } from './WizardHeader';

/**
 * A defence readout with named terms, because the wards caption now has to
 * report where the wards came from — the lair is 30% of the mean total and was
 * disclosed nowhere.
 */
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

  /*
   * The name and epithet are rendered as two inline elements that read as one
   * sentence, so the exact joined string is the thing that can break — and it
   * breaks silently. Laid out as flex items they wrapped as whole boxes and put
   * the comma at the head of the second line; switching to inline fixed the
   * wrapping but moves the spacing burden into the JSX, where a missing `{' '}`
   * renders "Debt.·Undying".
   *
   * The expected strings here are literals, not anything the component hands
   * back (failure mode 11) — they are what a reader should see.
   */
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

  /**
   * The warning names the faction that would ACT, not a favourite.
   *
   * The demo run is the case that used to be wrong: the Academy at −48 and the
   * Crownlands at −76, in the decline, at 71 Notoriety. That career ends in
   * `exiled_and_overrun` and the header spent the whole build warning about a
   * gem — the Academy was simply the only faction the header could talk about.
   */
  it('warns about whichever faction is closest to acting', () => {
    show(demoRun);
    expect(screen.getByText(/The Crown/)).toBeInTheDocument();
    expect(screen.queryByText(/The Academy is/)).toBeNull();
  });

  it('warns about the Academy when the Academy is the one closest', () => {
    const academy = {
      ...demoRun,
      factionStanding: { ...demoRun.factionStanding, crownlands: 10, pale_academy: -48 },
    };
    show(academy);
    expect(screen.getByText(/The Academy is/)).toBeInTheDocument();
  });

  it('says nothing at all when no faction is anywhere near acting', () => {
    const calm = {
      ...demoRun,
      factionStanding: { ...demoRun.factionStanding, pale_academy: 40, crownlands: 20 },
    };
    show(calm);
    expect(screen.queryByText(/is done deliberating|from the gem|from the writ/)).toBeNull();
  });

  it('names the fame that arms the reprisal while fame is the half still missing', () => {
    const quiet = {
      ...demoRun,
      notoriety: 20,
      factionStanding: {
        ...demoRun.factionStanding,
        crownlands: 10,
        pale_academy: SEAL_MAX_STANDING,
      },
    };
    show(quiet);
    expect(screen.getByText(/The Academy is done deliberating/)).toBeInTheDocument();
    expect(screen.getByText(/55 Notoriety/)).toBeInTheDocument();
  });
});

describe('WizardHeader · the wards readout', () => {
  it('appears in the decline, where a hero exists to compare against', () => {
    show(demoRun, wards(120));
    expect(screen.getByText('Wards')).toBeInTheDocument();
    expect(screen.getByText('The hero')).toBeInTheDocument();
  });

  it('stays out of the ascent, so the early run is clean', () => {
    show(demoEarlyRun, wards(60));
    expect(screen.queryByText('Wards')).toBeNull();
  });

  it('stays out when the screen has no defence to show', () => {
    show(demoRun, null);
    expect(screen.queryByText('Wards')).toBeNull();
  });
});

/**
 * Being a lich was mechanically enormous and visually silent.
 *
 * Reported from play: the lichdom ending "felt sudden — a few turns after the
 * lichdom it just happened." The cause was not pacing. `isLich` stops notoriety
 * decay, switches on `DEF_LICH` — 60, more than the entire ten-rung lair ladder
 * — and closes Ascension, and NOTHING on screen changed. The player took the
 * rite and the run looked identical, so the ending arrived with no visible
 * connection to the choice that caused it.
 */
describe('WizardHeader · the lich says so', () => {
  const lich = (over: Partial<RunState> = {}): RunState =>
    ({ ...demoRun, isLich: true, ...over }) as RunState;

  it('says nothing about undeath for a wizard who never took the rite', () => {
    show(demoRun);
    expect(screen.queryByText('Undying')).toBeNull();
    expect(screen.queryByText(/Undeath adds/)).toBeNull();
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

  it('states BOTH things the rite changed, for as long as they are true', () => {
    // Not just on the card that did it — the rite is three or four eras from
    // the end and both consequences are otherwise invisible.
    show(lich());
    const line = screen.getByText(/Undeath adds/);
    expect(line.textContent).toContain(`${DEF_LICH} Wards`);
    expect(line.textContent).toMatch(/no longer decays/i);
  });

  it('holds the line to one line at 393px', () => {
    // Same budget `sealSentence` is held to. A second line here pushes the
    // first choice card further down the one screen this game is built for.
    const line = lichSentence(lich())!;
    expect(line.length).toBeLessThanOrEqual(56);
  });
});

/**
 * The rite's own card has to price the trade.
 *
 * `DEF_LICH` is the single biggest defensive swing in the game and the option
 * offering it disclosed the forfeiture, the decay and NOT the wards. An
 * undisclosed upside is the same defect as an undisclosed downside: either way
 * the player cannot price what they are being offered.
 */
describe('the lichdom bill', () => {
  it('names all four consequences', () => {
    expect(LICH_LINE).toMatch(/forfeit every relic/i);
    expect(LICH_LINE).toMatch(/Followers/);
    expect(LICH_LINE).toMatch(/decay ends/i);
    expect(LICH_LINE).toContain(`+${DEF_LICH} Wards`);
  });

  it('tracks the constant, so prose cannot drift from the rule', () => {
    // Anchored to `DEF_LICH`, never to a literal. Note the limit honestly:
    // by the time a test sees `LICH_LINE` the value is already interpolated,
    // so this cannot prove the SOURCE reads the constant today. What it does
    // guarantee is that a hardcoded number goes red the moment `DEF_LICH`
    // moves — which is the drift this is guarding against, and the same class
    // the Ascension validator exists to catch.
    expect(LICH_LINE).toContain(String(DEF_LICH));
    expect(LICH_LINE).toContain(`+${DEF_LICH} Wards`);
  });

  it('stays scannable on a choice card', () => {
    expect(LICH_LINE.length).toBeLessThanOrEqual(90);
  });
});
