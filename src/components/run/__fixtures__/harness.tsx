/**
 * Visual harness for the run-loop UI.
 *
 * Not part of the game. It exists so the components can be driven and
 * screenshotted before the engine lands — `qa/harness.html` mounts this, and
 * `?scene=` selects a fixture state. Delete once the real App wires the screen.
 */

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../theme/tokens.css';
import { RunScreen } from '../../../screens/RunScreen';
import type { EraRecord, RunState } from '../../../types';
import type { Resolution } from '../resolution';
import {
  demoArtifacts,
  demoEarlyRun,
  demoFactions,
  demoLairs,
  demoLongRun,
  demoOffer,
  demoOfferB,
  demoResolutionDeterministic,
  demoResolutionFailure,
  demoResolutionSuccess,
  demoResolutionTierCross,
  demoRun,
} from './demo';

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene') ?? 'run';

const runFor = () => {
  if (scene === 'early') return demoEarlyRun;
  if (scene === 'long') return demoLongRun;
  return demoRun;
};

const offerFor = () => {
  if (scene === 'offerB') return demoOfferB;
  if (scene === 'empty') return null;
  return demoOffer;
};

const initialResolution = (): Resolution | null => {
  if (scene === 'resolution') return demoResolutionSuccess;
  if (scene === 'resolutionFail') return demoResolutionFailure;
  if (scene === 'tier') return demoResolutionTierCross;
  if (scene === 'resolutionFlat') return demoResolutionDeterministic;
  return null;
};

export function Harness() {
  const [resolution, setResolution] = useState<Resolution | null>(initialResolution);
  const [extraEras, setExtraEras] = useState<EraRecord[]>([]);
  const base = runFor();
  const offer = offerFor();
  const run: RunState = extraEras.length
    ? {
        ...base,
        eras: [...base.eras, ...extraEras],
        eraIndex: base.eraIndex + extraEras.length,
        age: base.age + extraEras.length * 5,
        notoriety: extraEras[extraEras.length - 1].notoriety,
        followers: extraEras[extraEras.length - 1].followers,
      }
    : base;

  // Appending on continue is what exercises the row-append animation and the
  // ledger's scroll-to-newest; the real orchestrator will do the same thing.
  function continueEra() {
    if (resolution) {
      const next = resolution.eraRecord;
      setExtraEras((prev) => [
        ...prev,
        { ...next, eraIndex: run.eras.length, age: run.eras[run.eras.length - 1].age + 5 },
      ]);
    }
    setResolution(null);
  }

  function choose(index: number) {
    const option = offer?.options[index];
    if (!option) return;
    if (option.kind === 'gamble') {
      const roll = Math.random();
      const success = roll < option.odds;
      setResolution({
        ...(success ? demoResolutionSuccess : demoResolutionFailure),
        outcome: success ? 'success' : 'failure',
        odds: option.odds,
        roll,
        appliedEffects: success ? option.onSuccess : option.onFailure,
        text: (success ? option.successText : option.failureText) ?? 'It is done.',
        artifactsGained: success ? demoArtifacts.slice(0, 1) : [],
      });
    } else {
      setResolution({
        ...demoResolutionDeterministic,
        appliedEffects: option.effects,
        text: option.resultText ?? 'It is done.',
      });
    }
  }

  return (
    <RunScreen
      run={run}
      offer={offer}
      resolution={resolution}
      lairs={demoLairs}
      artifacts={demoArtifacts}
      factions={demoFactions}
      onChoose={choose}
      onContinue={continueEra}
    />
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
