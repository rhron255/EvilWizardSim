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
 * outside `act`. This is the same stub `EndingScreen.test.tsx` uses. The one
 * exception is the haptics block at the bottom: the buzz is tied to a stage of
 * the staging itself, so proving it lands on the headline and not before
 * requires watching the stages happen — fake timers, driven inside `act`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunState } from '../types';
import { ProphecyInterstitial } from './ProphecyInterstitial';
import { BEATS } from '../components/meta';

/** A mid-run state, taken at the moment the prophecy fires (era index 10). */
const demoRunAtProphecy: RunState = {
  id: 'run_test_0001',
  seed: 741_853_902,
  wizardName: 'Mordrach Vane',
  epithet: 'of the Long Winter',
  originId: 'expelled_pale_academy',
  age: 70,
  eraIndex: 10,
  eraCount: 16,
  phase: 'decline',
  prophecyEra: 10,
  erasSinceProphecy: 0,
  notoriety: 74,
  followers: 466,
  lairId: 'thornhollow_keep',
  knownArtifactIds: [],
  heroBandSeen: 0,
  heldArtifactIds: ['bone_crown'],
  startingArtifactIds: [],
  activeGrantedArtifactIds: [],
  triggerGrantedArtifactIds: [],
  factionStanding: {
    ashen_covenant: 62,
    gilded_hand: 18,
    pale_academy: -48,
    verdant_choir: 34,
    crownlands: -76,
    worm_below: 9,
  },
  apprentices: { count: 3, loyalty: 41 },
  pactDebt: 4,
  heroThreat: 4,
  isLich: false,
  goodActs: 0,
  illActs: 0,
  goodWizardVowed: false,
  relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
  eras: [],
  seenOfferIds: [],
  ending: undefined,
};

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

describe('ProphecyInterstitial · haptics', () => {
  let vibrate: ReturnType<typeof vi.fn>;
  const motion = (reduce: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));

  beforeEach(() => {
    vi.useFakeTimers();
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
    motion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('buzzes once, when the headline is revealed and not before', () => {
    show();
    act(() => {
      vi.advanceTimersByTime(900); // the headline's cue is at 1000ms
    });
    expect(vibrate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(BEATS.prophecy);

    act(() => {
      vi.advanceTimersByTime(4000); // the rest of the staging must not buzz again
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('does not buzz a player who skips the staging for a beat they did not watch', () => {
    show();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole('main'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('does not buzz under reduced motion, where the staging is not played', () => {
    motion(true);
    show();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(vibrate).not.toHaveBeenCalled();
  });
});
