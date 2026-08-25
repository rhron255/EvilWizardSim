/**
 * Identity capture, before a single mechanic is explained.
 *
 * Reference principle 1: everything that happens afterwards happens to
 * something the player named. So the name comes first, it is physically the
 * largest thing on the screen, and it is set on the sigil that will follow the
 * wizard through the prophecy, the ending card and the share image.
 *
 * This is the only text input in the entire game. Everything else is a choice
 * between three or four things. No stat allocation, no sliders.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { Artifact, Faction, Origin } from '../types';
import { MAX_NAME_LENGTH } from '../engine';
import { formatEffect, isNegative, Sigil, tierVars } from '../components/meta';
import styles from './CreationScreen.module.css';

export type CreationScreenProps = {
  origins: Origin[];
  epithetChoices: string[];
  /**
   * The last name this player used, or ''. Prefilled and selected, so a second
   * career is one tap away and a different one is still just typing.
   */
  defaultName?: string;
  /** Catalog, so an origin that grants a relic can name it. */
  artifacts: Artifact[];
  factions: Faction[];
  onCreate(name: string, epithet: string, originId: string, eraCount: number): void;
  onBack(): void;
};

/**
 * The engine's limit, imported rather than copied.
 *
 * This was a local `const MAX_NAME = 40` with a comment promising it matched
 * `MAX_NAME_LENGTH` in run.ts. A promise in a comment is what failure mode 3
 * is about, and this field has already truncated a name once — at 26, which
 * committed "Vashter of the Long Arrears" as "Vashter of the Long Arrear".
 * The name is the identity anchor the whole run hangs off, so the input must
 * accept exactly what the engine accepts, and the display scales to fit
 * instead of clipping.
 */
const MAX_NAME = MAX_NAME_LENGTH;

/** Sizes the placeholder when the field is empty, so it does not jump on type. */
const PLACEHOLDER_LEN = 8;

/**
 * Notes are kept to three words or so on purpose. This screen is the longest
 * scroll in the game on a phone and none of it is play — every line here is a
 * line between the player and the first choice. The MECHANICAL part (era count
 * and the years it buys) is never abbreviated; only the flavour is.
 */
const LENGTHS = [
  { eras: 12, name: 'Brief', note: 'Short and loud.' },
  { eras: 16, name: 'Standard', note: 'The intended shape.' },
  { eras: 20, name: 'Long', note: 'More to lose.' },
] as const;

