/**
 * Haptics are a tap on the shoulder, not a feature to lean on — so the tests are
 * mostly about what must NOT happen: no throw where the API is missing or
 * refuses, no buzz for a player who asked the OS for reduced motion, and no
 * pattern loud enough to be a decision.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BEATS, beat } from './haptics';

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

function stubVibrate(impl: (p: VibratePattern) => boolean = () => true) {
  const vibrate = vi.fn(impl);
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
  return vibrate;
}

beforeEach(() => stubMatchMedia(false));
afterEach(() => {
  vi.unstubAllGlobals();
  // jsdom has no `vibrate`; remove whatever a test defined so the next starts bare.
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('haptics · beat', () => {
  it('asks the platform to vibrate with that beat\'s own pattern', () => {
    const vibrate = stubVibrate();

    expect(beat('success')).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(BEATS.success);

    beat('failure');
    expect(vibrate).toHaveBeenLastCalledWith(BEATS.failure);
  });

  it('gives a win and a loss different patterns, so the verdict can be felt with the screen off', () => {
    expect(BEATS.success).not.toEqual(BEATS.failure);
  });

  it('stays subtle: no beat runs longer than a fifth of a second in total', () => {
    // Anchored to a number chosen for a reason (a buzz you notice, not one you
    // wait out), not to what the table happens to contain.
    for (const [name, pattern] of Object.entries(BEATS)) {
      const total = pattern.reduce((sum, ms) => sum + ms, 0);
      expect(total, `${name} beat`).toBeLessThanOrEqual(200);
    }
  });

  it('does nothing for a player who asked for reduced motion', () => {
    stubMatchMedia(true);
    const vibrate = stubVibrate();

    expect(beat('success')).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('is inert where the platform has no vibration API (iOS Safari, desktop)', () => {
    // No `navigator.vibrate` at all — the jsdom default.
    expect(() => beat('crossing')).not.toThrow();
    expect(beat('crossing')).toBe(false);
  });

  it('never lets a refusing or throwing platform break the game', () => {
    stubVibrate(() => {
      throw new Error('NotAllowedError');
    });
    expect(() => beat('prophecy')).not.toThrow();
    expect(beat('prophecy')).toBe(false);
  });

  it('reports false when the platform declines without throwing', () => {
    stubVibrate(() => false);
    expect(beat('success')).toBe(false);
  });
});
