/**
 * Deed lines — the ledger's entire narrative payload.
 *
 * wiki/01 § 3 makes the ledger "the single most important UI element", and the
 * Deeds column is the only part of it that is prose. A run whose nine rows all
 * read `It is done.` has a ledger that says nothing, which is the same as not
 * having one.
 *
 * Only ~39 of ~280 authored options carry a `resultText`/`successText`/
 * `failureText`, and authoring the other 240 is a content job, not an engine
 * one. So the engine SYNTHESIZES a line from what actually happened — the
 * option the player picked, the offer it came from, and how it resolved.
 *
 * Rules this file exists to keep:
 *
 *   1. Authored text always wins. The engine never overrides an author.
 *   2. A line is derived from the option LABEL, which differs from era to era
 *      because the sampler excludes offers already seen. Two consecutive rows
 *      can therefore only match if the player genuinely repeated an action.
 *   3. Failure reads differently from success, and both read differently from
 *      a deterministic choice.
 *   4. It fits a table cell. `LedgerRow` clips with an ellipsis, but a column
 *      that is always clipped is a column nobody reads.
 */

import type { Offer, OfferOption, Outcome } from '../types';
import { hashString } from './rng';

/**
 * Budget for a synthesized line. `LedgerRow` clips at whatever the column is
 * wide, so this is about the line being *finishable*, not about pixels.
 * Authored lines are exempt — an author who writes a long one meant it.
 */
export const DEED_MAX_LENGTH = 46;

/**
 * Outcome tails. Small pools rather than one constant each, picked by a stable
 * hash of the offer so a given deed always narrates the same way — a repeated
 * action must produce a repeated line, per rule 2.
 */
const SUCCESS_TAILS = ['It holds.', 'It works.', 'It takes.', 'It lands.'];
const FAILURE_TAILS = ['It does not.', 'It does not hold.', 'It goes badly.', 'It fails.'];

function tailFor(outcome: Outcome, key: string): string {
  if (outcome === 'deterministic') return '';
  const pool = outcome === 'success' ? SUCCESS_TAILS : FAILURE_TAILS;
  return pool[hashString(key) % pool.length];
}

/** Trailing punctuation is re-applied by the caller; strip whatever is there. */
function stripEnd(s: string): string {
  return s.replace(/[\s.;:,!?—–-]+$/u, '');
}

/**
 * Reduce a label to its first clause.
 *
 * Labels are authored as imperatives and some carry a second sentence
 * ("Accept. Become the thing under the hill."). The first clause is the
 * decision; the rest is colour that the offer body already carried.
 */
function firstClause(label: string): string {
  const trimmed = label.trim();
  const cut = trimmed.search(/[.;:]|\s—\s|\s–\s/u);
  const head = cut > 0 ? trimmed.slice(0, cut) : trimmed;
  return stripEnd(head);
}

/** Cut on a word boundary, never mid-word, and never leaving a dangling comma. */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const window = s.slice(0, max - 1);
  const lastSpace = window.lastIndexOf(' ');
  return stripEnd(lastSpace > max * 0.5 ? window.slice(0, lastSpace) : window);
}

function lowerFirst(s: string): string {
  // Leave acronyms and proper nouns alone: only de-capitalize a word that is
  // otherwise lowercase, so "Yull" stays "Yull" but "Sign" becomes "sign".
  const [first = '', rest = ''] = [s.slice(0, 1), s.slice(1)];
  if (rest.length > 0 && rest === rest.toLowerCase()) return first.toLowerCase() + rest;
  return s;
}

function upperFirst(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

/**
 * Build the line for an option that carries no authored text.
 *
 * Shape, in preference order:
 *   `The Herald — let him finish. It holds.`   (short label, room for both)
 *   `Let him finish. It holds.`                (title dropped to fit)
 *   `Let him finish.`                          (deterministic, no tail)
 *
 * The offer title is a prefix rather than a replacement because the label
 * alone can be generic ("Accept", "Refuse") while the pair never is.
 */
export function synthesizeDeed(offer: Offer, option: OfferOption, outcome: Outcome): string {
  const clause = firstClause(option.label) || 'Act';
  const tail = tailFor(outcome, `${offer.id}|${option.label}`);
  const title = stripEnd(offer.title.trim());

  const withTail = (head: string): string => {
    const sentence = `${upperFirst(head)}.`;
    if (!tail) return sentence;
    return `${sentence} ${tail}`;
  };

  // 1. Title-prefixed, if the label is short enough that the pair earns its
  //    keep and the whole thing still fits.
  if (title && clause.length <= 22) {
    const prefixed = withTail(`${title} — ${lowerFirst(clause)}`);
    if (prefixed.length <= DEED_MAX_LENGTH) return prefixed;
  }

  // 2. Label alone with its outcome tail.
  const plain = withTail(clause);
  if (plain.length <= DEED_MAX_LENGTH) return plain;

  // 3. Trim the label until the tail fits — the outcome is the part a reader
  //    cannot reconstruct from the other ledger columns, so it is kept last.
  const room = DEED_MAX_LENGTH - (tail ? tail.length + 2 : 1);
  return withTail(truncate(clause, Math.max(12, room)));
}

/**
 * The one entry point. Authored text wins outright; everything else is
 * synthesized so that no two consecutive eras read the same unless the player
 * genuinely made the same choice twice.
 */
export function deedLineFor(offer: Offer, option: OfferOption, outcome: Outcome): string {
  const authored =
    option.kind === 'certain'
      ? option.resultText
      : outcome === 'success'
        ? option.successText
        : option.failureText;

  const trimmed = authored?.trim();
  if (trimmed) return trimmed;

  return synthesizeDeed(offer, option, outcome);
}
