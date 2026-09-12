import type { Offer } from '../../types';

/**
 * THE PACT LADDER — the pressure that replaced the interest tick.
 *
 * Pact debt used to grow `+1` on its own every decline era. It killed 29.4% of
 * all careers on a clock the player could not stop, and it was this repo's
 * single richest source of disclosure bugs: a wizard shown one era of headroom
 * that did not exist, and a death arriving on a card that mentioned nothing
 * capable of causing it.
 *
 * The clock is gone. Debt now moves ONLY on a card the player accepted, and the
 * pressure lives here instead: `pactWeight` in `src/engine/offers.ts` leans the
 * draw toward the Covenant as the balance climbs, so a wizard deep in debt keeps
 * meeting it. Nothing is hidden — every point is printed on a card before it is
 * taken — but the world stops leaving you alone.
 *
 * ## The ladder is the disclosure
 *
 * There is no UI clause announcing that the Covenant calls more often. That was
 * a deliberate choice: the escalation is disclosed in FICTION, by laddering
 * these cards on `minPactDebt` so the register tracks the balance. A clerk who
 * declines refreshment at 1. An assessor who writes down more than she says at
 * 3. Something already sitting in the chair it brought for you at 5. A player
 * should be able to feel the total rising without a number telling them.
 *
 * (The lines these are written against were `COVENANT_VISITS` in
 * `src/content/systemic.ts`, which narrated the old tick. That module had no
 * caller once the tick went; its register moved here rather than being deleted,
 * because it was the one part of the tick worth keeping.)
 *
 * ## Three shapes, and why each exists
 *
 * **Temptations** buy something real for debt. They have to be genuinely
 * attractive or nobody signs and the ending stops existing — but every one of
 * them keeps an option that adds nothing, because a forced pact is the same
 * defect as a forced gamble.
 *
 * **Exits** are `certain` and gate low. A debt you cannot act against is the
 * tick wearing a different hat, and before this file the catalog had exactly
 * three ways to pay anything down, all of them deep in the decline.
 *
 * **Two-way gambles** move debt in both directions off one roll: down on
 * success, up on failure. This is the shape the ending now arrives through.
 * A rational wizard never walks into the ceiling on a certain card — the number
 * is on the header and the cost is on the option — so `consumed_by_pact` is
 * reached by taking a good bet and losing it, which is exactly the note
 * wiki/01 § 7 puts against it: "High-variance play punished."
 *
 * Register per wiki/02: the comedy is in the bureaucracy, the numbers stay
 * straight-faced.
 */

