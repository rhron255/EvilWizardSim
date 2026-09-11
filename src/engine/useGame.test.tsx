/**
 * When the first-run guide is owed, and when it is emphatically not.
 *
 * The gate is a derivation inside `useGame`'s memo, which is exactly the shape
 * of this repo's most repeated failure — a correct mapping nobody calls
 * (CLAUDE.md § 2). So these drive the real hook rather than asserting on the
 * reducer alone, and they cover the persistence half too: shown twice is worse
 * than never shown, because the second time it is an obstacle.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ContentBundle } from './index';
import { COLLECTION_KEY } from './constants';
import { emptyCollection, migrateCollection, recordRun } from './persistence';
import { useGame } from './useGame';
import { fixtureContent } from './__fixtures__/content';

const content: ContentBundle = fixtureContent;

/** Straight to era one of a fresh career. */
function beginRun() {
  const hook = renderHook(() => useGame(content));
  act(() => hook.result.current.begin());
  act(() => hook.result.current.create('Malachar', 'the Unpaid', content.origins[0].id, 16));
  return hook;
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the first-run guide gate', () => {
  it('is owed on a first career, before the first choice', () => {
    const { result } = beginRun();
    expect(result.current.showFirstRunGuide).toBe(true);
  });

  it('is not owed on the title or creation screens', () => {
    const hook = renderHook(() => useGame(content));
    expect(hook.result.current.showFirstRunGuide).toBe(false);
    act(() => hook.result.current.begin());
    expect(hook.result.current.showFirstRunGuide).toBe(false);
  });

  it('closes for good once dismissed', () => {
    const { result } = beginRun();
    act(() => result.current.dismissFirstRunGuide());
    expect(result.current.showFirstRunGuide).toBe(false);
    expect(result.current.collection.tutorialSeen).toBe(true);
  });

  it('does not come back on the next career', () => {
    const { result } = beginRun();
    act(() => result.current.dismissFirstRunGuide());
    act(() => result.current.playAgain());
    act(() => result.current.create('Second', 'the Wiser', content.origins[0].id, 16));
    expect(result.current.showFirstRunGuide).toBe(false);
  });

  it('does not reopen mid-career after a refresh', () => {
    // Undismissed but already playing: the guide points at an empty ledger and
    // a career's first decision, neither of which is still true at era four.
    const { result } = beginRun();
    act(() => result.current.choose(0));
    act(() => result.current.continueAfterResolution());
    expect(result.current.run?.eras.length).toBeGreaterThan(0);
    expect(result.current.showFirstRunGuide).toBe(false);
  });

  it('survives the reload it was dismissed on', () => {
    const first = beginRun();
    act(() => first.result.current.dismissFirstRunGuide());
    first.unmount();

    const second = beginRun();
    expect(second.result.current.collection.tutorialSeen).toBe(true);
    expect(second.result.current.showFirstRunGuide).toBe(false);
  });

  it('is owed again after a storage wipe, which is a new player by definition', () => {
    const first = beginRun();
    act(() => first.result.current.dismissFirstRunGuide());
    first.unmount();
    localStorage.clear();

    const second = beginRun();
    expect(second.result.current.showFirstRunGuide).toBe(true);
  });
});

