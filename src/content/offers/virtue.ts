import type { Offer } from '../../types';
import {
  GOOD_WIZARD_ILL_CAP,
  GOOD_WIZARD_REPUTATION_GOOD,
  GOOD_WIZARD_RESOLUTION_GOOD,
} from '../../engine/constants';

/**
 * THE GOOD WIZARD ROUTE (issue #14 slice 5, issue #23).
 *
 * An obscure route open to a career of consistently constructive choices,
 * counted by two hidden `RunState` counters — `goodActs`/`illActs` — moved by
 * the `goodAct`/`illAct` `Effect` variants. Both are the rule-1 exception
 * documented on those variants in `src/types.ts`: nothing here, or anywhere
 * else in the catalog, is permitted to gate on them except the offers below,
 * and nothing on screen is permitted to mention them. `scripts/validate-
 * content.ts` cross-checks every gate below against the engine constants it
 * must agree with, the same way it does for `concordat_`/`oath_`.
 *
 * THREE PHASES, in one file:
 *
 *   OBSCURE — `virtue_obscure_*`. Ordinary-reading choices, at ORDINARY
 *   weight, deliberately NOT `scripted`. These are ungated — every run's
 *   pool includes them, saint or not — so unlike the reputation and
 *   resolution cards below, marking them `scripted` would apply the draw
 *   bonus to EVERY policy's pool, not just a seeking one. Measured (issue
 *   #23): at `scripted: true` / weight 6, six cards pulled enough draw share
 *   from the rest of the catalog to crash Ascension from 1.25% to 0.10% and
 *   push `slain_by_chosen_one` from 47.70% to 63.30% — the crowding-out
 *   effect the grievance cards' own doc comment warns about, just applied to
 *   an ungated card instead of a gated one. Reachability for a dedicated
 *   seeker comes from low thresholds instead (see `GOOD_WIZARD_
 *   REPUTATION_GOOD` in `constants.ts`), not from distorting the shared pool.
 *   At most one option across the whole set gestures, once, at the idea that
 *   something is being kept track of, without naming a mechanic.
 *
 *   REPUTATION — `virtue_reputation_*`. Gated on `GOOD_WIZARD_REPUTATION_GOOD`
 *   goodActs and `GOOD_WIZARD_ILL_CAP` illActs, `scripted: true` — safe to
 *   weight up because the gate keeps it out of a pool that has not earned it:
 *   `buildOfferPool` filters on `requires` before the scripted bonus ever
 *   applies, so an ordinary run's draw is untouched.
 *
 *   RESOLUTION — `virtue_resolution_*`. Gated on `GOOD_WIZARD_RESOLUTION_GOOD`
 *   goodActs, decline-only, `scripted: true` at a lich-rite-sized weight, for
 *   the same reason the gate above makes that safe. Accepting fires
 *   `{ t: 'vowGoodWizard' }` — fully disclosed on the card, exactly like
 *   `becomeLich` — which does NOT end the run; it sets the flag `checkEndings`
 *   reads at the age limit, ahead of the lich branch. Declining costs nothing
 *   structural: the run continues toward whatever ending it was already
 *   heading for. This route can only ever ADD an ending.
 */

