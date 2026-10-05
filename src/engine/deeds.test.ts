/**
 * The ledger's Deeds column must say something, and it must say something
 * about the offer it came from.
 *
 * It did not. Unauthored gambles had their outcome written by a four-entry
 * tail pool picked by hash, one entry of which was `It does not.` — an
 * auxiliary with no main verb, appended to a label it had no relation to:
 *
 *     "Have her intercepted. It does not."
 *
 * The fix was to require `successText`/`failureText` on every gamble and
 * delete the generator. These tests are anchored to `src/content`, not to
 * `deeds.ts` — the expected strings come from the catalog, which the code
 * under test does not supply. An assertion sourced from `deedLineFor`'s own
 * output would go green against any generator at all (failure mode 11).
 */
import { describe, expect, it } from 'vitest';
import { offers } from '../content';
import type { Offer, OfferOption } from '../types';
import { DEED_MAX_LENGTH, deedLineFor, synthesizeDeed, truncateClause } from './deeds';

/**
 * A real catalog offer and one of its options, by id and exact label. These
 * tests pin how specific catalog strings render, so they name them; if a
 * content edit rewords one, this throws and the expected line gets updated.
 */
function real(offerId: string, label: string): [Offer, OfferOption] {
  const offer = offers.find((o) => o.id === offerId);
  const option = offer?.options.find((o) => o.label === label);
  if (!offer || !option) throw new Error(`catalog no longer has "${offerId}" / "${label}"`);
  return [offer, option];
}

/** Every gamble in the shipped catalog, with the offer it belongs to. */
const gambles: [Offer, Extract<OfferOption, { kind: 'gamble' }>][] = offers.flatMap((offer) =>
  offer.options
    .filter((o): o is Extract<OfferOption, { kind: 'gamble' }> => o.kind === 'gamble')
    .map((option) => [offer, option] as [Offer, Extract<OfferOption, { kind: 'gamble' }>]),
);

describe('deedLineFor', () => {
  it('has gambles to check', () => {
    // Guards the two tests below against silently iterating an empty list if
    // the catalog barrel ever stops exporting offers.
    expect(gambles.length).toBeGreaterThan(50);
  });

  it('returns the authored branch verbatim for every gamble in the catalog', () => {
    for (const [offer, option] of gambles) {
      expect(deedLineFor(offer, option, 'success')).toBe(option.successText.trim());
      expect(deedLineFor(offer, option, 'failure')).toBe(option.failureText.trim());
    }
  });

  it('never narrates a gamble with a generated tail', () => {
    // The exact shapes the deleted pools produced. `It does not.` is the one
    // that was reported; the rest are its siblings and would read the same way.
    const generated = /^It (does not|does not hold|goes badly|fails|holds|works|takes|lands)\.$/;

    for (const [offer, option] of gambles) {
      for (const outcome of ['success', 'failure'] as const) {
        const line = deedLineFor(offer, option, outcome);
        expect(line).not.toBe('');
        // A synthesized line was `<clause>. <tail>`; nothing may end in one.
        const tail = line.slice(line.lastIndexOf('. ') + 2);
        expect(tail).not.toMatch(generated);
      }
    }
  });

  it('still echoes the label for a certain option with no resultText', () => {
    const [offer, option] = real('decline_the_herald', 'Let him finish');
    expect(option.kind === 'certain' && option.resultText).toBeFalsy();

    const line = deedLineFor(offer, option, 'deterministic');
    expect(line).toBe('The Herald — let him finish.');
    expect(line.length).toBeLessThanOrEqual(DEED_MAX_LENGTH);
  });

  it('prefers an authored resultText over the synthesized echo', () => {
    const offer = offers.find((o) => o.options.some((opt) => opt.kind === 'certain' && opt.resultText))!;
    const option = offer.options.find((opt) => opt.kind === 'certain' && opt.resultText)!;
    if (option.kind !== 'certain') throw new Error('unreachable');

    expect(deedLineFor(offer, option, 'deterministic')).toBe(option.resultText!.trim());
  });
});