describe('the tabs hint gate', () => {
  it('is not owed while the first-run guide is still up', () => {
    const { result } = beginRun();
    expect(result.current.showFirstRunGuide).toBe(true);
    expect(result.current.showTabsHint).toBe(false);
  });

  it('is owed the moment the guide is out of the way', () => {
    const { result } = beginRun();
    act(() => result.current.dismissFirstRunGuide());
    expect(result.current.showTabsHint).toBe(true);
  });

  it('is not owed on the title or creation screens', () => {
    const hook = renderHook(() => useGame(content));
    expect(hook.result.current.showTabsHint).toBe(false);
    act(() => hook.result.current.begin());
    expect(hook.result.current.showTabsHint).toBe(false);
  });

  it('closes for good once dismissed', () => {
    const { result } = beginRun();
    act(() => result.current.dismissFirstRunGuide());
    act(() => result.current.dismissTabsHint());
    expect(result.current.showTabsHint).toBe(false);
    expect(result.current.collection.tabsHintSeen).toBe(true);
  });

  it('does not come back on the next career', () => {
    const { result } = beginRun();
    act(() => result.current.dismissFirstRunGuide());
    act(() => result.current.dismissTabsHint());
    act(() => result.current.playAgain());
    act(() => result.current.create('Second', 'the Wiser', content.origins[0].id, 16));
    act(() => result.current.dismissFirstRunGuide());
    expect(result.current.showTabsHint).toBe(false);
  });

  it('survives the reload it was dismissed on', () => {
    const first = beginRun();
    act(() => first.result.current.dismissFirstRunGuide());
    act(() => first.result.current.dismissTabsHint());
    first.unmount();

    const second = beginRun();
    expect(second.result.current.collection.tabsHintSeen).toBe(true);
    expect(second.result.current.showTabsHint).toBe(false);
  });

  it('is owed immediately for a returning player whose save predates this field', () => {
    // Shaped like a v3 save: `tutorialSeen: true` from an already-finished
    // career, and no `tabsHintSeen` at all — the swipe gesture postdates
    // every save this player has ever written.
    localStorage.setItem(
      COLLECTION_KEY,
      JSON.stringify({
        version: 3,
        discoveredArtifactIds: [],
        endingsSeen: [],
        runsCompleted: 12,
        bestNotoriety: 40,
        tutorialSeen: true,
        lastWizardName: 'Old Wizard',
        selectedThemeId: 'default',
      }),
    );
    const { result } = beginRun();
    expect(result.current.showFirstRunGuide).toBe(false);
    expect(result.current.showTabsHint).toBe(true);
  });
});

describe('the remembered name', () => {
  it('is empty for a player who has never named a wizard', () => {
    const { result } = renderHook(() => useGame(content));
    expect(result.current.collection.lastWizardName).toBe('');
  });

  it('is kept the moment a career is named, not when it ends', () => {
    // An abandoned run should still spare the retyping — the name is the only
    // typing in the game.
    const { result } = beginRun();
    expect(result.current.collection.lastWizardName).toBe('Malachar');
  });

  it('survives a reload', () => {
    const first = beginRun();
    first.unmount();
    const second = renderHook(() => useGame(content));
    expect(second.result.current.collection.lastWizardName).toBe('Malachar');
  });

  it('takes the sanitised name the engine actually used', () => {
    // `createRun` trims and collapses whitespace; remembering the raw input
    // would prefill something the last run was never called.
    const hook = renderHook(() => useGame(content));
    act(() => hook.result.current.begin());
    act(() => hook.result.current.create('  Vashter   the  Long  ', '', content.origins[0].id, 16));
    expect(hook.result.current.collection.lastWizardName).toBe('Vashter the Long');
  });

  it('is re-confirmed by a finished career', () => {
    const c = { ...emptyCollection(), lastWizardName: 'Old Name' };
    const run = { wizardName: 'Newer Name', heldArtifactIds: [], eras: [], ending: 'lichdom', notoriety: 4 };
    expect(recordRun(c, run as never, content).lastWizardName).toBe('Newer Name');
  });
});

describe('collection v1 -> v2', () => {
  it('spares a returning player the guide for a game they have finished', () => {
    const v1 = {
      version: 1,
      discoveredArtifactIds: ['a'],
      endingsSeen: ['lichdom'],
      runsCompleted: 3,
      bestNotoriety: 71,
    };
    const migrated = migrateCollection(v1);
    expect(migrated.tutorialSeen).toBe(true);
    // And nothing else was lost on the way through.
    expect(migrated.runsCompleted).toBe(3);
    expect(migrated.bestNotoriety).toBe(71);
    expect(migrated.endingsSeen).toEqual(['lichdom']);
  });

  it('still owes it to a v1 save that never finished a career', () => {
    expect(migrateCollection({ version: 1, runsCompleted: 0 }).tutorialSeen).toBe(false);
  });

  it('keeps an explicit false rather than inferring from runs', () => {
    // A player who skipped the guide and then finished a run must not be
    // reasoned back into having seen it, or the flag means nothing.
    expect(migrateCollection({ version: 2, runsCompleted: 5, tutorialSeen: false }).tutorialSeen).toBe(
      false,
    );
  });

  it('defaults the remembered name to empty for an older save', () => {
    expect(migrateCollection({ version: 1, runsCompleted: 2 }).lastWizardName).toBe('');
  });

  it('carries the flag through a recorded run', () => {
    const c = { ...emptyCollection(), tutorialSeen: true };
    const run = { heldArtifactIds: [], eras: [], ending: 'retired_to_swamp', notoriety: 10 };
    expect(recordRun(c, run as never, content).tutorialSeen).toBe(true);
  });

  it('reads a v2 save back exactly as written', () => {
    const written = { ...emptyCollection(), tutorialSeen: true, runsCompleted: 2 };
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(written));
    expect(migrateCollection(JSON.parse(localStorage.getItem(COLLECTION_KEY)!))).toEqual(written);
  });
});

