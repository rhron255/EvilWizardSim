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
import { sealSentence, sealWarningFor } from './allegiances';

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
    expect(sentence(SEAL_MAX_STANDING + 9, 20)).toContain('9 from the gem');
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
