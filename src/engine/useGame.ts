/**
 * The single owner of game state.
 *
 * wiki/03 § Ownership rules: "`RunState` lives in one reducer. Every offer
 * resolution is a single dispatched action producing a new `EraRecord`.
 * Nothing else may mutate run state. Presentation components hold no game
 * state."
 *
 * Design notes for anyone extending this:
 *
 *   - The reducer is PURE. `content` and the run seed are passed in on the
 *     action rather than closed over, so React 18 StrictMode's double
 *     invocation produces identical state and there is no ambient randomness
 *     inside it.
 *   - Persistence happens in effects keyed on the state it mirrors, never
 *     inside the reducer.
 *   - Every callback is `useCallback`'d over `[content]` (or nothing), and the
 *     returned object is memoized, so `react-hooks/exhaustive-deps` — an
 *     ERROR in this repo — has nothing to complain about and consumers do not
 *     re-render on identity churn.
 */

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { Collection, Offer, RunState, Screen, ThemeId } from '../types';
import { isThemeUnlocked } from '../theme/themes';
import type { ContentBundle } from './content-port';
import type { Resolution } from './resolution';
import { createRun, resolveChoice } from './run';
import { nextOffer } from './offers';
import { randomSeed } from './rng';
import {
  clearInProgressRun,
  loadCollection,
  loadInProgressRun,
  recordRun,
  saveCollection,
  saveInProgressRun,
} from './persistence';

export type Game = {
  screen: Screen;
  run: RunState | null;
  offer: Offer | null;
  resolution: Resolution | null;
  collection: Collection;
  content: ContentBundle;
  begin(): void;
  create(name: string, epithet: string, originId: string, eraCount: number): void;
  choose(optionIndex: number): void;
  continueAfterResolution(): void;
  acknowledgeProphecy(): void;
  playAgain(): void;
  viewCollection(): void;
  viewThemes(): void;
  backToTitle(): void;
  /**
   * The theme this run just unlocked, or null.
   *
   * Set at the moment the run is recorded and cleared on the way out of the
   * ending screen, so the banner fires once for a first discovery and never
   * for a repeat.
   */
  unlockedTheme: ThemeId | null;
  selectTheme(id: ThemeId): void;
  hasResumableRun: boolean;
  resume(): void;
  /**
   * The three-card guide is owed: a first-ever career, still on its first
   * choice. Gated on `eras.length` rather than on the screen alone so a
   * refresh mid-career does not re-open it half way through a life.
   */
  showFirstRunGuide: boolean;
  dismissFirstRunGuide(): void;
  /**
   * A one-time floating hint naming the swipe gesture, owed once the guide
   * above is out of the way (it teaches navigation, not the loop, so it
   * waits its turn rather than competing with the guide for the same first
   * few seconds). Gated on `tutorialSeen` rather than repeating the guide's
   * own `eras.length === 0` condition — a returning player whose save
   * predates this field has `tutorialSeen: true` already and is owed the
   * hint immediately, not a re-run of the three-card guide first.
   */
  showTabsHint: boolean;
  dismissTabsHint(): void;
};

type GameState = {
  screen: Screen;
  run: RunState | null;
  offer: Offer | null;
  resolution: Resolution | null;
  collection: Collection;
  /** The prophecy interstitial is owed before the next offer is shown. */
  prophecyPending: boolean;
  /** A saved unfinished run, from storage at mount or set aside on exit. */
  resumable: RunState | null;
  /**
   * A theme unlocked by the run that just finished, for the ending banner.
   *
   * Computed in `continue`, which is the ONLY moment it can be: `recordRun`
   * folds the ending into `endingsSeen` in that same return, so anything
   * reading the collection afterwards sees the ending as already-seen and the
   * unlock as already-owned. Asking "was this new?" after the fact always
   * answers no. (CLAUDE.md failure mode 2's shape: the check has to happen
   * where the information still exists.)
   */
  unlockedTheme: ThemeId | null;
};

type Action =
  | { type: 'begin' }
  | {
      type: 'create';
      name: string;
      epithet: string;
      originId: string;
      eraCount: number;
      seed: number;
      content: ContentBundle;
    }
  | { type: 'choose'; optionIndex: number; content: ContentBundle }
  | { type: 'continue'; content: ContentBundle }
  | { type: 'acknowledgeProphecy'; content: ContentBundle }
  | { type: 'playAgain' }
  | { type: 'viewCollection' }
  | { type: 'viewThemes' }
  | { type: 'selectTheme'; id: ThemeId }
  | { type: 'backToTitle' }
  | { type: 'resume'; content: ContentBundle }
  | { type: 'dismissGuide' }
  | { type: 'dismissTabsHint' };

