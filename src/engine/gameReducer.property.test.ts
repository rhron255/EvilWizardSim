/**
 * The game's state machine, fuzzed with the inputs a real session produces —
 * including the ones a real UI is not supposed to send.
 *
 * A player double-taps Continue; a stale click chooses on a resolved era; the
 * browser's back button lands on the title in the middle of a career; a saved
 * run resumes into a screen that expects a different one. Each of those has
 * shipped as a bug in this repo (the double `recordRun` that counted every career
 * twice and hid the theme-unlock banner, the render-phase dispatch), and every
 * one was invisible to unit tests that drive the happy path one action at a time.
 *
 * This throws random ACTION SEQUENCES at the real reducer with the real content
 * and checks, after every action, that the state is one a player can get out of:
 * it never throws, and no screen is missing the thing it renders. The count of
 * finished careers is anchored to something the reducer does not supply — the set
 * of DISTINCT runs this test saw finish. A career finishes once per run, so a
 * second Continue on the same ended run must not count again. Counting "Continues
 * sent on an ended run" instead would agree with a reducer that double-counts
 * (its leftover state is exactly what such a Continue looks like) — the oracle
 * would repeat the bug it exists to catch.
 */
import { describe, expect, it } from 'vitest';
import { REAL_CONTENT as content } from '../testing/realContent';
import { emptyCollection } from './persistence';
import { gameReducer } from './useGame';
import { mulberry32 } from './rng';

type State = Parameters<typeof gameReducer>[0];
type Action = Parameters<typeof gameReducer>[1];

const SEQUENCES = 400;
const STEPS = 500;

const initial = (): State => ({
  screen: 'title',
  run: null,
  offer: null,
  resolution: null,
  collection: emptyCollection(''),
  prophecyPending: false,
  resumable: null,
  unlockedTheme: null,
});

/** What must be true of any state a player can be looking at. */
function impossible(state: State): string | null {
  const { screen, run, offer, resolution } = state;
  if (screen === 'run') {
    if (!run) return 'the run screen has no run';
    if (!offer && !resolution) return 'the run screen has neither an offer to choose from nor a resolution to continue from';
    if (run.ending && !resolution) return 'the run has ended but there is no resolution to continue from — the player is stuck';
    if (run.eraIndex > run.eraCount) return `era ${run.eraIndex} is past the end of a ${run.eraCount}-era career`;
  }
  if (screen === 'prophecy' && (!run || run.ending)) return 'the prophecy screen has no live run behind it';
  if (screen === 'ending' && !run?.ending) return 'the ending screen has no ending';
  if (state.collection.runsCompleted < 0) return 'runsCompleted went negative';
  return null;
}

describe('game state machine · random action sequences', () => {
  it(`never throws and never strands the player, over ${SEQUENCES} sequences of ${STEPS} actions`, () => {
    const problems: string[] = [];
    // Coverage, so a pass cannot mean "it never left the title screen".
    let careers = 0;
    let prophecies = 0;
    let endings = 0;

    for (let s = 0; s < SEQUENCES && problems.length < 5; s++) {
      const rand = mulberry32(31_000 + s);
      const pickOf = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
      let state = initial();
      const finishedRuns = new Set<string>();
      const log: string[] = [];


      for (let step = 0; step < STEPS; step++) {
        // Weighted toward the loop a real session lives in, with the rest as noise.
        const r = rand();
        let action: Action;
        if (state.screen === 'title' || state.screen === 'creation') {
          action =
            r < 0.55
              ? {
                  type: 'create',
                  name: pickOf(['Ada', 'Malachar the Unpaid', '', '   ', 'x'.repeat(80)]),
                  epithet: pickOf(['the Unpleasant', '', 'of the Low Places']),
                  originId: pickOf([...content.origins.map((o) => o.id), 'no_such_origin']),
                  eraCount: pickOf([12, 16, 20, 4, 40, Number.NaN]),
                  seed: 1 + Math.floor(rand() * 1e6),
                  content,
                }
              : ({ type: pickOf(['begin', 'viewNecrolexicon', 'viewThemes', 'viewChangelog', 'viewTutorial', 'backToTitle', 'resume'] as const), content } as Action);
        } else if (r < 0.42) {
          // Any index, including out of range and non-integer — the engine owns validity.
          action = { type: 'choose', optionIndex: pickOf([0, 1, 2, 3, 4, -1, 99, 0.5, Number.NaN]), content };
        } else if (r < 0.72) {
          action = { type: 'continue', content };
        } else if (r < 0.8) {
          action = { type: 'acknowledgeProphecy', content };
        } else if (r < 0.84) {
          action = { type: 'useRelic', artifactId: pickOf([...content.artifacts.map((a) => a.id), 'not_a_relic']), content };
        } else {
          action = pickOf<Action>([
            { type: 'playAgain' },
            { type: 'backToTitle' },
            { type: 'dismissGuide' },
            { type: 'viewTutorial' },
            { type: 'viewThemes' },
            { type: 'resume', content },
            { type: 'begin' },
          ]);
        }

        // Anchor the career count to what this test knows: a Continue on a
        // resolution of an ended run is the one action that finishes a career.
        if (action.type === 'continue' && state.run?.ending && state.resolution && !finishedRuns.has(state.run.id)) {
          finishedRuns.add(state.run.id);
          careers++;
        }

        log.push(`${action.type}${'optionIndex' in action ? `(${action.optionIndex})` : ''}`);
        try {
          state = gameReducer(state, action);
        } catch (e) {
          problems.push(`sequence ${s}, step ${step}: ${action.type} threw ${(e as Error).message} [${log.slice(-6).join(' > ')}]`);
          break;
        }
        if (state.screen === 'prophecy') prophecies++;
        if (state.screen === 'ending') endings++;
        const why = impossible(state);
        if (why) {
          problems.push(`sequence ${s}, step ${step}: ${why} [${log.slice(-6).join(' > ')}]`);
          break;
        }
        if (state.collection.runsCompleted !== finishedRuns.size) {
          problems.push(`sequence ${s}, step ${step}: ${state.collection.runsCompleted} careers recorded but ${finishedRuns.size} distinct runs finished [${log.slice(-6).join(' > ')}]`);
          break;
        }
      }
    }

    expect(problems).toEqual([]);
    // Guard against a vacuous pass: real careers were finished, and the two set
    // pieces were both reached, many times over.
    expect(careers).toBeGreaterThan(100);
    expect(prophecies).toBeGreaterThan(100);
    expect(endings).toBeGreaterThan(100);
  }, 120_000);
});
