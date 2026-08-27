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
import { DEED_MAX_LENGTH, deedLineFor, synthesizeDeed } from './deeds';

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
    const offer: Offer = {
      id: 'test_certain',
      title: 'The Herald',
      body: 'b',
      phase: 'any',
      options: [],
    };
    const option: OfferOption = { kind: 'certain', label: 'Let him finish', effects: [] };

    const line = deedLineFor(offer, option, 'deterministic');
    expect(line).toBe('The Herald — let him finish.');
    expect(line.length).toBeLessThanOrEqual(DEED_MAX_LENGTH);
  });

  it('prefers an authored resultText over the synthesized echo', () => {
    const offer: Offer = { id: 'o', title: 'T', body: 'b', phase: 'any', options: [] };
    const option: OfferOption = {
      kind: 'certain',
      label: 'Pay for the pipes',
      effects: [],
      resultText: 'The plumber was right about the pipes.',
    };

    expect(deedLineFor(offer, option, 'deterministic')).toBe(
      'The plumber was right about the pipes.',
    );
  });
});

describe('synthesizeDeed', () => {
  const offer = (title: string): Offer => ({
    id: 'o',
    title,
    body: 'b',
    phase: 'any',
    options: [],
  });
  const certain = (label: string): OfferOption => ({ kind: 'certain', label, effects: [] });

  it('drops the title prefix when the pair would not fit', () => {
    const line = synthesizeDeed(
      offer('A Rumour From The Capital'),
      certain('Note it and continue'),
    );
    expect(line).toBe('Note it and continue.');
  });

  it('keeps a long label inside the cell budget, on a word boundary', () => {
    const line = synthesizeDeed(
      offer('Indemnity'),
      certain('Read the exclusions aloud until the terms improve'),
    );
    expect(line.length).toBeLessThanOrEqual(DEED_MAX_LENGTH);
    expect(line).toMatch(/\.$/);
    expect(line).not.toMatch(/\w-\.$/); // never cut mid-word
  });

  it('uses only the first clause of a two-sentence label', () => {
    // "Accept" is short enough to earn the title prefix, which is the point of
    // the prefix: the label alone would be generic, the pair never is.
    const line = synthesizeDeed(
      offer('The Long Arrangement'),
      certain('Accept. Become the thing under the hill.'),
    );
    expect(line).toBe('The Long Arrangement — accept.');
    expect(line).not.toContain('under the hill');
  });
});