function initialState(): GameState {
  return {
    screen: 'title',
    run: null,
    offer: null,
    resolution: null,
    collection: loadCollection(),
    prophecyPending: false,
    resumable: loadInProgressRun(),
    unlockedTheme: null,
  };
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'begin':
      return { ...state, screen: 'creation' };

    case 'create': {
      const run = createRun(
        {
          wizardName: action.name,
          epithet: action.epithet,
          originId: action.originId,
          eraCount: action.eraCount,
          seed: action.seed,
          // What this player has already found, so a random draw can prefer a
          // relic they have never held. The engine reads no storage; the list
          // is an argument like everything else.
          knownArtifactIds: state.collection.discoveredArtifactIds,
        },
        action.content,
      );
      return {
        ...state,
        screen: 'run',
        run,
        // Remembered at the moment of naming rather than at the end of the
        // career, so an abandoned run still spares the player the retyping.
        collection: { ...state.collection, lastWizardName: run.wizardName },
        offer: nextOffer(run, action.content),
        resolution: null,
        prophecyPending: false,
        resumable: null,
      };
    }

    case 'choose': {
      // Guard the double-tap: a second choice before the resolution is
      // acknowledged must not burn another era.
      if (!state.run || !state.offer || state.resolution || state.run.ending) return state;
      const { next, resolution } = resolveChoice(
        state.run,
        state.offer,
        action.optionIndex,
        action.content,
      );
      const crossedIntoProphecy =
        !next.ending && state.run.eraIndex < next.prophecyEra && next.eraIndex >= next.prophecyEra;
      return {
        ...state,
        run: next,
        resolution,
        prophecyPending: crossedIntoProphecy,
      };
    }

    case 'continue': {
      if (!state.run || !state.resolution) return state;

      if (state.run.ending) {
        // BEFORE `recordRun`, which is what makes this answerable at all —
        // see `unlockedTheme` on `GameState`. Theme ids and ending ids are the
        // same id space, so the ending IS the theme it grants.
        const firstTime = !state.collection.endingsSeen.includes(state.run.ending);
        return {
          ...state,
          screen: 'ending',
          offer: null,
          /**
           * CLEARED, so a second `continue` cannot fold the same career in
           * twice.
           *
           * The other two branches below have always nulled this; the ending
           * branch did not, and `recordRun` is the one arm that is NOT
           * idempotent — `runsCompleted` increments every call. The overlay
           * dismisses on the scrim AND on the button inside it, so one click
           * on Continue dispatched this twice: every finished career counted
           * as two, and the theme unlock computed on the second pass saw its
           * own ending already in `endingsSeen` and reported "not new". The
           * banner never appeared once in a browser while every unit test
           * passed.
           */
          resolution: null,
          collection: recordRun(state.collection, state.run, action.content),
          resumable: null,
          unlockedTheme: firstTime ? state.run.ending : null,
        };
      }

      if (state.prophecyPending) {
        // The phase flip is a full-screen set piece, not a card. The next
        // offer is not drawn until it has been acknowledged.
        return { ...state, screen: 'prophecy', offer: null, resolution: null };
      }

      return {
        ...state,
        screen: 'run',
        offer: nextOffer(state.run, action.content),
        resolution: null,
      };
    }

    case 'acknowledgeProphecy': {
      if (!state.run || state.screen !== 'prophecy') return state;
      return {
        ...state,
        screen: 'run',
        prophecyPending: false,
        resolution: null,
        offer: nextOffer(state.run, action.content),
      };
    }

    case 'playAgain':
      return {
        ...state,
        screen: 'creation',
        run: null,
        offer: null,
        resolution: null,
        unlockedTheme: null,
      };

    case 'viewCollection':
      return { ...state, screen: 'collection', unlockedTheme: null };

    case 'viewThemes':
      return { ...state, screen: 'themes', unlockedTheme: null };

    case 'selectTheme': {
      // Re-checked here even though the selector never offers a locked card.
      // The reducer is the only thing that writes the collection, so it is the
      // only place the guarantee can actually hold — a stale save, a second
      // tab, or a future caller all arrive through here.
      if (!isThemeUnlocked(action.id, state.collection.endingsSeen)) return state;
      if (state.collection.selectedThemeId === action.id) return state;
      return { ...state, collection: { ...state.collection, selectedThemeId: action.id } };
    }

    case 'backToTitle': {
      // Leaving mid-run does not destroy it — it goes back in the drawer, and
      // the storage copy written each era is what `resume` picks up.
      const stashed = state.run && !state.run.ending ? state.run : state.resumable;
      return {
        ...state,
        screen: 'title',
        run: null,
        offer: null,
        resolution: null,
        prophecyPending: false,
        resumable: stashed,
        unlockedTheme: null,
      };
    }

    case 'dismissGuide': {
      if (state.collection.tutorialSeen) return state;
      // Written through the same effect that persists every other collection
      // change, so a player is never shown it twice.
      return { ...state, collection: { ...state.collection, tutorialSeen: true } };
    }

    case 'dismissTabsHint': {
      if (state.collection.tabsHintSeen) return state;
      return { ...state, collection: { ...state.collection, tabsHintSeen: true } };
    }

    case 'resume': {
      const run = state.resumable;
      if (!run) return state;
      return {
        ...state,
        screen: 'run',
        run,
        offer: nextOffer(run, action.content),
        resolution: null,
        prophecyPending: false,
        resumable: null,
      };
    }

    default:
      return state;
  }
}

