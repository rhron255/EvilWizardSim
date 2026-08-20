/**
 * The pivot the whole design rests on.
 *
 * Full-screen, never a card. Up to here the player has been chasing upside;
 * from here they are defending what they built. The flip has to land as a
 * *moment*, so this is staged: a line of light, a date, the headline, the name
 * of the person who will outlive you, the prophecy itself, and then a beat of
 * silence before anything is clickable.
 *
 * What this screen deliberately does NOT do (wiki/01 §6, wiki/04):
 *   - no doom meter
 *   - no "the decline begins" caption
 *   - no numbers at all
 * The decline works because it is a number quietly going the wrong way. Naming
 * it here would spend the whole effect in one screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunState } from '../types';
import { Sigil, tierVars } from '../components/meta';
import styles from './ProphecyInterstitial.module.css';

export type ProphecyInterstitialProps = {
  run: RunState;
  heroName: string;
  /** The prophecy body. Authored content; this screen only stages it. */
  text: string;
  onContinue(): void;
};

/** Cue times in ms. The last cue is the beat of silence before the button. */
/**
 * Reveal schedule, in ms from mount.
 *
 * Was [200, 900, 1750, 3050, 4150, 6250] — six and a quarter seconds for a beat
 * that fires on every single run of a two-to-four-minute game. The set piece
 * has to be LOUD, which is a matter of scale and staging, not duration; a long
 * reveal just becomes the thing a repeat player learns to click through. The
 * shape is unchanged, the pacing is roughly halved, and the skip below still
 * exists for anyone who has seen it.
 */
const CUES = [120, 520, 1000, 1620, 2160, 2900] as const;
const FINAL = CUES.length;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ProphecyInterstitial({ run, heroName, text, onContinue }: ProphecyInterstitialProps) {
  const [stage, setStage] = useState(0);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStage(FINAL);
      return;
    }
    const timers = CUES.map((ms, i) =>
      window.setTimeout(() => setStage((s) => Math.max(s, i + 1)), ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  // Repeat players should not be held hostage by a six-second reveal.
  const skip = useCallback(() => {
    setStage((s) => (s >= FINAL ? s : FINAL));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        if (stage < FINAL) {
          e.preventDefault();
          skip();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip, stage]);

  useEffect(() => {
    if (stage >= FINAL) continueRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const at = (n: number) => (stage >= n ? styles.in : styles.out);

  return (
    <main
      className={styles.screen}
      style={tierVars(run.notoriety)}
      onClick={stage < FINAL ? skip : undefined}
      aria-label="A prophecy"
    >
      <div className={styles.field} aria-hidden>
        <span className={`${styles.shaft} ${at(1)}`} />
        <Sigil name={heroName} size={620} muted spin className={`${styles.halo} ${at(2)}`} />
        <span className={`${styles.aureole} ${at(3)}`} />
      </div>

      <div className={styles.stage}>
        <div className={`${styles.seam} ${at(1)}`} aria-hidden />

        <p className={`${styles.when} ${at(2)}`}>
          Era <span className={styles.num}>{run.eraIndex + 1}</span>
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          {run.wizardName} is <span className={styles.num}>{run.age}</span>
        </p>

        <h1 className={`${styles.headline} ${at(3)}`}>
          <span className={styles.headlineLine}>A child</span>
          <span className={styles.headlineLine}>is born</span>
        </h1>

        <div className={`${styles.hero} ${at(4)}`}>
          <span className={styles.heroRule} aria-hidden />
          <p className={styles.heroName}>{heroName}</p>
          <p className={styles.heroOrigin}>of the Crownlands</p>
        </div>

        <p className={`${styles.text} ${at(5)}`}>{text}</p>

        <div className={`${styles.after} ${at(6)}`}>
          <button
            ref={continueRef}
            type="button"
            className={styles.continue}
            onClick={(e) => {
              e.stopPropagation();
              onContinue();
            }}
          >
            Return to your work
          </button>
        </div>
      </div>

      <p className={`${styles.skipHint} ${stage < FINAL ? styles.in : styles.gone}`} aria-hidden>
        press any key
      </p>
    </main>
  );
}