export const pactOffers: Offer[] = [
  // -------------------------------------------------------------------------
  // TEMPTATIONS
  // -------------------------------------------------------------------------
  {
    id: 'pact_first_signature',
    title: 'A Modest Instrument',
    body: 'The Covenant proposes something small: two pages, one signature, and a clause about "consideration in kind" that is explained to you at length and remains, afterwards, unexplained.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Sign the modest instrument',
        effects: [
          { t: 'pactDebt', v: 1 },
          { t: 'notoriety', v: 9 },
          { t: 'standing', factionId: 'ashen_covenant', v: 12 },
        ],
        resultText: 'A witness you did not invite countersigns and leaves without using the door.',
      },
      {
        kind: 'certain',
        label: 'Ask to read it at home',
        effects: [{ t: 'standing', factionId: 'ashen_covenant', v: -4 }],
        resultText: 'They agree, warmly, and take the pages with them.',
      },
    ],
  },
  {
    id: 'pact_the_retainer',
    title: 'A Clerk on Retainer',
    body: 'Because you have an account now, you are entitled to a clerk. He arrives on a Tuesday, updates the ledger, declines refreshment, and asks where he should sit.',
    phase: 'any',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 1 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Give him the east room',
        effects: [
          { t: 'pactDebt', v: 1 },
          { t: 'followers', v: 30 },
          { t: 'notoriety', v: 5 },
        ],
        resultText: 'He files everything. Thirty people arrive to be filed.',
      },
      {
        kind: 'certain',
        label: 'Give him nothing and watch him',
        effects: [{ t: 'standing', factionId: 'ashen_covenant', v: -6 }],
        resultText: 'He works standing up for a year and reports on the acoustics.',
      },
    ],
  },
  {
    id: 'pact_second_ledger',
    title: 'The Second Ledger',
    body: 'A Covenant assessor tours the premises and writes down more than she says. At the end she produces a second ledger, in which your holdings are listed as collateral, and offers to lend against it.',
    phase: 'any',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 2 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Borrow against the tower',
        effects: [
          { t: 'pactDebt', v: 2 },
          { t: 'artifactFrom', factionId: 'ashen_covenant', rarity: 'rare' },
          { t: 'notoriety', v: 6 },
        ],
        resultText: 'The loan arrives in a box. The box is older than the loan.',
      },
      {
        kind: 'certain',
        label: 'Decline the facility',
        effects: [{ t: 'standing', factionId: 'ashen_covenant', v: -5 }],
        resultText: 'She closes the second ledger without closing the first.',
      },
    ],
  },
  {
    id: 'pact_the_deep_well',
    title: 'What the Well Wants',
    body: 'The Worm Below has been listening to your arrangements with interest and some professional envy. It proposes a refinancing: your debt moves underground, where the rates are worse and the enforcement is geological.',
    phase: 'decline',
    factionId: 'worm_below',
    requires: [{ c: 'minPactDebt', v: 3 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Move the debt underground',
        effects: [
          { t: 'pactDebt', v: 2 },
          { t: 'notoriety', v: 16 },
          { t: 'standing', factionId: 'worm_below', v: 20 },
        ],
        resultText: 'Something enormous assumes your obligations and adds a few of its own.',
      },
      {
        kind: 'gamble',
        label: 'Let it name its own rate',
        odds: 0.78,
        onSuccess: [
          { t: 'notoriety', v: 22 },
          { t: 'standing', factionId: 'worm_below', v: 25 },
        ],
        onFailure: [{ t: 'pactDebt', v: 2 }],
        successText: 'It names a rate so low you suspect a joke, and it is not a joke.',
        failureText: 'It names a rate. The rate is measured in something other than money.',
      },
      {
        kind: 'certain',
        label: 'Keep your creditors above ground',
        effects: [{ t: 'standing', factionId: 'worm_below', v: -8 }],
        resultText: 'The floor is cold for a season and then forgets about you.',
      },
    ],
  },
  {
    id: 'pact_the_chair',
    title: 'The Chair It Brought',
    body: 'It is in the solar when you come down. It has brought a chair for you and is not using one itself. On the table is a revised schedule of what you owe, bound, with your name tooled into the cover.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 5 }],
    weight: 4,
    options: [
      {
        kind: 'certain',
        label: 'Sit down and hear the schedule',
        effects: [
          { t: 'pactDebt', v: 1 },
          { t: 'notoriety', v: 20 },
          { t: 'standing', factionId: 'ashen_covenant', v: 15 },
        ],
        resultText: 'You are read to for six hours. By the end the kingdom has heard your name in a new tone.',
      },
      {
        /**
         * A crossing risk, priced to be TAKEN.
         *
         * Any gamble whose failure branch reaches the ceiling is a gamble a
         * careful player refuses unless the odds are generous — a 25% chance of
         * ending the run needs a prize nothing in this game pays. So the odds
         * here are deliberately good. That is not a softening: it is what makes
         * the bet a real decision instead of a trap, and one career in six it
         * is the last decision that career contains.
         */
        kind: 'gamble',
        label: 'Argue the schedule line by line',
        odds: 0.82,
        onSuccess: [
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'ashen_covenant', v: 8 },
        ],
        onFailure: [{ t: 'pactDebt', v: 2 }],
        successText: 'Four entries do not survive your attention. It amends them without expression.',
        failureText: 'Two entries you had not noticed survive yours, and are added in front of you.',
      },
      {
        kind: 'certain',
        label: 'Remain standing',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -10 },
          { t: 'followers', v: -15 },
          { t: 'notoriety', v: 10 },
        ],
        resultText: 'It waits until dawn, folds the chair, and takes fifteen of your household as a gesture. By morning the whole province has heard that you did not sit.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // EXITS — certain, and gated low enough to matter
  // -------------------------------------------------------------------------
  {
    /**
     * The exit for a wizard with nothing left to hand over.
     *
     * Every other certain way out of the pact spends STOCK — followers,
     * apprentices, a relic — and each of those cards is now gated on the stock
     * it spends, because the engine clamps those costs at zero and an ungated
     * one sold real debt relief for a payment that never happened. Gating them
     * made the payments real and, between them, closed the ascent: a wizard
     * carrying an inherited debt with ten followers and no school had no
     * certain exit at any balance. `validate-content.ts` walks that ladder as a
     * destitute wizard and said so.
     *
     * So this card is priced in the one thing an indebted nobody still has,
     * which is their own time and their standing in the world. Nothing here is
     * a countable transfer, so nothing here can be clamped into a lie: an
     * absent wizard is genuinely forgotten, whatever they were worth going in.
     */
    id: 'pact_service_in_lieu',
    title: 'Service in Lieu',
    body: 'A clerk observes that the Covenant accepts labour where coin is not forthcoming, and produces a schedule. The terms are three years, unpaid, in a records office beneath a mountain nobody has named for you.',
    phase: 'any',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 2 }],
    weight: 4,
    options: [
      {
        kind: 'certain',
        label: 'Serve the term yourself',
        effects: [
          { t: 'pactDebt', v: -1 },
          { t: 'notoriety', v: -12 },
          { t: 'standing', factionId: 'ashen_covenant', v: 8 },
        ],
        resultText: 'Three years of filing. The world does not notice you were gone, which is the fee.',
      },
      {
        kind: 'gamble',
        label: 'Send a convincing double',
        odds: 0.55,
        onSuccess: [
          { t: 'pactDebt', v: -2 },
          { t: 'standing', factionId: 'ashen_covenant', v: 6 },
        ],
        onFailure: [
          { t: 'pactDebt', v: 1 },
          { t: 'standing', factionId: 'ashen_covenant', v: -14 },
        ],
        successText: 'It files beautifully for three years. Nobody beneath the mountain asks it anything.',
        failureText: 'It is asked a question in the second week. The schedule is reissued, longer.',
      },
      {
        kind: 'certain',
        label: 'Decline the schedule',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -12 },
          { t: 'notoriety', v: 8 },
        ],
        resultText: 'The clerk marks it declined, which takes some time, and does it in front of you, and in front of the queue behind you.',
      },
    ],
  },
  {
    id: 'pact_settle_accounts',
    title: 'Settling the Account',
    body: 'Interest was applied in your absence and a receipt left where you would find it. There is, at the bottom, a line for early settlement, and a note that the Covenant prefers to be paid in things that breathe.',
    phase: 'any',
    factionId: 'ashen_covenant',
    // Gated on the larger of the two payments (40 > 15), because an option
    // carries no gate of its own. Ungated, a wizard with ten followers
    // surrendered ten and cleared the full two points, while the result text
    // said forty walked out in good order — a fixed benefit bought with a cost
    // the engine had already clamped away. `pact_service_in_lieu` is the exit
    // for a household that cannot cover this one.
    requires: [
      { c: 'minPactDebt', v: 2 },
      { c: 'minFollowers', v: 40 },
    ],
    weight: 4,
    options: [
      {
        kind: 'certain',
        label: 'Settle in followers',
        effects: [
          { t: 'pactDebt', v: -2 },
          { t: 'followers', v: -40 },
          { t: 'standing', factionId: 'ashen_covenant', v: 8 },
        ],
        resultText: 'Forty of your household walk out in good order. The receipt is amended and returned.',
      },
      {
        kind: 'certain',
        label: 'Pay what you can in coin and menace',
        effects: [
          { t: 'pactDebt', v: -1 },
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: -15 },
        ],
        resultText: 'A part payment. They are gracious about it in a way you will think about later.',
      },
      {
        kind: 'certain',
        label: 'File the receipt',
        effects: [{ t: 'standing', factionId: 'ashen_covenant', v: -5 }],
        resultText: 'You file it. It is a very good file. The account is unchanged.',
      },
    ],
  },
  {
    id: 'pact_the_indenture',
    title: 'Terms of Indenture',
    body: 'The Covenant has reviewed your household and identified an efficiency. One of your apprentices has an aptitude they would like to develop, elsewhere, permanently, against the balance.',
    phase: 'any',
    factionId: 'ashen_covenant',
    // The card is about a specific apprentice. With none to indenture, the
    // signature cost nothing and bought two points anyway, and the result text
    // narrated a woman leaving who was never there.
    requires: [
      { c: 'minPactDebt', v: 3 },
      { c: 'minApprentices', v: 1 },
    ],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Sign the indenture',
        effects: [
          { t: 'pactDebt', v: -2 },
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -20 },
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
        ],
        resultText: 'She goes willingly, which is the part the others will not forgive.',
      },
      {
        kind: 'certain',
        label: 'Refuse, and say why loudly',
        effects: [
          { t: 'loyalty', v: 12 },
          { t: 'standing', factionId: 'ashen_covenant', v: -12 },
        ],
        resultText: 'The school hears you refuse. It is the best hour of their year.',
      },
    ],
  },
  {
    id: 'pact_forfeiture',
    title: 'Forfeiture in Kind',
    body: 'The ledger was brought up to date. You were not consulted, and it balances — provided one item leaves your reliquary tonight, and the Covenant has already indicated which.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    // Both certain payments are stock — one relic, or fifty of the household
    // — and `requires` is an AND, so the card only surfaces to a wizard who
    // can settle either way. Ungated, an empty reliquary erased three points
    // for nothing and the cloth still came back laundered.
    requires: [
      { c: 'minPactDebt', v: 4 },
      { c: 'holdsAnyArtifact' },
      { c: 'minFollowers', v: 50 },
    ],
    weight: 4,
    options: [
      {
        kind: 'certain',
        label: 'Let them take it',
        effects: [
          { t: 'pactDebt', v: -3 },
          { t: 'loseArtifact' },
          { t: 'standing', factionId: 'ashen_covenant', v: 12 },
        ],
        resultText: 'It is carried out under a cloth. The cloth is returned, laundered, within the week.',
      },
      {
        kind: 'certain',
        label: 'Empty the treasury instead',
        effects: [
          { t: 'pactDebt', v: -1 },
          { t: 'followers', v: -50 },
          { t: 'notoriety', v: -6 },
        ],
        resultText: 'You buy back two thirds of the debt and most of the reliquary.',
      },
      {
        kind: 'gamble',
        label: 'Dispute which item was pledged',
        odds: 0.8,
        onSuccess: [
          { t: 'pactDebt', v: -2 },
          { t: 'notoriety', v: 8 },
        ],
        onFailure: [
          { t: 'pactDebt', v: 2 },
          { t: 'loseArtifact' },
        ],
        successText: 'The pledge names a cabinet, not its contents. They take the cabinet.',
        failureText: 'The pledge names rather more than you remembered pledging.',
      },
      {
        kind: 'certain',
        label: 'Bar the reliquary door',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -15 },
          { t: 'notoriety', v: 10 },
        ],
        resultText: 'The door holds, and the street outside learns why it was tested.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // TWO-WAY GAMBLES — the route the ending now arrives through
  //
  // Both keep a `certain` walk-away, so the bet is always a choice. Both put
  // the debt on the ROLL: down on success, up on failure, printed on the card
  // in both directions before the player commits.
  // -------------------------------------------------------------------------
  {
    id: 'pact_the_audit',
    title: 'A Full Audit',
    body: 'Someone from the Covenant read the total aloud at your gate. Twice, for the record. You may contest it — the Covenant is scrupulous about audits, and scrupulous about what an audit turns up when it goes the other way.',
    phase: 'any',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 2 }],
    weight: 4,
    options: [
      {
        kind: 'gamble',
        label: 'Contest the total',
        odds: 0.6,
        onSuccess: [
          { t: 'pactDebt', v: -2 },
          { t: 'notoriety', v: 6 },
        ],
        onFailure: [
          { t: 'pactDebt', v: 2 },
          { t: 'followers', v: -20 },
        ],
        successText: 'Three entries were duplicated. The clerk who made them is not mentioned again.',
        failureText: 'It finds two obligations you had forgotten, and twenty people to cover them.',
      },
      {
        kind: 'certain',
        label: 'Accept the total as read',
        effects: [{ t: 'standing', factionId: 'ashen_covenant', v: 6 }],
        resultText: 'You accept it aloud, at the gate, twice, for the record.',
      },
    ],
  },
  {
    id: 'pact_the_last_wager',
    title: 'The Covenant Offers a Wager',
    body: 'The visits stop. In their place comes an offer, made politely, in daylight: one throw against the whole balance. They are generous about the odds because they have found that people at your position take it either way.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 4 }],
    weight: 5,
    options: [
      {
        /**
         * The card the ending arrives on.
         *
         * Deliberately GOOD odds. A rational wizard never signs a certain card
         * that crosses the ceiling — the balance is in the header and the cost
         * is on the option — so if the only debt cards were certain ones,
         * `consumed_by_pact` would stop happening to anyone paying attention.
         * An 80% chance to clear almost everything is a bet a careful player
         * takes on purpose, and one career in five it is the last thing they
         * ever decide. That is wiki/01 § 7's "High-variance play punished",
         * paid for with a printed number rather than a hidden one.
         */
        kind: 'gamble',
        label: 'Take the throw',
        odds: 0.8,
        onSuccess: [
          { t: 'pactDebt', v: -4 },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
        ],
        onFailure: [{ t: 'pactDebt', v: 2 }],
        successText: 'It lands well. The balance is struck through and the pen left as a gift.',
        failureText: 'It does not land well. They are as gracious in winning as they were about the odds.',
      },
      {
        kind: 'certain',
        label: 'Decline, and keep what you owe',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -8 },
          { t: 'notoriety', v: 8 },
        ],
        resultText: 'You decline in daylight, politely, in front of everyone the offer was meant to impress, and the visits resume that winter.',
      },
    ],
  },
];
