/**
 * Three cards, once, before the first choice of a player's first career.
 *
 * Requested as a tutorial. The constraint that shapes it is that a whole run is
 * two to four minutes — a minute of instruction costs a third of the
 * experience — so this teaches only what the run screen cannot teach by
 * existing, and it opens ON the run screen, with the masthead and the
 * Decision tab's empty offer slot visible behind it (issue #18 moved the
 * ledger and the allegiance strip this guide narrates onto the Career tab,
 * one deliberate tap away rather than on screen with the guide itself).
 *
 * Two things are deliberately NOT here:
 *
 *   - The prophecy. It is the pivot the whole arc turns on and it is staged as
 *     a reveal; explaining it in advance spends the set piece to save the
 *     player ten seconds of surprise. wiki/04's "do not add a doom meter" says
 *     the same thing from the other end — the decline is not announced, and a
 *     tutorial card announcing it is still announcing it.
 *   - Anything the Decision tab already says on its own. Every stat prints its
 *     own threshold (see `stakes.ts`), so the third card points at that
 *     mechanism rather than restating five numbers the player is about to
 *     read anyway.
 *
 * Identity capture already happened on the creation screen, which is reference
 * principle 1: the player has a name before a single mechanic is explained.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import styles from './FirstRunGuide.module.css';

export type FirstRunGuideProps = {
  /** Marks the guide seen. Called once, on finish or skip. */
  onDismiss(): void;
};

type Card = { eyebrow: string; title: string; body: string };

const CARDS: Card[] = [
  {
    eyebrow: 'The loop',
    title: 'One era at a time',
    body: 'Every era you pick one card. A gamble prints its odds and both outcomes before you commit — the worst it can do is written on it. Some things also move between eras on their own, and the card that follows says which.',
  },
  {
    eyebrow: 'The cast',
    title: 'The same six, every run',
    // The seal moved here. It used to be a permanent sentence in the header —
    // printed from era one, above a wizard too obscure for the Academy to care
    // about, on top of the choice cards. The live distance is now a tick on
    // every faction's bar; this is where the rule gets explained, once. Both
    // halves of the trigger are named, because a threshold without the thing
    // that trips it is half a disclosure (`allegiances.ts` documents the death
    // that taught us so).
    //
    // It no longer names the Academy, because the Academy is no longer the
    // only one: all six carry the same condition and each has its own idea of
    // what to do about you. Teaching the gem specifically would leave five
    // reprisals as the surprise this card exists to prevent.
    body: 'Six factions, the same six every career. Court one and its enemies hear about it: standing spills along old grudges — sink far enough with any of them and, once your name is big enough, they deal with you permanently, each in their own way.',
  },
  {
    eyebrow: 'The numbers',
    title: 'Each one says what it does',
    body: 'Followers, relics, apprentices, loyalty, pact debt. The ones that can end a career show the threshold and how far you are from it. Tap one for what it does.',
  },
];

export function FirstRunGuide({ onDismiss }: FirstRunGuideProps) {
  const [index, setIndex] = useState(0);
  const headingId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);

  const last = index === CARDS.length - 1;
  const card = CARDS[index];

  // `onDismiss` dispatches into the game reducer, so it must NOT be called
  // from inside a `setIndex` updater — React runs those during render, and
  // updating another component from there is a warning today and a bug when
  // it starts being enforced. Decide first, then set.
  const advance = useCallback(() => {
    if (last) {
      onDismiss();
      return;
    }
    setIndex((i) => Math.min(i + 1, CARDS.length - 1));
  }, [last, onDismiss]);

  // Focus moves to the button on every card, so a keyboard or screen-reader
  // player is never left on a control that has just been relabelled.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advance();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, onDismiss]);

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{card.eyebrow}</p>
        {/* Keyed so the text re-enters on each card — without it the block
            swaps in place and reads as a rendering glitch rather than a page
            turn. */}
        <h2 className={styles.title} id={headingId} key={`t${index}`}>
          {card.title}
        </h2>
        <p className={styles.body} key={`b${index}`}>
          {card.body}
        </p>

        <div className={styles.foot}>
          <ol className={styles.dots} aria-label={`Card ${index + 1} of ${CARDS.length}`}>
            {CARDS.map((c, i) => (
              <li
                key={c.title}
                className={styles.dot}
                data-on={i === index ? 'true' : undefined}
                aria-hidden="true"
              />
            ))}
          </ol>

          <div className={styles.actions}>
            {!last && (
              <button type="button" className={styles.skip} onClick={onDismiss}>
                Skip
              </button>
            )}
            <button type="button" className={styles.next} onClick={advance} ref={nextRef}>
              {last ? 'Begin' : 'Next'}
              <span className={styles.key} aria-hidden="true">
                ↵
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