const VIRTUE_OBSCURE: Offer[] = [
  {
    id: 'virtue_obscure_harvest',
    title: 'The Late Blessing',
    body: 'A village headman asks, without much hope, whether a wizard’s blessing might do anything for a harvest that is already three weeks behind.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Bless it and ask nothing',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'notoriety', v: 1 },
        ],
        resultText: 'The blessing is unremarkable magic, competently done. The harvest comes in fine.',
      },
      {
        kind: 'certain',
        label: 'Bless it, for a tenth of the yield',
        effects: [
          { t: 'followers', v: 6 },
          { t: 'notoriety', v: 2 },
        ],
        resultText: 'The headman agrees, because a tenth of a harvest is still nine tenths of one.',
      },
      {
        kind: 'certain',
        label: 'Curse it instead, out of curiosity',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 3 },
          { t: 'heroThreat', v: 2 },
        ],
        resultText: 'The blight is thorough and entirely unnecessary. Someone writes it down.',
      },
    ],
  },

  {
    id: 'virtue_obscure_mill',
    title: 'The Broken Mill',
    body: 'The valley mill has not turned in a month. The miller has run out of theories that do not involve you, mostly because you were the last theory that worked.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Fix it properly',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'followers', v: 2 },
        ],
        resultText: 'It is not glamorous work. The wheel turns again by evening.',
      },
      {
        kind: 'certain',
        label: 'Fix it, loudly',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'followers', v: -2 },
        ],
        resultText: 'The wheel turns again, accompanied by considerably more thunder than the job needed.',
      },
      {
        kind: 'gamble',
        label: 'Ignore it and see who else tries',
        odds: 0.5,
        onSuccess: [{ t: 'notoriety', v: 2 }],
        onFailure: [{ t: 'followers', v: -6 }],
        successText: 'Nobody else tries. The valley simply grinds its grain elsewhere for a season.',
        failureText: 'The miller finds someone else. Word gets around about who did not help.',
      },
    ],
  },

  {
    id: 'virtue_obscure_plague',
    title: 'The Quiet Cure',
    body: 'A fever is moving through the lower valley — not the dramatic kind, the kind that just keeps three households in bed for a fortnight. You know exactly which root stops it.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Cure it and say nothing about where the root came from',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'notoriety', v: 1 },
        ],
        resultText: 'Three households recover inside a week. None of them ever learn why.',
      },
      {
        kind: 'certain',
        label: 'Sell the cure at what the market will bear',
        effects: [
          { t: 'followers', v: 8 },
          { t: 'notoriety', v: 2 },
        ],
        resultText: 'The market bears a great deal, as markets do when the alternative is a fortnight in bed.',
      },
      {
        kind: 'certain',
        label: 'Let the valley find its own root',
        effects: [{ t: 'notoriety', v: -1 }],
        resultText: 'It takes them eleven days. The root was under a hedge the whole time.',
      },
    ],
  },

  {
    id: 'virtue_obscure_dispute',
    title: 'The Boundary Dispute',
    body: 'Two farms have been arguing over the same eleven feet of fence line since before either owner was born. Both have asked you to settle it. Both expect to win.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Rule on the old survey, whoever it favours',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'standing', factionId: 'crownlands', v: 3 },
        ],
        resultText: 'The survey favours neither family’s story. Both are furious. Both accept it.',
      },
      {
        kind: 'certain',
        label: 'Rule for whoever paid you first',
        effects: [
          { t: 'followers', v: 5 },
          { t: 'notoriety', v: 2 },
        ],
        resultText: 'The other farm reduces its opinion of wizardry by a measurable amount.',
      },
      {
        kind: 'certain',
        label: 'Move the fence eleven feet the other way, for spite',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 4 },
          { t: 'heroThreat', v: 2 },
        ],
        resultText: 'Now both farms are furious at the same wizard instead of at each other. Progress, of a kind.',
      },
    ],
  },

  {
    id: 'virtue_obscure_haunting',
    title: 'The Patient Ghost',
    body: 'The thing in the mill loft is not malicious, just unresolved: a journeyman who fell from the rafters forty years ago and has been waiting, politely, for someone to notice.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Sit with it and hear the grievance out',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'notoriety', v: 1 },
        ],
        resultText: 'It wanted a name carved somewhere. That turns out to be the whole thing. It goes quiet by morning.',
      },
      {
        kind: 'certain',
        label: 'Bind it to the loft as unpaid labour',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'followers', v: 4 },
          { t: 'notoriety', v: 3 },
        ],
        resultText: 'It has been unresolved for forty years and will now be unresolved indefinitely, and working.',
      },
      {
        kind: 'certain',
        label: 'Leave it be entirely',
        effects: [{ t: 'notoriety', v: -1 }],
        resultText: 'The mill loft remains unrentable. This is, on reflection, everyone’s problem but yours.',
      },
    ],
  },

  {
    id: 'virtue_obscure_refugees',
    title: 'The Overflow Camp',
    body: 'A border skirmish two valleys over has put forty families on the road with nowhere particular to go. Your lower grounds are, technically, empty.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let them camp on the lower grounds, no charge',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'followers', v: 3 },
        ],
        // The one oblique nod the whole obscure phase permits itself — see
        // the file doc comment. Names no mechanic, no counter, no threshold.
        resultText:
          'Nothing is asked in return. Someone, keeping a different sort of ledger than yours, notes the gate you left open.',
      },
      {
        kind: 'certain',
        label: 'Charge a fair rent for the grounds',
        effects: [
          { t: 'followers', v: 10 },
          { t: 'notoriety', v: 1 },
        ],
        resultText: 'Forty families pay what they can. It is, by any reasonable measure, fair.',
      },
      {
        kind: 'certain',
        label: 'Set the grounds’ wards to turn them away',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 3 },
          { t: 'heroThreat', v: 3 },
        ],
        resultText: 'Forty families find somewhere else to be turned away from instead.',
      },
    ],
  },
];