describe('synthesizeDeed', () => {
  it('drops the title prefix when the pair would not fit', () => {
    const line = synthesizeDeed(...real('ascent_rumour_from_the_capital', 'Note it and continue'));
    expect(line).toBe('Note it and continue.');
  });

  it('keeps a long label inside the cell budget, on a word boundary', () => {
    const line = synthesizeDeed(
      ...real('ascent_gilded_indemnity', 'Read the exclusions aloud until the terms improve'),
    );
    expect(line.length).toBeLessThanOrEqual(DEED_MAX_LENGTH);
    expect(line).toMatch(/\.$/);
    expect(line).not.toMatch(/\w-\.$/); // never cut mid-word
  });

  it('drops the title prefix when the label already says the title', () => {
    // Title "Sanctuary", label "Take sanctuary". The pair rendered as
    // "Sanctuary — take sanctuary.", one word doing two jobs in the ledger's
    // only prose column.
    const line = synthesizeDeed(...real('decline_sanctuary', 'Take sanctuary'));
    expect(line).toBe('Take sanctuary.');
  });

  it('matches an echo across singular and plural', () => {
    // Hand-built: the catalog's only singular/plural echo ("The Notice" /
    // "Have the notices posted more widely") is too long to keep its prefix
    // anyway, so it would pass with the echo rule deleted. This pair fits,
    // so only the echo rule can drop the prefix.
    const offer: Offer = { id: 'plural_echo', title: 'The Relics', body: '', phase: 'any', options: [] };
    const option: OfferOption = { kind: 'certain', label: 'Bury the relic', effects: [] };
    expect(synthesizeDeed(offer, option)).toBe('Bury the relic.');
  });

  it('still prefixes when the title and label share only stop words', () => {
    // The guard must not fire on "the" — that would delete the prefix from
    // most of the catalog, which is the opposite failure.
    const line = synthesizeDeed(...real('ascent_crownlands_warrant', 'Pay the clerk'));
    expect(line).toBe('The Warrant — pay the clerk.');
  });

  it('uses only the first clause of a two-sentence label', () => {
    // "Accept" is short enough to earn the title prefix, which is the point of
    // the prefix: the label alone would be generic, the pair never is.
    const line = synthesizeDeed(
      ...real('scripted_the_long_arrangement', 'Accept. The decline still has to be survived.'),
    );
    expect(line).toBe('The Long Arrangement — accept.');
    expect(line).not.toContain('survived');
  });
});

/**
 * Words a cut line may not end on, written out HERE rather than imported from
 * `deeds.ts`: a test that read the code's own list would pass whatever that
 * list said (failure mode 11). These are the four kinds the resolution card
 * showed hanging off a cut — articles, prepositions, conjunctions and
 * possessives — and nothing the code is free to treat differently.
 */
const FUNCTION_WORDS = new Set([
  // articles
  'a', 'an', 'the',
  // possessives
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose',
  // conjunctions
  'and', 'or', 'but', 'nor', 'yet', 'so', 'then', 'if', 'because', 'although', 'though',
  'unless', 'whether', 'while', 'until', 'when', 'where', 'as', 'than',
  // prepositions
  'of', 'to', 'for', 'with', 'from', 'into', 'onto', 'upon', 'at', 'in', 'on', 'by',
  'about', 'against', 'among', 'before', 'after', 'between', 'during', 'despite',
  'toward', 'towards', 'via', 'within', 'without',
]);

/** Lowercase, punctuation off both ends; the apostrophe stays. */
const bareWord = (w: string) => w.toLowerCase().replace(/^[^a-z'’]+|[^a-z'’]+$/g, '');

/** Does this word leave the line waiting for another? "The king's." does too. */
const endsOpen = (word: string) =>
  FUNCTION_WORDS.has(bareWord(word)) || /['’]s$|s['’]$/.test(bareWord(word));

const wordsOf = (s: string) => s.trim().split(/\s+/);

/**
 * The shape every cut line must have, checked against the label it came from:
 * the first words of that label, in order, at least two of them, and the last
 * one able to end a sentence.
 */
function expectCleanCut(cut: string, clause: string): void {
  const got = wordsOf(cut);
  const source = wordsOf(clause);
  expect(got.length, `"${cut}" is a stub of "${clause}"`).toBeGreaterThanOrEqual(2);
  // Only the last word may have lost its punctuation ("low," → "low").
  got.forEach((word, i) => {
    const expected = i === got.length - 1 ? source[i].replace(/[,;:.!?]+$/, '') : source[i];
    expect(word, `"${cut}" is not a word-for-word cut of "${clause}"`).toBe(expected);
  });
  expect(endsOpen(got[got.length - 1]), `"${cut}" ends on a word that promises another`).toBe(
    false,
  );
}

