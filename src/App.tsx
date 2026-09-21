/**
 * The composition root.
 *
 * `useGame` owns all state; this file only routes it to screens and supplies
 * the content bundle. Nothing here holds game state, and no screen below here
 * does either — that rule is what keeps the reducer the single source of truth
 * (wiki/03_systems_architecture-1.md § Ownership rules).
 */

import { useMemo, useState } from 'react';
import type { ContentBundle } from './engine';
import {
  defenseReadout,
  loadChangelogAck,
  pendingChangelogEntries,
  projectEffects,
  relicPowers,
  saveChangelogAck,
  useGame,
} from './engine';
import {
  artifacts,
  endings,
  epithets,
  factions,
  lairs,
  mechanics,
  offers,
  origins,
  CREATION_EPITHETS,
} from './content';
import { heroNameFor, prophecyTextFor } from './content/heroes';
import { CHANGELOG } from './content/changelog';
import { BUILD_VERSION } from './version';
import { TitleScreen } from './screens/TitleScreen';
import { CreationScreen } from './screens/CreationScreen';
import { RunScreen } from './screens/RunScreen';
import { FirstRunGuide, siegeFor } from './components/run';
import { ChangelogPopup } from './components/meta';
import { ProphecyInterstitial } from './screens/ProphecyInterstitial';
import { EndingScreen } from './screens/EndingScreen';
import { NecrolexiconScreen } from './screens/NecrolexiconScreen';
import { ThemeScreen } from './screens/ThemeScreen';
import { ChangelogScreen } from './screens/ChangelogScreen';

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

  /**
   * The backendless changelog popup (issue #67).
   *
   * `CHANGELOG` and `BUILD_VERSION` are content/build concerns the engine
   * deliberately never imports (wiki/03 § Content pipeline), so the "what is
   * pending" computation happens here rather than in `useGame`'s reducer —
   * only the acknowledged version is persisted, via the same wrapped
   * localStorage access every other save uses.
   *
   * Read once, on mount: acknowledging is the only thing that can change it
   * during a session, and both places that do so also clear this state
   * directly rather than waiting for a re-read.
   */
  const [pendingChangelog, setPendingChangelog] = useState(() =>
    pendingChangelogEntries(CHANGELOG, BUILD_VERSION, loadChangelogAck()),
  );

  const acknowledgeChangelog = () => {
    saveChangelogAck(BUILD_VERSION);
    setPendingChangelog([]);
  };

  // The chosen one is drawn from the run seed, so a seed is a rematch.
  const heroName = useMemo(() => (run ? heroNameFor(run.seed) : ''), [run]);

  // The decline-phase wards readout, whole. Offers already print `+9 Hero
  // Threat`; without this the player has no scale to read it against, and
  // without the TERMS they never learn that the lair is what has been
  // holding the hero off.
  //
  // Derived HERE rather than in the panel, because `siegeFor` needs the
  // content bundle to price the hero's next era: `vigil` relics slow him, so
  // the rate the caption prints is a fact about the reliquary as well as
  // about the run.
  const siege = useMemo(
    () => (run ? siegeFor(run, defenseReadout(run, CONTENT), CONTENT) : null),
    [run],
  );
  // Never null, unlike `siege` above: a wizard always has a reliquary, even
  // an empty one. `siege` is absent outside the decline, so it is typed that
  // way; a summed-powers record with every term at zero is the honest answer
  // here.
  const relics = useMemo(
    () => relicPowers({ heldArtifactIds: run?.heldArtifactIds ?? [] }, CONTENT),
    [run],
  );

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
            content={CONTENT}
            onChoose={game.choose}
            onContinue={game.continueAfterResolution}
            siege={siege}
            relics={relics}
            themeId={themeId}
          />
          {/* A sibling, not a screen: the guide opens with the masthead and
              the run screen's own content behind it, so both have to be
              mounted while it is read. It sits as a modal scrim over that
              content — the guide's copy describes the mechanic, not a
              component the player is looking at. */}
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
          onViewNecrolexicon={game.viewNecrolexicon}
          onShare={() => {}}
          themeId={themeId}
          unlockedTheme={game.unlockedTheme}
          onApplyTheme={game.selectTheme}
        />
      );
    }

    case 'necrolexicon':
      return (
        <NecrolexiconScreen
          collection={game.collection}
          artifacts={artifacts}
          factions={factions}
          endings={endings}
          mechanics={mechanics}
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

    case 'changelog':
      return (
        <ChangelogScreen changelog={CHANGELOG} collection={game.collection} onBack={game.backToTitle} />
      );

    // A replayed guide (issue #37) is a modal over the title screen, the same
    // way the gated first showing is a modal over the run screen — so
    // 'tutorial' falls through to the same render below rather than getting a
    // case of its own.
    case 'title':
    case 'tutorial':
      break;
  }

  return (
    <>
      <TitleScreen
        collection={game.collection}
        artifactCount={artifacts.length}
        hasResumableRun={game.hasResumableRun}
        onBegin={game.begin}
        onResume={game.resume}
        onViewNecrolexicon={game.viewNecrolexicon}
        onViewThemes={game.viewThemes}
        onViewChangelog={game.viewChangelog}
        onViewTutorial={game.viewTutorial}
      />
      {screen === 'tutorial' && (
        // `dismissFirstRunGuide` is a no-op here — `tutorialSeen` is already
        // true on any run that can reach the title screen's Tutorial door —
        // so the screen change back to the title is what actually closes it.
        <FirstRunGuide
          onDismiss={() => {
            game.dismissFirstRunGuide();
            game.backToTitle();
          }}
        />
      )}
      {/* On launch only — the title screen is where every session starts,
          whether or not there is a run to resume. Acknowledging saves the
          build version so a reload of the same build never shows it again;
          the full history stays reachable from the Changelog door either way. */}
      {pendingChangelog.length > 0 && (
        <ChangelogPopup
          entries={pendingChangelog}
          themeId={themeId}
          onDismiss={acknowledgeChangelog}
          onViewChangelog={() => {
            acknowledgeChangelog();
            game.viewChangelog();
          }}
        />
      )}
    </>
  );
}
