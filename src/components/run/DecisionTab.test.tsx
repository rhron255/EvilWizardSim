/**
 * The Decision tab (issue #18) — the focused play surface. Three things this
 * covers that `WizardHeader.test.tsx` never had to: the next-threat line is
 * now UNCONDITIONAL (it used to be an armed-only warning), the patron line is
 * new entirely, and both have to render alongside the offer without the
 * disclosure guarantees the old header carried regressing.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DefenseReadout } from '../../engine';
import { DEF_LICH } from '../../engine';
import type { Offer, RunState } from '../../types';
import { demoArtifacts, demoEarlyRun, demoFactions, demoOffer, demoRun } from './__fixtures__/demo';
import { DecisionTab } from './DecisionTab';

const wards = (total: number): DefenseReadout => ({
  total,
  terms: [
    { label: 'Lair', value: 32, earned: true },
    { label: 'Relics', value: 6, earned: true },
    { label: 'Fame', value: Math.round(total - 32 - 6 - 42), earned: true },
    { label: 'Standing ground', value: 42, earned: false },
  ],
});

const show = (
  run: RunState,
  defense: DefenseReadout | null = wards(120),
  offer: Offer | null = demoOffer,
  disabled = false,
) =>
  render(
    <DecisionTab
      run={run}
      factions={demoFactions}
      offer={offer}
      artifacts={demoArtifacts}
      disabled={disabled}
      onChoose={() => {}}
      defense={defense}
    />,
  );

// The compact resources' labels ("Followers", "Loyalty", "Pact Debt"…) are
// not unique text on this tab any more — the offer's own effect chips print
// the same words (`+22 Followers`). Every query here is scoped to the stats
// `<dl>` itself rather than the whole document.
const statsList = (container: HTMLElement) => container.querySelector('dl')!;
const stat = (container: HTMLElement, label: string) =>
  within(statsList(container)).getByText(label).closest('div')!;

describe('DecisionTab · disclosure', () => {
  it('prints every stat that can end a run', () => {
    const { container } = show(demoRun);
    for (const label of ['Followers', 'Relics', 'Apprentices', 'Loyalty', 'Pact Debt']) {
      expect(within(statsList(container)).getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the pact ceiling as a denominator, not a bare count', () => {
    const { container } = show(demoRun);
    expect(within(stat(container, 'Pact Debt')).getByText('2 / 7')).toBeInTheDocument();
  });

  it('keeps the caption reachable on a phone, where it is tap-to-reveal', async () => {
    const { container } = show(demoRun);
    const button = within(stat(container, 'Loyalty')).getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('DecisionTab · the next-threat line', () => {
  it('names whichever faction is closest to acting, unconditionally', () => {
    // demoRun: the Crownlands sit lowest (−61) in the decline at 81 Notoriety —
    // the same case WizardHeader's warning test used to pin.
    show(demoRun);
    expect(screen.getByText(/The Crown/)).toBeInTheDocument();
  });

  it('speaks up even when nobody is anywhere near acting — this is the ambient line, not the alarm', () => {
    // Every faction sitting well clear of the threshold, in the ASCENT — where
    // only the Academy's reprisal is live at all. The OLD armed warning would
    // have said nothing here (nothing is close); the next-threat line always
    // has something to report because the Academy is live in every phase.
    const calm = {
      ...demoRun,
      phase: 'ascent',
      erasSinceProphecy: 0,
      factionStanding: {
        ashen_covenant: 40,
        gilded_hand: 40,
        pale_academy: 40,
        verdant_choir: 40,
        crownlands: 40,
        worm_below: 40,
      },
    } as RunState;
    show(calm);
    expect(screen.getByText(/The Academy/)).toBeInTheDocument();
  });
});

describe('DecisionTab · the patron line', () => {
  it('says "None yet" when no faction has cleared the devotion bar and margin', () => {
    // demoRun's highest standing (Ashen Covenant, 46) sits under
    // DEVOTION_STANDING (50).
    show(demoRun);
    expect(screen.getByText('Patron')).toBeInTheDocument();
    expect(screen.getByText('None yet')).toBeInTheDocument();
  });

  it('names the faction once devotion and the exclusivity margin both clear', () => {
    const devoted = {
      ...demoRun,
      factionStanding: {
        ...demoRun.factionStanding,
        ashen_covenant: 70,
        gilded_hand: 30,
        pale_academy: -38,
      },
    } as RunState;
    // No offer, so the faction's name cannot ALSO appear as an unrelated
    // offer eyebrow — this test is about the patron line specifically.
    show(devoted, wards(120), null);
    expect(screen.getByText('The Ashen Covenant')).toBeInTheDocument();
    expect(screen.queryByText('None yet')).toBeNull();
  });
});

describe('DecisionTab · the wards readout', () => {
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

describe('DecisionTab · the lich says so', () => {
  it('states both things the rite changed, for as long as they are true', () => {
    const lich = { ...demoRun, isLich: true } as RunState;
    show(lich);
    const line = screen.getByText(/Undeath adds/);
    expect(line.textContent).toContain(`${DEF_LICH} Wards`);
    expect(line.textContent).toMatch(/no longer decays/i);
  });

  it('says nothing for a wizard who never took the rite', () => {
    show(demoRun);
    expect(screen.queryByText(/Undeath adds/)).toBeNull();
  });
});

describe('DecisionTab · the offer', () => {
  it('renders the offer and its choices', () => {
    show(demoRun);
    expect(screen.getByRole('heading', { name: demoOffer.title })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Choices' })).toBeInTheDocument();
  });

  it('shows a quiet placeholder between offers', () => {
    show(demoRun, wards(120), null);
    expect(screen.getByText('The era turns.')).toBeInTheDocument();
  });
});
