/**
 * Deed lines — the ledger's entire narrative payload.
 *
 * wiki/01 § 3 makes the ledger "the single most important UI element", and the
 * Deeds column is the only part of it that is prose. A run whose nine rows all
 * read `It is done.` has a ledger that says nothing, which is the same as not
 * having one.
 *
 * Every GAMBLE now narrates both of its branches: `successText`/`failureText`
 * are required on the `gamble` variant of `OfferOption`, so a bet always
 * reports itself in words its own author chose. This file no longer writes
 * outcome prose at all.
 *
 * It used to. Failure lines were assembled from the option label plus a tail
 * drawn from a four-entry pool by hash, and one of those four was `It does
 * not.` — an auxiliary with no main verb, bolted onto a clause it had no
 * relation to, producing "Have her intercepted. It does not." Generated prose
 * cannot refer to the offer it came from; that is not a tuning problem, so the
 * pools are gone rather than reworded.
 *
 * What remains is the fallback for a `certain` option with no `resultText`,
 * which resolves `deterministic` and reads as a plain echo of the decision
 * ("Pay for the pipes."). That is grammatical, it names the choice, and
 * authoring `resultText` for ~200 deterministic options is a content job this
 * file should not pre-empt.
 *
 * Rules this file exists to keep:
 *
 *   1. Authored text always wins. The engine never overrides an author.
 *   2. A line is derived from the option LABEL, which differs from era to era
 *      because the sampler excludes offers already seen. Two consecutive rows
 *      can therefore only match if the player genuinely repeated an action.
 *   3. It fits a table cell. `LedgerRow` clips with an ellipsis, but a column
 *      that is always clipped is a column nobody reads.
 */

import type { Offer, OfferOption, Outcome } from '../types';

/**
 * Budget for a synthesized line. `LedgerRow` clips at whatever the column is
 * wide, so this is about the line being *finishable*, not about pixels.
 * Authored lines are exempt — an author who writes a long one meant it.
 */
export const DEED_MAX_LENGTH = 46;

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
 * Build the line for a `certain` option that carries no `resultText`.
 *
 * Shape, in preference order:
 *   `The Herald — let him finish.`   (short label, room for both)
 *   `Correct three of the charges.`  (title dropped to fit)
 *
 * The offer title is a prefix rather than a replacement because the label
 * alone can be generic ("Accept", "Refuse") while the pair never is.
 */
export function synthesizeDeed(offer: Offer, option: OfferOption): string {
  const clause = firstClause(option.label) || 'Act';
  const title = stripEnd(offer.title.trim());
  const sentence = (head: string): string => `${upperFirst(head)}.`;

  // 1. Title-prefixed, if the label is short enough that the pair earns its
  //    keep and the whole thing still fits.
  if (title && clause.length <= 22) {
    const prefixed = sentence(`${title} — ${lowerFirst(clause)}`);
    if (prefixed.length <= DEED_MAX_LENGTH) return prefixed;
  }

  // 2. Label alone.
  const plain = sentence(clause);
  if (plain.length <= DEED_MAX_LENGTH) return plain;

  // 3. Trim the label to fit, on a word boundary.
  return sentence(truncate(clause, DEED_MAX_LENGTH - 1));
}

/**
 * The one entry point.
 *
 * A gamble always returns authored prose — the type requires both branches, so
 * `outcome` here only chooses which of the two the author wrote. Only a
 * `certain` option can reach the synthesizer, and only when it declined to
 * write a `resultText`.
 */
export function deedLineFor(offer: Offer, option: OfferOption, outcome: Outcome): string {
  if (option.kind === 'gamble') {
    return (outcome === 'success' ? option.successText : option.failureText).trim();
  }

  const trimmed = option.resultText?.trim();
  if (trimmed) return trimmed;

  return synthesizeDeed(offer, option);
}
