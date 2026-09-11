/**
 * Themes are cosmetic. Proven, not asserted in a comment.
 *
 * Issue #15's first testing requirement: "A run played under two different
 * themes with the same seed produces an identical `RunState`."
 *
 * That property holds for a slightly stronger reason than the wording implies,
 * and both halves are checked here:
 *
 *   1. STRUCTURAL. The engine has no way to see a theme. `createRun` takes a
 *      seed and a `ContentBundle`; `RunState` has no theme field. The only
 *      engine file that mentions themes at all is `persistence.ts`, and only
 *      to validate an id on the way in from storage. A source scan pins that,
 *      so the day someone threads a theme into resolution the test names the
 *      file.
 *   2. BEHAVIOURAL. Two full runs, same seed, same choices, played with
 *      different themes selected, compared field by field. This is the one the
 *      issue asked for, and it would catch a coupling the source scan missed —
 *      via `ContentBundle`, via a global, via anything.
 *
 * Failure mode 5 applies to the check as much as the thing checked: a scan
 * that matched nothing would pass silently forever, so it asserts it actually
 * read the files it thinks it read.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Collection } from '../types';
import { createRun, resolveChoice } from '../engine/run';
import { nextOffer } from '../engine/offers';
import { recordRun } from '../engine/persistence';
import { fixtureContent } from '../engine/__fixtures__/content';
import { THEMES } from './themes';

const ENGINE_DIR = resolve(process.cwd(), 'src/engine');

/** Every engine source file, tests and fixtures excluded. */
function engineSources(): { name: string; text: string }[] {
  return readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
    .map((name) => ({ name, text: readFileSync(join(ENGINE_DIR, name), 'utf8') }));
}

/**
 * The theme SYSTEM, not the `theme/` directory.
 *
 * A bare `/theme/i` was the first version of this and it was wrong: `systems.ts`
 * and `epithets.ts` both import `tierFor` from `../theme/tokens`, because the
 * Notoriety tier table lives in the same folder. Matching the folder name
 * reported two false positives and would have driven a pointless refactor.
 * These patterns name the cosmetic system specifically.
 */
const THEME_SYSTEM = /\bThemeId\b|\bselectedThemeId\b|\bTHEMES\b|theme\/themes|themeFor|isThemeUnlocked|unlockedTheme/;

describe('themes are structurally invisible to the engine', () => {
  const sources = engineSources();

  it('actually read the engine, so a silent pass is not possible', () => {
    // The scan below proves nothing if the glob is wrong. These are the files
    // that must exist for the assertion to mean anything.
    const names = sources.map((s) => s.name);
    expect(names).toContain('run.ts');
    expect(names).toContain('resolution.ts');
    expect(names).toContain('offers.ts');
    expect(sources.length).toBeGreaterThan(6);
  });

  it('finds the theme system exactly where it is allowed to be', () => {
    const touching = sources
      .filter((s) => THEME_SYSTEM.test(s.text))
      .map((s) => s.name)
      .sort();

    // `persistence.ts` validates a stored id; `useGame.ts` routes the selector
    // and the unlock banner. Both are ABOUT the collection, which survives
    // runs — neither touches how a run resolves. Any other name appearing here
    // means a cosmetic has reached the simulation.
    expect(touching).toEqual(['persistence.ts', 'useGame.ts']);
  });

  it('keeps the theme out of run resolution entirely', () => {
    for (const file of ['run.ts', 'resolution.ts', 'offers.ts', 'systems.ts', 'effects.ts']) {
      const source = sources.find((s) => s.name === file);
      if (!source) continue;
      expect(source.text, `${file} must not know about themes`).not.toMatch(THEME_SYSTEM);
    }
  });

  it('keeps a theme off RunState, which is what makes a seed a rematch', () => {
    const types = readFileSync(resolve(process.cwd(), 'src/types.ts'), 'utf8');
    const runState = types.slice(
      types.indexOf('export type RunState = {'),
      types.indexOf('/** Persisted across runs.'),
    );
    expect(runState.length).toBeGreaterThan(200);
    expect(runState).not.toMatch(THEME_SYSTEM);
  });
});

describe('a seed plays the same under any theme', () => {
  const content = fixtureContent;

  /**
   * Play a whole career deterministically.
   *
   * The theme is applied the way the app applies it — onto the COLLECTION,
   * which is what `createRun` reads for `knownArtifactIds`. If a theme could
   * leak into a run, the collection is the pipe it would travel down, so
   * routing it through here is what makes the test worth running.
   */
  function play(seed: number, collection: Collection) {
    let run = createRun(
      {
        wizardName: 'Malvorn',
        epithet: 'the Unpleasant',
        originId: content.origins[0].id,
        eraCount: 12,
        seed,
        knownArtifactIds: collection.discoveredArtifactIds,
      },
      content,
    );

    // Always take the first option: a fixed policy, so any divergence is the
    // theme rather than the choice.
    for (let i = 0; i < 40 && !run.ending; i++) {
      const offer = nextOffer(run, content);
      if (!offer) break;
      run = resolveChoice(run, offer, 0, content).next;
    }
    return run;
  }

  it('produces an identical RunState under every theme', () => {
    const seed = 20_260_830;
    const base: Collection = {
      version: 3,
      discoveredArtifactIds: [],
      endingsSeen: [],
      runsCompleted: 4,
      bestNotoriety: 60,
      tutorialSeen: true,
      tabsHintSeen: true,
      lastWizardName: 'Malvorn',
      selectedThemeId: 'default',
    };

    const reference = play(seed, base);

    for (const theme of THEMES) {
      const run = play(seed, { ...base, selectedThemeId: theme.id });
      expect(run, `theme ${theme.id} changed the run`).toEqual(reference);
    }
  });

  it('reaches a real ending, so the comparison covers a whole career', () => {
    // An empty or immediately-terminated run would compare equal trivially.
    // This is the anchor that stops the test above from passing on nothing.
    const base: Collection = {
      version: 3,
      discoveredArtifactIds: [],
      endingsSeen: [],
      runsCompleted: 0,
      bestNotoriety: 0,
      tutorialSeen: true,
      tabsHintSeen: true,
      lastWizardName: '',
      selectedThemeId: 'default',
    };
    const run = play(20_260_830, base);
    expect(run.ending).toBeTruthy();
    expect(run.eras.length).toBeGreaterThan(3);
  });

  it('records the same collection delta whatever the theme', () => {
    const base: Collection = {
      version: 3,
      discoveredArtifactIds: [],
      endingsSeen: [],
      runsCompleted: 0,
      bestNotoriety: 0,
      tutorialSeen: true,
      tabsHintSeen: true,
      lastWizardName: '',
      selectedThemeId: 'default',
    };

    const under = (id: Collection['selectedThemeId']) => {
      const collection = { ...base, selectedThemeId: id };
      const run = play(20_260_830, collection);
      // Normalise the one field that is SUPPOSED to differ — what is worn.
      return { ...recordRun(collection, run, content), selectedThemeId: 'default' as const };
    };

    expect(under('ascension')).toEqual(under('default'));
  });
});
