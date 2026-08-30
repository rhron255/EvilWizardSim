/**
 * The unlock moment, and the two ways it silently breaks.
 *
 * 1. ORDERING. `recordRun` folds the ending into `endingsSeen` in the same
 *    reducer return that flips the screen to `ending`. Anything asking "was
 *    this ending new?" after that point always gets "no" — the banner would
 *    never fire once, for anyone, and it would typecheck. That is CLAUDE.md
 *    failure mode 2's shape exactly, so it is pinned here rather than left to
 *    a screenshot of a screen that is correct 80% of the time by construction.
 *
 * 2. GATING. Nothing may put a player in a theme they have not earned. The
 *    selector never offers one, but the reducer is the only thing that writes
 *    the collection, so the guarantee has to hold there.
 *
 * These drive `gameReducer` directly rather than through `useGame`, because
 * the ordering is a property of the reducer and a hook test would let a render
 * pass sit between the two facts being compared.
 */

import { describe, expect, it } from 'vitest';
import type { Collection, RunState } from '../types';
import { gameReducer } from './useGame';
import { emptyCollection } from './persistence';
import { fixtureContent } from './__fixtures__/content';

const content = fixtureContent;

/**
 * `GameState` is internal to `useGame`, so it is recovered from the reducer's
 * own signature rather than re-declared — a hand-written mirror here is
 * CLAUDE.md failure mode 3, and it would drift the moment a field is added.
 */
type GameState = Parameters<typeof gameReducer>[0];

/** A finished run, parked on its resolution, ready for `continue`. */
function finished(ending: RunState['ending'], collection: Collection): GameState {
  const run = {
    ...({} as RunState),
    id: 'r',
    seed: 1,
    wizardName: 'Malvorn',
    heldArtifactIds: [],
    knownArtifactIds: [],
    eras: [],
    notoriety: 40,
    ending,
  } as unknown as RunState;

  return {
    screen: 'run' as const,
    run,
    offer: null,
    resolution: { text: 'done' } as never,
    collection,
    prophecyPending: false,
    resumable: null,
    unlockedTheme: null,
  };
}

describe('the unlock fires exactly once, and before the collection moves', () => {
  it('reports a first-time ending as an unlock', () => {
    const state = finished('lichdom', emptyCollection());
    const next = gameReducer(state, { type: 'continue', content });

    expect(next.screen).toBe('ending');
    expect(next.unlockedTheme).toBe('lichdom');
    // The same return that reported the unlock also recorded the run, which is
    // precisely why the check cannot be made afterwards.
    expect(next.collection.endingsSeen).toContain('lichdom');
  });

  it('reports nothing for an ending already in the collection', () => {
    const seen: Collection = { ...emptyCollection(), endingsSeen: ['lichdom'] };
    const next = gameReducer(finished('lichdom', seen), { type: 'continue', content });

    expect(next.unlockedTheme).toBeNull();
    expect(next.collection.endingsSeen).toEqual(['lichdom']);
  });

  it('is idempotent: a second continue changes nothing at all', () => {
    /**
     * This is the regression that shipped and was caught in a browser, not
     * here — the first version of this test asserted the BUG.
     *
     * `ResolutionOverlay` dismisses on the scrim and on the Continue button
     * inside it, so one tap dispatched `continue` twice. The ending branch was
     * the only one that did not clear `resolution`, so the second dispatch got
     * past the guard and re-ran `recordRun`: `runsCompleted` counted every
     * career twice, and the unlock check — now looking at a collection that
     * already contained this ending — reported "not new" and threw the banner
     * away. Every unit test passed; the banner never rendered once.
     *
     * So the assertion is identity, not a value: a second continue must be a
     * no-op, which is the only version of this that cannot rot.
     */
    const first = gameReducer(finished('ascension', emptyCollection()), {
      type: 'continue',
      content,
    });
    expect(first.unlockedTheme).toBe('ascension');
    expect(first.collection.runsCompleted).toBe(1);
    // Cleared on the way to the ending screen — that is what stops the replay.
    expect(first.resolution).toBeNull();

    const second = gameReducer(first, { type: 'continue', content });
    expect(second).toBe(first);
    expect(second.unlockedTheme).toBe('ascension');
    expect(second.collection.runsCompleted).toBe(1);
  });

  it('records a finished career exactly once, however many times it fires', () => {
    // The half of the same bug that had nothing to do with themes: this number
    // was double-counting for every player, on every run. Dispatched against
    // the state the previous dispatch RETURNED — which is what React does, and
    // what makes the cleared `resolution` the thing that stops the replay.
    let state = finished('lichdom', emptyCollection());
    for (let i = 0; i < 5; i++) {
      state = gameReducer(state, { type: 'continue', content });
    }
    expect(state.collection.runsCompleted).toBe(1);
    expect(state.collection.endingsSeen).toEqual(['lichdom']);
    expect(state.unlockedTheme).toBe('lichdom');
  });

  it('clears on the way out of the ending screen', () => {
    const shown = gameReducer(finished('lichdom', emptyCollection()), {
      type: 'continue',
      content,
    });
    expect(shown.unlockedTheme).toBe('lichdom');

    for (const action of [
      { type: 'playAgain' },
      { type: 'viewCollection' },
      { type: 'viewThemes' },
      { type: 'backToTitle' },
    ] as const) {
      expect(gameReducer(shown, action).unlockedTheme).toBeNull();
    }
  });
});

describe('selectTheme · never wears what was not earned', () => {
  const withLich: Collection = { ...emptyCollection(), endingsSeen: ['lichdom'] };
  const base = { ...finished(undefined, withLich), screen: 'themes' as const };

  it('accepts a theme whose ending has been reached', () => {
    const next = gameReducer(base, { type: 'selectTheme', id: 'lichdom' });
    expect(next.collection.selectedThemeId).toBe('lichdom');
  });

  it('refuses a theme whose ending has not', () => {
    const next = gameReducer(base, { type: 'selectTheme', id: 'ascension' });
    expect(next.collection.selectedThemeId).toBe('default');
    // Unchanged state, not a rebuilt equal one — a no-op must not churn
    // identity, or every consumer re-renders on a rejected tap.
    expect(next).toBe(base);
  });

  it('always accepts the default, on an empty collection', () => {
    const wearing: Collection = { ...emptyCollection(), selectedThemeId: 'lichdom' };
    const next = gameReducer(
      { ...base, collection: wearing },
      { type: 'selectTheme', id: 'default' },
    );
    expect(next.collection.selectedThemeId).toBe('default');
  });

  it('is a no-op when the theme is already worn', () => {
    const wearing: Collection = { ...withLich, selectedThemeId: 'lichdom' };
    const state = { ...base, collection: wearing };
    expect(gameReducer(state, { type: 'selectTheme', id: 'lichdom' })).toBe(state);
  });
});
