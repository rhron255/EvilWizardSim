/**
 * Three cards, shown once unprompted before the first choice of a player's
 * first career, and replayable on demand afterwards from the title screen's
 * Tutorial door (issue #37) — the same component either way, mounted over
 * whatever screen asked for it.
 *
 * Requested as a tutorial. The constraint that shapes it is that a whole run is
 * two to four minutes — a minute of instruction costs a third of the
 * experience — so this teaches only what the run screen cannot teach by
 * existing, and on its first, unprompted showing it opens ON the run screen,
 * with the masthead, the faction standings and the empty offer slot visible
 * behind it as a modal scrim.
 *
 * Two things are deliberately NOT here:
 *
 *   - The prophecy. It is the pivot the whole arc turns on and it is staged as
 *     a reveal; explaining it in advance spends the set piece to save the
 *     player ten seconds of surprise. wiki/04's "do not add a doom meter" says
 *     the same thing from the other end — the decline is not announced, and a
 *     tutorial card announcing it is still announcing it. This holds on a
 *     replay too: a returning player asking to see the guide again has not
 *     asked to be told what happens next.
 *   - Anything the decision content already says on its own. Every stat prints
 *     its own threshold (see `stakes.ts`), so the third card points at that
 *     mechanism rather than restating five numbers the player is about to
 *     read anyway.
 *
 * Identity capture already happened on the creation screen, which is reference
 * principle 1: the player has a name before a single mechanic is explained.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import styles from './FirstRunGuide.module.css';

export type FirstRunGuideProps = {
  /**
   * Called once, on finish or skip. On a first-ever showing this also marks
   * the guide seen; on a replay `tutorialSeen` is already true, so the caller
   * decides what dismissing means (`useGame`'s `dismissFirstRunGuide` for the
   * gated showing, `backToTitle` for a replay opened from the title door).
   */
  onDismiss(): void;
};

type Card = { eyebrow: string; title: string; body: string };

const CARDS: Card[] = [
  {
    eyebrow: 'The loop',
    title: 'One era at a time',
    body: 'Every era, you pick one card. A gamble always prints its odds and both outcomes before you commit, so the worst it can do is written on it before you say yes. Some things also move on their own between eras — this is always shown as part of the transition.',
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
    body: 'Six factions, each with different goals, ideals and rivals. Favor one and face the wrath of its enemies. Sink far enough with any of them, once your name is big enough to matter, and they deal with you permanently, each in their own way.',
  },
  {
    eyebrow: 'The numbers',
    title: 'Each one says what it does',
    body: 'Followers, relics, apprentices, loyalty, pact debt. Any of them that can end a career shows its threshold and how far you are from it, right on the header. Tap a stat for what it does.',
  },
];

export function FirstRunGuide({ onDismiss }: FirstRunGuideProps) {
  const [index, setIndex] = useState(0);
  const headingId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);

  const first = index === 0;
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

  // Issue #37: a player who taps Next past something they wanted to reread
  // had no way back except Skip, which throws away the rest of the guide
  // too. Back never dismisses — it is a no-op on the first card rather than
  // wrapping, so it cannot be mistaken for Skip.
  const back = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

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
        // A focused button already answers Enter/Space with its own onClick —
        // stepping in here too would override Back or Skip with advance()
        // the moment either one has focus, which is worse than doing nothing
        // (the codex review on issue #37 caught this on the new Back button).
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        advance();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        back();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, back, onDismiss]);

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
            {!first && (
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
            )}
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