const VIRTUE_REPUTATION: Offer[] = [
  {
    id: 'virtue_reputation_rumor',
    title: 'A Kinder Rumor',
    body: 'The story going around the market square has, somehow, gotten gentler than the facts. Nobody seems in a hurry to correct it.',
    phase: 'any',
    scripted: true,
    requires: [
      { c: 'minGoodActs', v: GOOD_WIZARD_REPUTATION_GOOD },
      { c: 'maxIllActs', v: GOOD_WIZARD_ILL_CAP },
    ],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Let the rumor stand',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'heroThreat', v: -2 },
        ],
        resultText: 'It keeps standing. A harmless wizard is not much of a commission for anyone.',
      },
      {
        kind: 'certain',
        label: 'Correct it, loudly, in the square',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: 4 },
        ],
        resultText: 'The correction is memorable. The rumor does not survive the afternoon.',
      },
    ],
  },

  {
    id: 'virtue_reputation_accusation',
    title: 'An Old Accusation, Dropped',
    body: 'A magistrate’s clerk writes to say a decade-old complaint against you has been quietly struck from the docket. The letter is almost apologetic about it.',
    phase: 'any',
    scripted: true,
    requires: [
      { c: 'minGoodActs', v: GOOD_WIZARD_REPUTATION_GOOD },
      { c: 'maxIllActs', v: GOOD_WIZARD_ILL_CAP },
    ],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Let it go quietly, as offered',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'standing', factionId: 'crownlands', v: 4 },
        ],
        resultText: 'The docket closes without ceremony. It was, on reflection, a fair complaint.',
      },
      {
        kind: 'certain',
        label: 'Write back to remind them who you are',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'crownlands', v: -8 },
        ],
        resultText: 'The clerk reopens the docket, adds a page, and stops apologising.',
      },
    ],
  },

  {
    id: 'virtue_reputation_afraid',
    title: 'Less Afraid',
    body: 'The village on the lower road used to bar its shutters at the sound of your name. Lately the children just wave.',
    phase: 'any',
    scripted: true,
    requires: [
      { c: 'minGoodActs', v: GOOD_WIZARD_REPUTATION_GOOD },
      { c: 'maxIllActs', v: GOOD_WIZARD_ILL_CAP },
    ],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Wave back',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'heroThreat', v: -3 },
        ],
        resultText: 'The shutters stay open. It is a strange thing to get used to.',
      },
      {
        kind: 'certain',
        label: 'Do something memorably alarming, to be safe',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: 3 },
        ],
        resultText: 'The shutters come back down within the hour. This is, apparently, the goal.',
      },
    ],
  },
];

const VIRTUE_RESOLUTION: Offer[] = [
  {
    id: 'virtue_resolution_the_quiet_ledger',
    title: 'The Quiet Ledger',
    body: 'Nobody summons you for this one. There is no committee, no rite, no clerk with a form. Just a life that has, for a long while now, kept adding up the same quiet way, and the sense that it could simply go on adding up like this until the end of it.',
    phase: 'decline',
    scripted: true,
    requires: [
      { c: 'minGoodActs', v: GOOD_WIZARD_RESOLUTION_GOOD },
      { c: 'maxIllActs', v: GOOD_WIZARD_ILL_CAP },
    ],
    // Gated exactly like the lich rite, so the same weight lesson applies:
    // eligible only in the decline, where the pool is small, and a career
    // that qualifies should not lose the draw to a texture card in the few
    // eras it has left to see this. MEASURED (issue #23), `saint` sim policy,
    // at the current gates and this weight: seen/taken 8.50%-10.00% of the
    // cohort across seeds 1-2, `good_wizard` reached in 1.50% at both — see
    // `GOOD_WIZARD_RESOLUTION_GOOD`'s doc comment in `constants.ts` for the
    // full chain, including the weight this was tuned up from.
    weight: 14,
    options: [
      {
        kind: 'certain',
        label: 'Let it go on adding up like this',
        effects: [{ t: 'vowGoodWizard' }, { t: 'notoriety', v: -4 }],
        resultText: 'Nothing changes, on purpose. The rest of the career is exactly this, held to the end.',
      },
      {
        kind: 'certain',
        label: 'There is still time to be somebody else',
        effects: [{ t: 'notoriety', v: 6 }],
        resultText: 'The ledger closes on this page. Whatever comes next writes its own.',
      },
    ],
  },
];

export const virtueOffers: Offer[] = [
  ...VIRTUE_OBSCURE,
  ...VIRTUE_REPUTATION,
  ...VIRTUE_RESOLUTION,
];
