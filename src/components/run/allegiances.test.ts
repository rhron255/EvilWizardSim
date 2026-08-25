/**
 * The seal takes TWO numbers, and the header used to name one.
 *
 * `sealed_in_gem` fires at Pale Academy standing ≤ SEAL_MAX_STANDING *and*
 * notoriety ≥ SEAL_MIN_NOTORIETY. A wizard already past the standing half read
 * "The Pale Academy is done deliberating." and could then be ended by a card
 * that granted Notoriety and never mentioned the Academy — the fame half of the
 * trigger was never printed anywhere, so the choice that armed it looked free.
 */
import { describe, expect, it } from 'vitest';
import { SEAL_MAX_STANDING, SEAL_MIN_NOTORIETY } from '../../engine';
import type { RunState } from '../../types';
import { allegiancesFor, sealSentence, sealWarningFor } from './allegiances';

const run = (standing: number, notoriety: number): RunState =>
  ({
    factionStanding: {
      ashen_covenant: 0,
      gilded_hand: 0,
      pale_academy: standing,
      verdant_choir: 0,
      crownlands: 0,
      worm_below: 0,
    },
    notoriety,
  }) as RunState;

const sentence = (standing: number, notoriety: number) =>
  sealSentence(sealWarningFor(run(standing, notoriety))!);

describe('the seal warning', () => {
  it('stays quiet while the Academy is nowhere near filing you', () => {
    expect(sealWarningFor(run(0, 90))).toBeNull();
  });

  it('names the fame that arms it, when fame is the half still missing', () => {
    const line = sentence(SEAL_MAX_STANDING, 20);
    expect(line).toContain(String(SEAL_MIN_NOTORIETY));
    expect(line).toMatch(/Notoriety/);
  });

  it('names the distance in standing while standing is the half still missing', () => {
    // Fame within reach of arming, so the sentence is a live warning.
    expect(sentence(SEAL_MAX_STANDING + 9, SEAL_MIN_NOTORIETY - 5)).toContain('9 from the gem');
  });

  /**
   * The sentence is the ARMED warning now, not a permanent fixture.
   *
   * It used to print from era one — "The Academy is 20 from the gem · it acts
   * at 55 Notoriety." above a wizard at 11 Notoriety, i.e. a standing line
   * about a death that nothing in the run could yet cause, sitting on top of
   * the choice cards on a 852px phone. The continuous half of that disclosure
   * moved to `sealAt`, a tick drawn on the Academy's own bar.
   */
  it('stays quiet while fame is nowhere near arming it, because the bar carries the distance', () => {
    expect(sealWarningFor(run(SEAL_MAX_STANDING + 9, 11))).toBeNull();
  });

  it('warns anyway once standing is already past the line, whatever the fame', () => {
    // The only thing keeping this run alive is a number the game pushes up.
    expect(sealWarningFor(run(SEAL_MAX_STANDING, 11))).not.toBeNull();
  });

  it('says the deliberating is over once standing is past the line', () => {
    expect(sentence(SEAL_MAX_STANDING - 4, 90)).toContain('done deliberating');
  });

  it('stops asking for fame once the wizard already has it', () => {
    const line = sentence(SEAL_MAX_STANDING, SEAL_MIN_NOTORIETY);
    expect(line).toContain('your fame qualifies');
    expect(line).not.toContain(String(SEAL_MIN_NOTORIETY));
  });
});

/**
 * The tick that replaced the permanent sentence.
 *
 * If `sealAt` is ever null for the Academy, the header silently loses the
 * continuous half of the seal disclosure and the change above becomes a
 * regression rather than a compression — so it is pinned here.
 */
describe('the seal tick', () => {
  const factions = [
    { id: 'ashen_covenant', name: 'The Ashen Covenant' },
    { id: 'gilded_hand', name: 'The Gilded Hand' },
    { id: 'pale_academy', name: 'The Pale Academy' },
    { id: 'verdant_choir', name: 'The Verdant Choir' },
    { id: 'crownlands', name: 'The Crownlands' },
    { id: 'worm_below', name: 'The Worm Below' },
  ] as unknown as Parameters<typeof allegiancesFor>[1];

  it('marks the gem on the Academy bar and nowhere else', () => {
    const rows = allegiancesFor(run(0, 10), factions);
    const academy = rows.find((r) => r.id === 'pale_academy')!;
    expect(academy.sealAt).toBeCloseTo(SEAL_MAX_STANDING / 100);
    for (const other of rows.filter((r) => r.id !== 'pale_academy')) {
      expect(other.sealAt).toBeNull();
    }
  });

  it('scales standing to HALF the centre-zero bar, so ±100 is the end of the rail', () => {
    // The fill read `ratio * 100%` under `overflow: hidden`, so every value
    // past ±50 drew an identical full bar — including the difference between
    // "the Academy dislikes you" and "the Academy is sealing you in a gem".
    const rows = allegiancesFor(run(-100, 10), factions);
    const academy = rows.find((r) => r.id === 'pale_academy')!;
    expect(Math.abs(academy.ratio)).toBe(1);
    expect(Math.abs(academy.ratio) * 50).toBe(50);
  });
});