/**
 * Every option label in the shipped catalog, reduced to the first clause the
 * synthesizer works from — split here on the same boundaries the label's
 * author used (a full stop, semicolon, colon or spaced dash), not by calling
 * the code under test.
 */
const clauses: string[] = [
  ...new Set(
    offers.flatMap((offer) =>
      offer.options.map((option) =>
        option.label
          .trim()
          .split(/[.;:]|\s[—–]\s/)[0]
          .trim()
          .replace(/[\s,!?—–-]+$/, ''),
      ),
    ),
  ),
];

describe('a cut line ends on a word that can end it', () => {
  it('cuts the reported label at its own comma, not mid-way into "in front of the"', () => {
    // The resolution card printed "Mark one of them very low, in front of
    // the." — the old cut stopped at the last space that fit and went no
    // further. The comma is where the label's author ended the phrase.
    const [offer, option] = real(
      'any_annual_review',
      'Mark one of them very low, in front of the others',
    );
    expect(option.kind === 'certain' && option.resultText).toBeFalsy();

    const line = deedLineFor(offer, option, 'deterministic');
    expect(line).toBe('Mark one of them very low.');
  });

  it('gives back a half-finished clause rather than end on its noun', () => {
    // "until the terms" ends on a noun and is still missing its verb.
    const line = synthesizeDeed(
      ...real('ascent_gilded_indemnity', 'Read the exclusions aloud until the terms improve'),
    );
    expect(line).toBe('Read the exclusions aloud.');
  });

  it('has catalog labels long enough to be cut', () => {
    // Guards the sweep below against passing because nothing reached the cut.
    const cut = clauses.filter((c) => `${c}.`.length > DEED_MAX_LENGTH);
    expect(cut.length).toBeGreaterThanOrEqual(3);
  });

  it('never ends a synthesized line on a function word, for any label in the catalog', () => {
    // Every label, as if its author had written no resultText — so the sweep
    // covers gamble labels and authored ones too, not only the handful of
    // unauthored certain options long enough to be cut today.
    let cuts = 0;
    for (const offer of offers) {
      for (const option of offer.options) {
        const bare: OfferOption = { kind: 'certain', label: option.label, effects: [] };
        const line = synthesizeDeed(offer, bare);
        expect(line.length, line).toBeLessThanOrEqual(DEED_MAX_LENGTH);
        expect(line).toMatch(/[^.]\.$/);

        const clause = option.label
          .trim()
          .split(/[.;:]|\s[—–]\s/)[0]
          .trim()
          .replace(/[\s,!?—–-]+$/, '');
        if (`${clause}.`.length <= DEED_MAX_LENGTH) continue;
        cuts++;
        expectCleanCut(line.slice(0, -1), clause);
      }
    }
    expect(cuts).toBeGreaterThanOrEqual(3);
  });

  it('cuts every catalog label cleanly at every budget, not only the one that ships', () => {
    // `DEED_MAX_LENGTH` will move one day, and a cut that is only clean at 46
    // is clean by luck. At every budget from 12 to 60 this is several thousand
    // cuts across the whole catalog's phrasing.
    let cuts = 0;
    for (let budget = 12; budget <= 60; budget++) {
      for (const clause of clauses) {
        if (clause.length <= budget || wordsOf(clause).length < 3) continue;
        const cut = truncateClause(clause, budget);
        cuts++;
        expectCleanCut(cut, clause);
        // Over budget is the stub fallback, for budgets so tight that every
        // run of words that fits ends on "the" or "to". From two-thirds of the
        // live budget up, no label in the catalog needs it.
        if (budget >= 30) expect(cut.length, `"${cut}" at ${budget}`).toBeLessThanOrEqual(budget);
      }
    }
    expect(cuts).toBeGreaterThan(2000);
  });

  it('runs a word or two over rather than leave a one-word stub', () => {
    // Every run of words that fits ends on a function word: "Go", "Go to",
    // "Go to the". The shortest line that does not is a word over budget.
    expect(truncateClause('Go to the market at dawn', 8)).toBe('Go to the market');
    expect(truncateClause('Have her escorted from the valley', 14)).toBe('Have her escorted');
  });
});
