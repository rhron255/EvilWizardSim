/**
 * Closing the tab must not change what happens next.
 *
 * wiki/03: "losing an accumulated ledger to a browser refresh directly attacks
 * the sunk-cost mechanism the design depends on." The save is JSON in
 * `localStorage`, and the relic rework (#77) grew a run by several fields
 * (`relicState`, `startingArtifactIds`, `activeGrantedArtifactIds`,
 * `triggerGrantedArtifactIds`), some of which `loadInProgressRun` defaults on
 * the way back in. A field that survives the round trip changed — or is dropped,
 * or comes back as its default when it should not — would not crash anything: it
 * would quietly make the resumed career play differently from the one the player
 * left.
 *
 * So this saves a run mid-career, loads it back, and plays the ORIGINAL and the
 * RESUMED copy forward with the same choices, asserting they stay identical all
 * the way to the ending. The comparison is anchored to the un-serialised run —
 * something the persistence code does not supply (failure mode 11).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REAL_CONTENT as content } from '../testing/realContent';
import type { RunState } from '../types';
import { createRun, resolveChoice } from './index';
import { isOptionPickable, nextOffer } from './offers';
import { loadInProgressRun, saveInProgressRun } from './persistence';
import { mulberry32 } from './rng';

const CAREERS = 300;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

/** The choices are a pure function of (run, rng), so two copies of a run make the same ones. */
function step(run: RunState, pick: () => number): RunState {
  const offer = nextOffer(run, content);
  const pickable = offer.options.map((_, i) => i).filter((i) => isOptionPickable(run, offer.options[i], content));
  if (pickable.length === 0) throw new Error(`nothing pickable on ${offer.id}`);
  return resolveChoice(run, offer, pickable[Math.floor(pick() * pickable.length)], content).next;
}

describe('resume · a saved career continues exactly as it would have', () => {
  it(`is lossless at a random point in each of ${CAREERS} careers, all the way to the ending`, () => {
    const problems: string[] = [];

    for (let i = 0; i < CAREERS && problems.length < 5; i++) {
      const rand = mulberry32(50_000 + i);
      const origin = content.origins[Math.floor(rand() * content.origins.length)];
      const eraCount = ([12, 16, 20] as const)[Math.floor(rand() * 3)];
      let original = createRun({ wizardName: 'Resume', originId: origin.id, eraCount, seed: 7000 + i, knownArtifactIds: [] }, content);

      // Play to a random era, then save, then reload.
      const stopAt = 1 + Math.floor(rand() * (eraCount - 2));
      const earlyPick = mulberry32(90_000 + i);
      while (!original.ending && original.eraIndex < stopAt) original = step(original, earlyPick);
      if (original.ending) continue; // ended before the save point — nothing to resume

      saveInProgressRun(original);
      const resumed = loadInProgressRun();
      if (!resumed) {
        problems.push(`career ${i}: a run saved at era ${original.eraIndex} did not load back at all`);
        continue;
      }
      if (JSON.stringify(resumed) !== JSON.stringify(original)) {
        problems.push(`career ${i}: the loaded run differs from the saved one at era ${original.eraIndex}`);
        continue;
      }

      // Same choices from here on for both copies.
      const pickA = mulberry32(123_000 + i);
      const pickB = mulberry32(123_000 + i);
      let a: RunState = original;
      let b: RunState = resumed;
      for (let guard = 0; !a.ending && !b.ending && a.eraIndex < a.eraCount && guard < 60; guard++) {
        a = step(a, pickA);
        b = step(b, pickB);
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          problems.push(`career ${i}: resumed at era ${original.eraIndex}, the two diverged by era ${a.eraIndex}`);
          break;
        }
      }
      if (a.ending !== b.ending) problems.push(`career ${i}: the resumed career ended as ${b.ending}, the original as ${a.ending}`);
    }

    expect(problems).toEqual([]);
  }, 120_000);
});
