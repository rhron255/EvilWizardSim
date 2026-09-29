/**
 * The unlock, driven through the real hook rather than the reducer alone.
 *
 * `themeUnlock.test.ts` pins the reducer. This pins the thing the SCREEN
 * actually receives — `useGame` re-derives `unlockedTheme` on the way out, and
 * a guard there could quietly swallow what the reducer correctly set. That is
 * CLAUDE.md failure mode 2 one layer up: the reducer being right does not mean
 * the value is wired to anything.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ContentBundle } from './index';
import { isOptionPickable } from './index';
import { COLLECTION_KEY } from './constants';
import { useGame } from './useGame';
import { REAL_CONTENT } from '../testing/realContent';

const content: ContentBundle = REAL_CONTENT;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

/**
 * Play until the run ends, preferring the first option.
 *
 * `resolveChoice` refuses an unpickable index inertly (issue #41 follow-up),
 * same as it already does for a finished run — so blindly choosing index 0
 * regardless of state could resolve nothing and spin in place. Every real
 * caller already has to check pickability before choosing; this helper does
 * the same, falling back to the first pickable certain option `nextOffer`
 * already guarantees exists.
 */
function playToEnding(game: { current: ReturnType<typeof useGame> }) {
  for (let i = 0; i < 200; i++) {
    const g = game.current;
    if (g.screen === 'ending') return;
    if (g.run?.ending && g.resolution) {
      act(() => g.continueAfterResolution());
      continue;
    }
    if (g.resolution) {
      act(() => g.continueAfterResolution());
      continue;
    }
    if (g.screen === 'prophecy') {
      act(() => g.acknowledgeProphecy());
      continue;
    }
    if (g.offer && g.run) {
      const offer = g.offer;
      const run = g.run;
      const preferred = offer.options[0];
      const index =
        preferred && isOptionPickable(run, preferred, content)
          ? 0
          : offer.options.findIndex(
              (o) => o.kind === 'certain' && isOptionPickable(run, o, content),
            );
      act(() => g.choose(index));
      continue;
    }
    break;
  }
}

describe('useGame · what the ending screen is handed', () => {
  it('reports the unlocked theme on a first-ever career', () => {
    const { result } = renderHook(() => useGame(content));

    act(() => result.current.begin());
    act(() => result.current.create('Malvorn', 'the Unpleasant', content.origins[0].id, 12));
    playToEnding(result);

    expect(result.current.screen).toBe('ending');
    const ending = result.current.run?.ending;
    expect(ending).toBeTruthy();

    // The ending was new, so the theme it grants is new. This is the value the
    // banner renders from.
    expect(result.current.unlockedTheme).toBe(ending);
  });

  it('reports nothing the second time the same ending is reached', () => {
    const { result } = renderHook(() => useGame(content));

    act(() => result.current.begin());
    act(() => result.current.create('Malvorn', 'the Unpleasant', content.origins[0].id, 12));
    playToEnding(result);
    const first = result.current.run?.ending;
    expect(result.current.unlockedTheme).toBe(first);

    // Same seed policy, same choices — the same ending, now already collected.
    act(() => result.current.playAgain());
    act(() => result.current.create('Malvorn', 'the Unpleasant', content.origins[0].id, 12));
    playToEnding(result);

    if (result.current.run?.ending === first) {
      expect(result.current.unlockedTheme).toBeNull();
    }
  });

  it('lets the player wear it, and remembers', () => {
    const { result } = renderHook(() => useGame(content));

    act(() => result.current.begin());
    act(() => result.current.create('Malvorn', 'the Unpleasant', content.origins[0].id, 12));
    playToEnding(result);

    const unlocked = result.current.unlockedTheme!;
    expect(unlocked).toBeTruthy();

    act(() => result.current.selectTheme(unlocked));
    expect(result.current.collection.selectedThemeId).toBe(unlocked);

    // And it reached storage, which is what makes it survive the tab closing.
    const stored = JSON.parse(localStorage.getItem(COLLECTION_KEY)!);
    expect(stored.selectedThemeId).toBe(unlocked);
  });
});
