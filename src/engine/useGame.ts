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
import type { Collection, Offer, RunState, Screen } from '../types';
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
  backToTitle(): void;
  hasResumableRun: boolean;
  resume(): void;
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
  | { type: 'backToTitle' }
  | { type: 'resume'; content: ContentBundle };

function initialState(): GameState {
  return {
    screen: 'title',
    run: null,
    offer: null,
    resolution: null,
    collection: loadCollection(),
    prophecyPending: false,
    resumable: loadInProgressRun(),
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
        },
        action.content,
      );
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
        return {
          ...state,
          screen: 'ending',
          offer: null,
          collection: recordRun(state.collection, state.run, action.content),
          resumable: null,
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
      return { ...state, screen: 'creation', run: null, offer: null, resolution: null };

    case 'viewCollection':
      return { ...state, screen: 'collection' };

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
      };
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
  const backToTitle = useCallback(() => dispatch({ type: 'backToTitle' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume', content }), [content]);

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
      backToTitle,
      hasResumableRun: state.resumable !== null,
      resume,
    }),
    [
      state.screen,
      state.run,
      state.offer,
      state.resolution,
      state.collection,
      state.resumable,
      content,
      begin,
      create,
      choose,
      continueAfterResolution,
      acknowledgeProphecy,
      playAgain,
      viewCollection,
      backToTitle,
      resume,
    ],
  );
}