export function CreationScreen({
  origins,
  epithetChoices,
  artifacts,
  factions,
  defaultName = '',
  onCreate,
  onBack,
}: CreationScreenProps) {
  const [name, setName] = useState(defaultName);
  const [epithet, setEpithet] = useState(epithetChoices[0] ?? '');
  const [originId, setOriginId] = useState(origins[0]?.id ?? '');
  const [eraCount, setEraCount] = useState<number>(16);

  const nameId = useId();
  const groupId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  // Prefilled AND selected: the remembered name is a default, not a decision.
  // Typing replaces it whole, which is what a player wanting a new wizard
  // does; tapping once puts the caret where they touched, which is what a
  // player fixing a typo does. Selecting only on mount keeps both.
  useEffect(() => {
    if (defaultName) nameRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = name.trim();
  const ready = trimmed.length > 0 && Boolean(originId);
  const sigilSeed = trimmed || 'nameless';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    onCreate(trimmed, epithet, originId, eraCount);
  }

  return (
    <main className={styles.screen} style={tierVars(0)}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <header className={styles.top}>
          <button type="button" className={styles.back} onClick={onBack}>
            ← Back
          </button>
          <p className={styles.chapter}>Chapter One</p>
          <span className={styles.topSpacer} aria-hidden />
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* I. The name                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className={styles.nameSection} aria-labelledby={`${nameId}-label`}>
          {/* The label sits ABOVE the ring, not inside it.
              Measured at 393x852: the sigil's box was [72, 244] and the label's
              [105, 120] — entirely enclosed, so the ring's strokes ran through
              the letters and it read as a collision rather than as a
              composition. The seal keeps the name; it does not get the caption
              too. */}
          <label className={styles.sectionLabel} htmlFor={nameId} id={`${nameId}-label`}>
            <span className={styles.numeral}>I</span> Your name
          </label>
          <div className={styles.sigilStage}>
            <Sigil name={sigilSeed} size={300} className={styles.sigil} />
            <div className={styles.nameField}>
              <input
                id={nameId}
                ref={nameRef}
                className={styles.nameInput}
                // Genuinely dynamic: the type size is a function of how much
                // name there is. CSS does the arithmetic against the field's
                // own width (see .nameInput), this only reports the count.
                style={
                  {
                    '--name-len': Math.max(name.length, PLACEHOLDER_LEN),
                  } as React.CSSProperties
                }
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                placeholder="Nameless"
                maxLength={MAX_NAME}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="done"
                aria-describedby={`${nameId}-help`}
                autoFocus
              />
              <span className={styles.nameRule} aria-hidden />
            </div>
          </div>

          <p className={styles.help} id={`${nameId}-help`}>
            The seal is drawn from the name. The only thing you will type all game.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* II. The epithet                                                   */}
        {/* ---------------------------------------------------------------- */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionLabel}>
            <span className={styles.numeral}>II</span> How they will say it
          </legend>

          <div className={styles.chips} role="presentation">
            {epithetChoices.map((choice) => (
              <label
                key={choice}
                className={choice === epithet ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              >
                <input
                  type="radio"
                  name={`${groupId}-epithet`}
                  className={styles.radio}
                  value={choice}
                  checked={choice === epithet}
                  onChange={() => setEpithet(choice)}
                />
                <span className={styles.chipText}>{choice}</span>
              </label>
            ))}
          </div>

          <p className={styles.preview} aria-live="polite">
            <span className={styles.previewName}>{trimmed || 'Nameless'}</span>
            <span className={styles.previewEpithet}>{epithet ? `, ${epithet}` : ''}</span>
          </p>
        </fieldset>

        {/* ---------------------------------------------------------------- */}
        {/* III. The origin                                                   */}
        {/* ---------------------------------------------------------------- */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionLabel}>
            <span className={styles.numeral}>III</span> Where you come from
          </legend>

          <div className={styles.origins}>
            {origins.map((origin) => (
              <label
                key={origin.id}
                className={
                  origin.id === originId ? `${styles.origin} ${styles.originOn}` : styles.origin
                }
              >
                <input
                  type="radio"
                  name={`${groupId}-origin`}
                  className={styles.radio}
                  value={origin.id}
                  checked={origin.id === originId}
                  onChange={() => setOriginId(origin.id)}
                />
                <span className={styles.originInner}>
                  <span className={styles.originName}>{origin.name}</span>
                  <span className={styles.originBlurb}>{origin.blurb}</span>
                  <span className={styles.originRule} aria-hidden />
                  <span className={styles.effects}>
                    <span className={styles.effectsLabel}>You begin with</span>
                    {origin.effects.map((effect, i) => (
                      <span
                        key={i}
                        className={
                          isNegative(effect) ? `${styles.effect} ${styles.effectDown}` : styles.effect
                        }
                      >
                        {formatEffect(effect, { artifacts, factions })}
                      </span>
                    ))}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ---------------------------------------------------------------- */}
        {/* IV. The length                                                    */}
        {/* ---------------------------------------------------------------- */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionLabel}>
            <span className={styles.numeral}>IV</span> How long a life
          </legend>

          <div className={styles.lengths}>
            {LENGTHS.map((option) => (
              <label
                key={option.eras}
                className={
                  option.eras === eraCount ? `${styles.length} ${styles.lengthOn}` : styles.length
                }
              >
                <input
                  type="radio"
                  name={`${groupId}-length`}
                  className={styles.radio}
                  value={option.eras}
                  checked={option.eras === eraCount}
                  onChange={() => setEraCount(option.eras)}
                />
                <span className={styles.lengthInner}>
                  <span className={styles.lengthName}>{option.name}</span>
                  <span className={styles.lengthEras}>
                    <span className={styles.lengthNum}>{option.eras}</span> eras
                  </span>
                  <span className={styles.lengthYears}>{option.eras * 5} years</span>
                  <span className={styles.lengthNote}>{option.note}</span>
                </span>
              </label>
            ))}
          </div>

          <p className={styles.help}>
            Length sets how many decisions you make, not how hard they are.
          </p>
        </fieldset>

        <footer className={styles.bottom}>
          <button type="submit" className={styles.commit} disabled={!ready}>
            Begin the career
          </button>
          <p className={styles.commitNote}>
            {ready ? 'No second chances. Plenty of second runs.' : 'Give yourself a name first.'}
          </p>
        </footer>
      </form>
    </main>
  );
}
