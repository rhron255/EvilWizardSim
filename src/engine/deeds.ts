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
 *   3. It reads as one complete, finishable line, never a mid-word fragment
 *      and never one that stops on a word promising another ("…in front of
 *      the."); see `truncateClause`. The same string still renders once, on the resolution card the player
 *      sees right after the choice (`resolveChoice` assigns it to both
 *      `resolution.text`, which `ResolutionOverlay` prints, and
 *      `eraRecord.deedSummary`). What issue #36 removed is only the
 *      persistent, append-only ledger TABLE that used to re-display every
 *      era's line together afterward — `deedSummary` now has no UI that
 *      revisits it once its era has passed, but `scripts/simulate.ts` still
 *      reads it for its repetition signal, so it still deserves to read
 *      cleanly even though nothing lets a player scroll back through it.
 *   4. The offer title is not repeated back by the option label. "Sanctuary —
 *      take sanctuary." is one word doing two jobs; see `echoes`.
 */

import type { Offer, OfferOption, Outcome } from '../types';

/**
 * Budget for a SYNTHESIZED line only; authored lines are exempt — an author
 * who writes a long one meant it. This is no longer about fitting a table
 * cell — issue #36 removed the ledger UI (`LedgerRow` included) that this
 * comment used to justify the budget by. The same line still renders once,
 * on the resolution card right after the choice (see rule 3 above), and it
 * is also written every era to `deedSummary`, which now has no UI left to
 * revisit it once its era has passed (CLAUDE.md's amendment to rule 2) but
 * which `scripts/simulate.ts` still reads for a repetition signal. Either
 * way — seen once on the card, or read back only by the harness — a
 * synthesized fallback line still deserves to read as one finished sentence
 * rather than a mid-word fragment.
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

/**
 * Words that open a phrase and cannot close one.
 *
 * A cut line that ends on one of these reads as a sentence that stopped
 * talking: the resolution card printed "Mark one of them very low, in front of
 * the." for the label "Mark one of them very low, in front of the others",
 * because the old cut stopped at the last space that fit and went no further.
 * Articles, possessive and other determiners, conjunctions and prepositions
 * all promise a word that the cut then removes.
 *
 * Deliberately LEFT OUT are the prepositions that double as the particle of a
 * phrasal verb and so end clauses all the time — up, out, off, down, over,
 * away, back, around, along, through, near, past. Stripping those would turn
 * "Hand it over" into "Hand it". `in`, `on` and `by` can be particles too
 * ("let him in"), but a cut that lands on one is far more often mid-way into
 * "in front of", "on the", "by the", so they stay. Modals are left out too —
 * "pay what you can" is finished — and so are object pronouns (`it`, `them`,
 * `him`): "Cure it" is a finished line.
 */
const DANGLING_WORDS = new Set([
  // articles
  'a', 'an', 'the',
  // possessive determiners
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose',
  // other determiners that need the noun after them
  'this', 'that', 'these', 'those', 'each', 'every', 'another', 'some', 'any', 'no', 'such',
  // coordinating conjunctions, and the "then" of "pay, then leave"
  'and', 'or', 'but', 'nor', 'yet', 'so', 'then',
  // subordinators and relatives
  'if', 'because', 'although', 'though', 'unless', 'whether', 'while', 'whilst', 'until',
  'till', 'where', 'wherever', 'when', 'whenever', 'which', 'who', 'whom', 'what', 'how',
  'why', 'whoever', 'whatever', 'whichever', 'lest', 'since', 'as', 'than',
  // prepositions that do not end a clause as a particle
  'of', 'to', 'for', 'with', 'from', 'into', 'onto', 'upon', 'unto', 'at', 'in', 'on', 'by',
  'about', 'above', 'across', 'after', 'against', 'among', 'amongst', 'before', 'behind',
  'below', 'beneath', 'beside', 'between', 'beyond', 'despite', 'during', 'except',
  'toward', 'towards', 'under', 'via', 'per', 'within', 'without',
  // a modifier waiting for its word: "very low", "rather than", "and never"
  'very', 'quite', 'rather', 'never', 'not',
  // the copula, which promises its complement: "time to be", "who is"
  'be', 'is', 'are', 'am', 'was', 'were', 'been', 'being',
]);

/**
 * The subset of `DANGLING_WORDS` that opens a whole clause rather than a
 * phrase. A cut inside such a clause can end on a noun and still be missing
 * its verb — "Read the exclusions aloud until the terms." — so a cut line
 * gives the clause back whole rather than keep half of it. `that` is NOT here:
 * mid-line it is a determiner ("burn that tower") as often as a subordinator.
 */
const CLAUSE_OPENERS = new Set([
  'if', 'because', 'although', 'though', 'unless', 'whether', 'while', 'whilst', 'until',
  'till', 'where', 'wherever', 'when', 'whenever', 'which', 'who', 'whom', 'whose', 'what',
  'how', 'why', 'whoever', 'whatever', 'whichever', 'lest',
]);

/**
 * The word as the lists above spell it: lowercase, without its punctuation —
 * except an apostrophe, straight or curly, which is how a possessive noun
 * ("the grounds’") is told apart.
 */
function bare(word: string): string {
  return word.toLowerCase().replace(/^[^a-z'’]+|[^a-z'’]+$/gu, '');
}

/** Can a cut line end on this word? A possessive noun cannot: "the king's." */
function dangles(word: string): boolean {
  const w = bare(word);
  return w === '' || DANGLING_WORDS.has(w) || /['’]s$|s['’]$/u.test(w);
}

/** Pop every trailing word that cannot end a line. */
function dropDangling(words: string[]): string[] {
  let end = words.length;
  while (end > 0 && dangles(words[end - 1])) end--;
  return words.slice(0, end);
}

/** The line a run of words makes, its trailing punctuation removed. */
function join(words: string[]): string {
  return stripEnd(words.join(' '));
}

/**
 * Cut a clause to `max` characters on a word boundary, ending on a word that
 * can end a line.
 *
 * The label always continued past the cut, so whatever phrase the cut lands
 * in is unfinished. In preference order:
 *
 *   1. Back to the last comma that fits, when that keeps at least half the
 *      budget — the comma is where the label's own author ended a phrase.
 *      "Mark one of them very low, in front of the…" → "Mark one of them very
 *      low".
 *   2. Otherwise the longest run of words that fits, minus any trailing word
 *      that promises another (`DANGLING_WORDS`); and if what is left is half a
 *      clause that a `CLAUSE_OPENERS` word began, the clause goes too —
 *      "…aloud until the terms" → "…aloud".
 *   3. Never one word or nothing. If no line of two words or more that ends on
 *      a word that can end one fits the budget — a cut that lands right after
 *      "Go to the" — the shortest one that does is returned instead, a word or
 *      two over. The budget is for keeping a synthesized line short; a stub
 *      would keep it short by saying nothing.
 *
 * Returned without its trailing punctuation; the caller adds the full stop.
 * Exported for the property tests, which sweep every catalog label through it
 * at every budget.
 */
export function truncateClause(s: string, max: number): string {
  const text = s.trim();
  if (text.length <= max) return text;

  const words = text.split(/\s+/u);
  let fit = 0;
  let length = -1;
  while (fit < words.length && length + 1 + words[fit].length <= max) {
    length += 1 + words[fit].length;
    fit++;
  }
  const head = words.slice(0, fit);

  // 1. The author's own phrase boundary.
  for (let i = head.length - 1; i >= 1; i--) {
    if (!head[i].endsWith(',')) continue;
    const phrase = dropDangling(head.slice(0, i + 1));
    if (phrase.length >= 2 && join(phrase).length >= max * 0.5) return join(phrase);
    break;
  }

  // 2. The longest run that ends on a word that can end a line…
  const kept = dropDangling(head);
  if (kept.length >= 2) {
    // …without half a clause on the end of it.
    for (let i = kept.length - 1; i >= 1; i--) {
      if (!CLAUSE_OPENERS.has(bare(kept[i]))) continue;
      const before = dropDangling(kept.slice(0, i));
      if (before.length >= 2) return join(before);
      break;
    }
    return join(kept);
  }

  // 3. Over budget by the fewest words, rather than a stub.
  for (let n = 2; n <= words.length; n++) {
    if (!dangles(words[n - 1])) return join(words.slice(0, n));
  }
  return stripEnd(text);
}

/**
 * Words too common to count as an echo. A title and a label that share only
 * "the" are not repeating themselves; one that shares "sanctuary" is.
 *
 * Not `DANGLING_WORDS`: this list has a different job. It also holds the
 * object pronouns a line may well end on ("it", "them"), and it predates that
 * list — widening it would change which titles count as echoes, a separate
 * decision from where a cut may end.
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

  // 3. Trim the label to fit, on a word boundary, ending on a word that can
  //    end a line. One character of the budget is the full stop.
  return sentence(truncateClause(clause, DEED_MAX_LENGTH - 1));
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