describe('collection v2 -> v3 · the theme pointer', () => {
  it('dresses an older save in the default rather than nothing', () => {
    const v2 = {
      version: 2,
      discoveredArtifactIds: ['a'],
      endingsSeen: ['lichdom'],
      runsCompleted: 3,
      bestNotoriety: 71,
      tutorialSeen: true,
      lastWizardName: 'Malvorn',
    };
    const migrated = migrateCollection(v2);
    expect(migrated.selectedThemeId).toBe('default');
    // And nothing else was lost on the way through.
    expect(migrated.runsCompleted).toBe(3);
    expect(migrated.endingsSeen).toEqual(['lichdom']);
    expect(migrated.lastWizardName).toBe('Malvorn');
    expect(migrated.tutorialSeen).toBe(true);
  });

  it('keeps a theme the collection has unlocked', () => {
    expect(
      migrateCollection({ version: 3, endingsSeen: ['ascension'], selectedThemeId: 'ascension' })
        .selectedThemeId,
    ).toBe('ascension');
  });

  it('falls back for a theme this build has never heard of', () => {
    // The failure this prevents is specific: `data-theme="cold_room_v2"`
    // matches no CSS block, so the page renders with NO theme rather than with
    // the default one — an unstyled screen from a one-word typo in storage.
    for (const junk of ['cold_room_v2', '', 'DEFAULT', 42, null, {}, []]) {
      expect(migrateCollection({ version: 3, selectedThemeId: junk }).selectedThemeId).toBe(
        'default',
      );
    }
  });

  it('rejects a defined theme whose ending has not been reached', () => {
    // Migration is an input boundary too: otherwise a hand-edited save bypasses
    // the selector's guard and applies a locked theme throughout the app.
    const migrated = migrateCollection({
      version: 3,
      endingsSeen: [],
      selectedThemeId: 'ascension',
    });
    expect(migrated.selectedThemeId).toBe('default');
  });

  it('leaves what the player is wearing alone when a run is recorded', () => {
    const c = { ...emptyCollection(), selectedThemeId: 'lichdom' as const };
    const run = { heldArtifactIds: [], eras: [], ending: 'ascension', notoriety: 10 };
    // Finishing a career unlocks a theme; it does not put it on. The ending
    // card offers it and the player taps.
    expect(recordRun(c, run as never, content).selectedThemeId).toBe('lichdom');
  });

  it('reads a v3 save back exactly as written', () => {
    const written = { ...emptyCollection(), selectedThemeId: 'peat_not_a_theme' };
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(written));
    expect(migrateCollection(JSON.parse(localStorage.getItem(COLLECTION_KEY)!))).toEqual({
      ...written,
      selectedThemeId: 'default',
    });
  });
});

describe('collection v3 -> v4 · the tabs hint flag', () => {
  it('owes the hint to a v3 save, whatever its other history', () => {
    // Unlike `tutorialSeen`'s v1 -> v2 migration, there is no runsCompleted
    // branch: the swipe gesture is new content nobody's save has ever shown.
    const v3 = {
      version: 3,
      discoveredArtifactIds: ['a'],
      endingsSeen: ['lichdom'],
      runsCompleted: 40,
      bestNotoriety: 71,
      tutorialSeen: true,
      lastWizardName: 'Malvorn',
      selectedThemeId: 'default',
    };
    const migrated = migrateCollection(v3);
    expect(migrated.tabsHintSeen).toBe(false);
    // And nothing else was lost on the way through.
    expect(migrated.runsCompleted).toBe(40);
    expect(migrated.tutorialSeen).toBe(true);
  });

  it('keeps an explicit true rather than reshowing it', () => {
    expect(
      migrateCollection({ version: 4, tutorialSeen: true, tabsHintSeen: true }).tabsHintSeen,
    ).toBe(true);
  });

  it('reads a v4 save back exactly as written', () => {
    const written = { ...emptyCollection(), tabsHintSeen: true };
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(written));
    expect(migrateCollection(JSON.parse(localStorage.getItem(COLLECTION_KEY)!))).toEqual(written);
  });
});
