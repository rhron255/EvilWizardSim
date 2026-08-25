/**
 * The things that happen to a wizard between choices.
 *
 * The era-end systems move numbers the player did not touch — pact interest,
 * apprentice loyalty drift, the hero closing in — and the resolution card
 * reports them under *While you were elsewhere*, deliberately separated from
 * the option's own consequences so the era is never blamed on the card.
 *
 * What that section lacked was any sense that a WORLD was doing these things.
 * `+1 Pact Debt · the Covenant's interest · 4 / 7` is a correct disclosure and
 * a flat one: nobody arrives, nothing is seen, the number simply grows. The
 * Covenant is a fixed recurring faction (wiki/06 § the recurring cast) and
 * collecting is the one thing it visibly does, so this is where it does it.
 *
 * The disclosure is NOT replaced. The number, the running total and the ceiling
 * still print beside these lines — the visit is added around them.
 *
 * Register per wiki/02: the comedy lives here, in the bureaucracy of being
 * collected from. The numbers stay straight-faced.
 */

/**
 * A Covenant collection visit. Picked by a stable hash so a given era in a
 * given run always narrates the same way — the same rule `deeds.ts` follows for
 * its outcome tails, and for the same reason: a line that changes when you look
 * at it twice reads as a bug.
 */
const COVENANT_VISITS = [
  'A clerk came on Tuesday, updated the ledger, and declined refreshment.',
  'Someone from the Covenant read the total aloud at your gate. Twice, for the record.',
  'A revised schedule of what you owe arrived, bound, with your name tooled into it.',
  'The Covenant sent a boy with an abacus. He did not need the abacus.',
  'Interest was applied in your absence and a receipt left where you would find it.',
  'A Covenant assessor toured the premises and wrote down more than she said.',
  'The ledger was brought up to date. You were not consulted, and it balances.',
] as const;

/** The visit at the moment the debt comes due, when nobody is filing anything. */
const COVENANT_FINAL = 'The visits stop here. The Covenant has finished counting.';

export function covenantVisitFor(debt: number, atLimit: boolean, key: number): string {
  if (atLimit) return COVENANT_FINAL;
  return COVENANT_VISITS[Math.abs((key | 0) * 31 + debt) % COVENANT_VISITS.length];
}
