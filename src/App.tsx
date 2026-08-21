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
import { defenseOf, useGame } from './engine';
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

  // The chosen one is drawn from the run seed, so a seed is a rematch.
  const heroName = useMemo(() => (run ? heroNameFor(run.seed) : ''), [run]);

  // The denominator for the decline-phase wards readout. Offers already print
  // `+9 Hero Threat`; without this the player has no scale to read it against.
  const defense = useMemo(() => (run ? defenseOf(run, CONTENT) : null), [run]);

  switch (screen) {
    case 'creation':
      return (
        <CreationScreen
          origins={origins}
          epithetChoices={CREATION_EPITHETS}
          artifacts={artifacts}
          factions={factions}
          onCreate={game.create}
          onBack={game.backToTitle}
        />
      );

    case 'run':
      if (!run) break;
      return (
        <>
          <RunScreen
            run={run}
            offer={game.offer}
            resolution={game.resolution}
            lairs={lairs}
            artifacts={artifacts}
            factions={factions}
            onChoose={game.choose}
            onContinue={game.continueAfterResolution}
            defense={defense}
          />
          {/* A sibling, not a screen: the guide points at the header, the
              ledger and the allegiance strip, so all three have to be behind
              it while it is read. */}
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
    />
  );
}
