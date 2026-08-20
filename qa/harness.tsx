/* Temporary visual harness for the meta screens. Not shipped, not linted,
   not typechecked (qa/ is outside tsconfig include and eslint ignores it). */

import { createRoot } from 'react-dom/client';
import '../src/theme/tokens.css';
import { TitleScreen } from '../src/screens/TitleScreen';
import { CreationScreen } from '../src/screens/CreationScreen';
import { ProphecyInterstitial } from '../src/screens/ProphecyInterstitial';
import { EndingScreen } from '../src/screens/EndingScreen';
import { CollectionScreen } from '../src/screens/CollectionScreen';
import {
  demoArtifacts,
  demoCollection,
  demoEmptyCollection,
  demoEndings,
  demoEpithets,
  demoFactions,
  demoHeroName,
  demoLairs,
  demoOrigins,
  demoProphecyText,
  demoQuietRun,
  demoRun,
  demoRunAtProphecy,
} from '../src/components/meta/__fixtures__/demo';

const params = new URLSearchParams(location.search);
const which = params.get('screen') ?? 'title';
const variant = params.get('variant') ?? '';

const noop = () => {};

function pick() {
  switch (which) {
    case 'creation':
      return (
        <CreationScreen
          origins={demoOrigins}
          epithetChoices={demoEpithets}
          artifacts={demoArtifacts}
          factions={demoFactions}
          onCreate={noop}
          onBack={noop}
        />
      );

    case 'prophecy':
      return (
        <ProphecyInterstitial
          run={demoRunAtProphecy}
          heroName={demoHeroName}
          text={demoProphecyText}
          onContinue={noop}
        />
      );

    case 'ending':
      return (
        <EndingScreen
          run={variant === 'quiet' ? demoQuietRun : demoRun}
          ending={
            demoEndings.find(
              (e) => e.id === (variant === 'quiet' ? 'retired_to_swamp' : 'slain_by_chosen_one'),
            )!
          }
          lairs={demoLairs}
          artifacts={demoArtifacts}
          factions={demoFactions}
          onPlayAgain={noop}
          onViewCollection={noop}
          onShare={noop}
        />
      );

    case 'collection':
      return (
        <CollectionScreen
          collection={variant === 'empty' ? demoEmptyCollection : demoCollection}
          artifacts={demoArtifacts}
          factions={demoFactions}
          endings={demoEndings}
          onBack={noop}
        />
      );

    case 'title':
    default:
      return (
        <TitleScreen
          collection={variant === 'empty' ? demoEmptyCollection : demoCollection}
          artifactCount={demoArtifacts.length}
          hasResumableRun={variant !== 'empty'}
          onBegin={noop}
          onResume={noop}
          onViewCollection={noop}
        />
      );
  }
}

createRoot(document.getElementById('root')!).render(pick());
