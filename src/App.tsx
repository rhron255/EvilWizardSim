/**
 * The composition root.
 *
 * `useGame` owns all state; this file only routes it to screens and supplies
 * the content bundle. Nothing here holds game state, and no screen below here
 * does either — that rule is what keeps the reducer the single source of truth
 * (wiki/03_systems_architecture-1.md § Ownership rules).
 */

import { useMemo } from 'react';
import type { ContentBundle } from './engine';
import { defenseReadout, projectEffects, useGame } from './engine';
import {
  artifacts,
  endings,
  epithets,
  factions,
  lairs,
  offers,
  origins,
  CREATION_EPITHETS,
} from './content';
import { heroNameFor, prophecyTextFor } from './content/heroes';
import { TitleScreen } from './screens/TitleScreen';
import { CreationScreen } from './screens/CreationScreen';
import { RunScreen } from './screens/RunScreen';
import { FirstRunGuide } from './components/run';
import { ProphecyInterstitial } from './screens/ProphecyInterstitial';
import { EndingScreen } from './screens/EndingScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { ThemeScreen } from './screens/ThemeScreen';

/**
 * Frozen at module scope: `indexOf` caches derived lookup tables against this
 * object's identity, so handing the engine a fresh bundle each render would
 * quietly rebuild every map on every keystroke.
 */
const CONTENT: ContentBundle = {
  factions,
  artifacts,
  lairs,
  origins,
  endings,
  offers,
  epithets,
};

export default function App() {
  const game = useGame(CONTENT);
  const { run, screen } = game;

  /**
   * The cosmetic worn on every screen.
   *
   * Read straight off the collection rather than held anywhere here — App
   * holds no state (wiki/03 § Ownership rules), and a theme is not run state:
   * it survives a career and does not travel with one.
   */
  const themeId = game.collection.selectedThemeId;

  // The chosen one is drawn from the run seed, so a seed is a rematch.
  const heroName = useMemo(() => (run ? heroNameFor(run.seed) : ''), [run]);

  // The denominator for the decline-phase wards readout, itemised. Offers
  // already print `+9 Hero Threat`; without this the player has no scale to
  // read it against, and without the TERMS they never learn that the lair —
  // 30% of the mean defence — is what has been holding the hero off.
  const defense = useMemo(() => (run ? defenseReadout(run, CONTENT) : null), [run]);

  /**
   * The offer as it will actually land, for DISPLAY ONLY.
   *
   * `game.offer` stays the authoritative object — `game.choose(i)` resolves
   * against it by index, and nothing here touches that. What changes is what
   * the card prints: the authored numbers are replaced by the numbers the
   * engine will produce from this run state, which is the only way the card
   * can honour the odds rule once contagion and floor clamps are in play.
   * See `projectEffects` for the two ways they came apart.
   */
  const shownOffer = useMemo(() => {
    const offer = game.offer;
    if (!run || !offer) return offer;
    return {
      ...offer,
      options: offer.options.map((o) =>
        o.kind === 'certain'
          ? { ...o, effects: projectEffects(run, o.effects, CONTENT) }
          : {
              ...o,
              onSuccess: projectEffects(run, o.onSuccess, CONTENT),
              onFailure: projectEffects(run, o.onFailure, CONTENT),
            },
      ),
    };
  }, [game.offer, run]);

  switch (screen) {
    case 'creation':
      return (
        <CreationScreen
          origins={origins}
          epithetChoices={CREATION_EPITHETS}
          artifacts={artifacts}
          factions={factions}
          defaultName={game.collection.lastWizardName}
          onCreate={game.create}
          onBack={game.backToTitle}
          themeId={themeId}
        />
      );

    case 'run':
      if (!run) break;
      return (
        <>
          <RunScreen
            run={run}
            offer={shownOffer}
            resolution={game.resolution}
            lairs={lairs}
            artifacts={artifacts}
            factions={factions}
            onChoose={game.choose}
            onContinue={game.continueAfterResolution}
            defense={defense}
            themeId={themeId}
            showTabsHint={game.showTabsHint}
            onDismissTabsHint={game.dismissTabsHint}
          />
          {/* A sibling, not a screen: the guide opens with the masthead and
              the Decision tab behind it, so both have to be mounted while it
              is read. The ledger and the allegiance strip it also narrates
              are one tap away on the Career tab (issue #18) rather than
              visible on the same screen — the guide's copy describes the
              mechanic, not a component the player is looking at. */}
          {game.showFirstRunGuide && <FirstRunGuide onDismiss={game.dismissFirstRunGuide} />}
        </>
      );

    case 'prophecy':
      if (!run) break;
      return (
        <ProphecyInterstitial
          run={run}
          heroName={heroName}
          text={prophecyTextFor(heroName, run.wizardName)}
          onContinue={game.acknowledgeProphecy}
          themeId={themeId}
        />
      );

    case 'ending': {
      const ending = run?.ending ? endings.find((e) => e.id === run.ending) : undefined;
      // A run that reached this screen without a resolvable ending is a content
      // bug, not a dead end for the player — fall through to the title.
      if (!run || !ending) break;
      return (
        <EndingScreen
          run={run}
          ending={ending}
          lairs={lairs}
          artifacts={artifacts}
          factions={factions}
          onPlayAgain={game.playAgain}
          onViewCollection={game.viewCollection}
          onShare={() => {}}
          themeId={themeId}
          unlockedTheme={game.unlockedTheme}
          onApplyTheme={game.selectTheme}
        />
      );
    }

    case 'collection':
      return (
        <CollectionScreen
          collection={game.collection}
          artifacts={artifacts}
          factions={factions}
          endings={endings}
          onBack={game.backToTitle}
          onViewThemes={game.viewThemes}
        />
      );

    case 'themes':
      return (
        <ThemeScreen
          collection={game.collection}
          endings={endings}
          onSelect={game.selectTheme}
          onBack={game.backToTitle}
        />
      );

    case 'title':
      break;
  }

  return (
    <TitleScreen
      collection={game.collection}
      artifactCount={artifacts.length}
      hasResumableRun={game.hasResumableRun}
      onBegin={game.begin}
      onResume={game.resume}
      onViewCollection={game.viewCollection}
      onViewThemes={game.viewThemes}
    />
  );
}