export function useGame(content: ContentBundle): Game {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);

  const { run, collection } = state;

  // Collection is written whenever it changes — which is exactly once per
  // finished run, plus the harmless no-op write of the value just loaded.
  useEffect(() => {
    saveCollection(collection);
  }, [collection]);

  // wiki/03: the in-progress run is saved every era so a closed tab does not
  // destroy a fifteen-era ledger.
  useEffect(() => {
    if (!run) return;
    if (run.ending) clearInProgressRun();
    else saveInProgressRun(run);
  }, [run]);

  const begin = useCallback(() => dispatch({ type: 'begin' }), []);

  const create = useCallback(
    (name: string, epithet: string, originId: string, eraCount: number) => {
      // The seed is drawn HERE, not in the reducer, so the reducer stays pure
      // under StrictMode's double invocation.
      dispatch({ type: 'create', name, epithet, originId, eraCount, seed: randomSeed(), content });
    },
    [content],
  );

  const choose = useCallback(
    (optionIndex: number) => dispatch({ type: 'choose', optionIndex, content }),
    [content],
  );

  const continueAfterResolution = useCallback(
    () => dispatch({ type: 'continue', content }),
    [content],
  );

  const acknowledgeProphecy = useCallback(
    () => dispatch({ type: 'acknowledgeProphecy', content }),
    [content],
  );

  const playAgain = useCallback(() => dispatch({ type: 'playAgain' }), []);
  const viewCollection = useCallback(() => dispatch({ type: 'viewCollection' }), []);
  const viewThemes = useCallback(() => dispatch({ type: 'viewThemes' }), []);
  const selectTheme = useCallback((id: ThemeId) => dispatch({ type: 'selectTheme', id }), []);
  const backToTitle = useCallback(() => dispatch({ type: 'backToTitle' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume', content }), [content]);
  const dismissFirstRunGuide = useCallback(() => dispatch({ type: 'dismissGuide' }), []);
  const dismissTabsHint = useCallback(() => dispatch({ type: 'dismissTabsHint' }), []);

  return useMemo(
    () => ({
      screen: state.screen,
      run: state.run,
      offer: state.offer,
      resolution: state.resolution,
      collection: state.collection,
      content,
      begin,
      create,
      choose,
      continueAfterResolution,
      acknowledgeProphecy,
      playAgain,
      viewCollection,
      viewThemes,
      backToTitle,
      // Never offer a theme the collection has not earned. The reducer guards
      // this too; this stops the ending banner from advertising one in the
      // first place if the two ever disagree.
      unlockedTheme:
        state.unlockedTheme &&
        isThemeUnlocked(state.unlockedTheme, state.collection.endingsSeen)
          ? state.unlockedTheme
          : null,
      selectTheme,
      hasResumableRun: state.resumable !== null,
      resume,
      showFirstRunGuide:
        !state.collection.tutorialSeen &&
        state.screen === 'run' &&
        state.run !== null &&
        state.run.eras.length === 0,
      dismissFirstRunGuide,
      showTabsHint:
        !state.collection.tabsHintSeen &&
        state.collection.tutorialSeen &&
        state.screen === 'run' &&
        state.run !== null,
      dismissTabsHint,
    }),
    [
      state.screen,
      state.run,
      state.offer,
      state.resolution,
      state.collection,
      state.resumable,
      state.unlockedTheme,
      content,
      begin,
      create,
      choose,
      continueAfterResolution,
      acknowledgeProphecy,
      playAgain,
      viewCollection,
      viewThemes,
      selectTheme,
      backToTitle,
      resume,
      dismissFirstRunGuide,
      dismissTabsHint,
    ],
  );
}
