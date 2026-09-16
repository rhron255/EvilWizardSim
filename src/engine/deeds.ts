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
 *   3. It reads as one complete, finishable line, never a mid-word fragment.
 *      No UI renders this text any more (issue #36 removed the ledger table
 *      this rule was originally written for), but every era still writes it
 *      to `deedSummary` — the value `scripts/simulate.ts` reads for its
 *      repetition signal — so the content still exists and still deserves to
 *      read cleanly, even with nothing on screen to show it.
 *   4. The offer title is not repeated back by the option label. "Sanctuary —
 *      take sanctuary." is one word doing two jobs; see `echoes`.
 */

import type { Offer, OfferOption, Outcome } from '../types';

/**
 * Budget for a SYNTHESIZED line only; authored lines are exempt — an author
 * who writes a long one meant it. This is no longer about fitting a table
 * cell — issue #36 removed the ledger UI (`LedgerRow` included) that this
 * comment used to justify the budget by. `deedSummary` still gets written
 * every era with no UI left to render it (CLAUDE.md's amendment to rule 2),
 * and `scripts/simulate.ts` still reads it for a repetition signal, so a
 * synthesized fallback line still deserves to read as one finished sentence
 * rather than a mid-word fragment, even though nothing on screen shows it.
 *
 * A playtest report of a mid-word clip in that now-removed ledger table ("The
 * ivy was the outer part. Th…") once prompted a proposal to extend this same
 * budget to authored prose too. MEASURED FIRST: 86.2% of the 196 authored
 * deed lines in the catalog are longer than 46 characters, median 72 —
 * truncating them would have abridged five deed lines in six, gutting rule
 * 2's "only prose in the ledger" to fix a table-cell presentation problem
 * that no longer exists. That measurement is why the exemption above stands:
 * changing this number needs a reason tied to the content itself, not a
 * layout complaint about a component this file no longer describes.
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

/**
 * Words too common to count as an echo. A title and a label that share only
 * "the" are not repeating themselves; one that shares "sanctuary" is.
 */
const ECHO_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'her',
  'his',
  'in',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'their',
  'them',
  'to',
  'with',
]);

/** Lowercase content words, singularised, so "relics" matches "relic". */
function contentWords(s: string): Set<string> {
  const out = new Set<string>();
  for (const raw of s.toLowerCase().match(/[a-z']+/gu) ?? []) {
    if (ECHO_STOP_WORDS.has(raw)) continue;
    out.add(raw.length > 3 && raw.endsWith('s') ? raw.slice(0, -1) : raw);
  }
  return out;
}

/**
 * Would `Title — label` stutter?
 *
 * The prefix earns its keep when the label is generic ("Accept", "Refuse") and
 * the title supplies what the label omits. When the label already contains the
 * title's own noun the pair says one thing twice — `Sanctuary` over
 * `Take sanctuary` produced "Sanctuary — take sanctuary.", which is the ledger
 * spending its only prose column on an echo.
 */
function echoes(title: string, clause: string): boolean {
  const titleWords = contentWords(title);
  if (titleWords.size === 0) return false;
  const clauseWords = contentWords(clause);
  for (const word of titleWords) {
    if (clauseWords.has(word)) return true;
  }
  return false;
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
  //    keep, the pair does not say the same word twice, and the whole thing
  //    still fits.
  if (title && clause.length <= 22 && !echoes(title, clause)) {
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
