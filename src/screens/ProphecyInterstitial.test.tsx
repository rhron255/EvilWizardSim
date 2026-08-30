/**
 * The pivot, and a screen defined mostly by what it refuses to say.
 *
 * Its own header comment is an explicit ban list — no doom meter, no "the
 * decline begins" caption, no run numbers — and CLAUDE.md rule 5 backs it. The
 * ban has a narrow, deliberate exception (era and age) and that exception has
 * already caused a misreading once: a reviewer read "Grishnak is 65" as
 * notoriety, because at era 10 the age lands squarely in notoriety's range on
 * a screen you reach straight from a header whose largest number is notoriety.
 * The fix was the unit, and this pins it.
 *
 * The other half is the hand-off line, which was ADDED to fix a reported bug —
 * hero threat was disclosed nowhere, so a player met the wards readout several
 * eras later with no idea where it came from. A line added to fix a bug is
 * exactly the "correct and never mounted" risk (CLAUDE.md § 2).
 *
 * TIMERS. The screen stages six `setTimeout`s out to 2900ms and probes
 * `matchMedia` to skip them. jsdom has no `matchMedia`, so without the stub
 * below every test here would schedule real timers that fire `setState`
 * outside `act`. This is the same stub `EndingScreen.test.tsx` uses; no test in
 * this repo uses fake timers.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { demoRunAtProphecy } from '../components/meta/__fixtures__/demo';
import type { RunState } from '../types';
import { ProphecyInterstitial } from './ProphecyInterstitial';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

const HERO = 'Aurel of the Thornwatch';
const TEXT = 'A child was born this year in a village you have never troubled.';

const show = (over: Partial<RunState> = {}) => {
  const onContinue = vi.fn();
  const view = render(
    <ProphecyInterstitial
      run={{ ...demoRunAtProphecy, ...over }}
      heroName={HERO}
      text={TEXT}
      onContinue={onContinue}
      themeId="default"
    />,
  );
  return { onContinue, container: view.container };
};

describe('ProphecyInterstitial · what it refuses to say', () => {
  it('prints no run numbers — no notoriety, no threat, no counters', () => {
    const { container } = show();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/notoriety/i);
    expect(text).not.toMatch(/threat/i);
    expect(text).not.toMatch(/followers|pact debt|loyalty|wards/i);
  });

  it('does not announce a phase or a decline', () => {
    // Rule 5. The erosion works because it is unannounced; naming it here
    // would spend the whole effect on one screen.
    const { container } = show();
    expect(container.textContent ?? '').not.toMatch(/decline|doom|phase|beware/i);
  });
});

describe('ProphecyInterstitial · the two numbers it does print', () => {
  it('labels the age, so it cannot be read as notoriety', () => {
    const { container } = show({ age: 65 } as Partial<RunState>);
    expect((container.textContent ?? '').replace(/\s+/g, ' ')).toContain('is 65 years old');
  });

  it('numbers the era from one, matching the header', () => {
    const { container } = show({ eraIndex: 9 } as Partial<RunState>);
    expect((container.textContent ?? '').replace(/\s+/g, ' ')).toContain('Era 10');
  });
});

describe('ProphecyInterstitial · the hand-off', () => {
  it('says the hero becomes a number that climbs', () => {
    // Without this the wards readout arrives several eras later with no
    // origin, which is the bug it was written for.
    show();
    expect(screen.getByText(/becomes a number in your header/i)).toBeInTheDocument();
    expect(screen.getByText(/climbs every era/i)).toBeInTheDocument();
  });

  it('names the chosen one from the prop, never from a literal', () => {
    show();
    expect(screen.getByText(HERO)).toBeInTheDocument();
  });
});

describe('ProphecyInterstitial · skipping', () => {
  it('reveals the screen without advancing past it', async () => {
    // Two behaviours that are easy to conflate. Skipping the staged reveal is
    // not the same as leaving — a player who taps to see the prophecy sooner
    // must not have the prophecy taken away.
    const { onContinue } = show();
    await userEvent.keyboard('{Escape}');
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByText(TEXT)).toBeInTheDocument();
  });

  it('leaves only when the exit is used, and exactly once', async () => {
    const { onContinue } = show();
    await userEvent.click(screen.getByRole('button', { name: /return to your work/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
