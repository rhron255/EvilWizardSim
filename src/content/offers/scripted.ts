import type { Offer } from '../../types';

/**
 * SCRIPTED SET PIECES.
 *
 * Not sampled from the ordinary weighted pool — the engine fires these at the
 * moments it owns. `prophecy` is the phase pivot. The rest are the branches a
 * run can end on, and every one of them is authored as a live decision with a
 * disclosed price: no branch here is a strict upgrade.
 *
 * Note on lichdom: the wiki's cost is that the lich forfeits all artifacts and
 * all followers. The engine applies that forfeiture, but the effect list below
 * still spells it out, because the odds-display rule says the player must see
 * the whole price before committing.
 */
export const scriptedOffers: Offer[] = [
  {
    id: 'prophecy',
    title: 'The Prophecy',
    body: 'A child was born this year in a village you have never troubled. The temples have already agreed the wording, and your name is in it, spelled correctly.',
    phase: 'any',
    factionId: 'crownlands',
    scripted: true,
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Send for the child',
        effects: [
          { t: 'heroThreat', v: 10 },
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'followers', v: -8 },
        ],
        resultText: 'The village is empty when your riders arrive. It has been empty for a week.',
      },
      {
        kind: 'certain',
        label: 'Prepare the walls',
        effects: [
          { t: 'heroThreat', v: -6 },
          { t: 'followers', v: -15 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Do nothing; prophecies are a genre',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Find the temple that wrote it',
        odds: 0.2,
        onSuccess: [
          { t: 'heroThreat', v: -15 },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 20 },
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'crownlands', v: -35 },
        ],
        successText: 'One scribe, one commission, one paymaster. The wording is retracted by morning.',
        failureText: 'Eleven temples now claim to have written it. All of them are correct.',
      },
    ],
  },

  {
    id: 'scripted_the_long_arrangement',
    title: 'The Long Arrangement',
    body: 'The Worm Below offers the only thing it has ever offered anyone: not an ending, but an exemption from one. It will take the relics, because they were always borrowed, and the followers, because they are alive. You go on living out the decline — you simply stop being able to die of it.',
    phase: 'decline',
    factionId: 'worm_below',
    scripted: true,
    /**
     * Both gates track the leadership route now that lichdom IS the Worm's
     * crown (issue #21, #14 slice 3): `minStanding` at `DEVOTION_STANDING`
     * (50, literal here — content stays a pure data bundle and does not
     * import the engine constant; `validate-content.ts` holds the two in
     * step the same way it does for `concordat_` and `oath_`) is what
     * "devoted enough to lead" already means everywhere else. `minArtifacts`
     * at `LICH_RELIC_REQUIREMENT` is the rite's own price gate — the rite
     * already consumes every relic held, so the requirement and the cost are
     * the same relics (CLAUDE.md failure mode 14).
     */
    requires: [
      { c: 'minStanding', factionId: 'worm_below', v: 50 },
      { c: 'minArtifacts', v: 2 },
    ],
    /**
     * The whole lichdom branch is this one option, so its weight is an
     * availability decision, not a texture one.
     *
     * At weight 1 (plus `SCRIPTED_WEIGHT_BONUS`) a player who spent the run
     * courting the Worm Below specifically to be offered this reached the
     * standing gate in 61% of careers and was then shown the card in only
     * **19.9% of those** — it lost the draw to texture cards across the seven
     * or so decline eras it was eligible, and the LICHDOM ending landed in
     * 0.25% of all runs. wiki/01 § 7 calls lichdom "a live decision rather
     * than a strict upgrade"; a decision you are offered in one run out of
     * five while actively pursuing it is a lottery, and rule 6 wants all seven
     * collection slots reachable.
     *
     * Availability to a dedicated seeker, measured (at the OLD gate,
     * `minStanding worm_below 20`, no relic requirement): 19.9% at w1, 59.6%
     * at w6, 73.3% at w12, 78.0% at w20 — the ceiling past w12 is the gate
     * being met late in the decline, not the draw.
     *
     * SIX, not twelve, because the weight is not free. This card is eligible
     * only in the decline, where the pool is small, so a heavy thumb crowds
     * out the relic-granting cards that share it: population-wide, "ever held
     * 1+ legendary" fell 10.6% → 8.2% and Ascension 2.20% → 1.60%, both of
     * which stay in band but neither of which is worth buying more of a
     * second branch with. w6 turns the lottery into a decision and stops.
     *
     * STILL SIX (issue #21) after the gate moved to `DEVOTION_STANDING` (50,
     * up from 20) plus `minArtifacts`. Raising the weight further was tried
     * against the harder gate and did nothing — a seeker who cannot assemble
     * the relic count before the age limit is never offered the card no
     * matter how heavily it is drawn, so the reachability the tighter gate
     * cost had to be bought back on the relic count instead
     * (`LICH_RELIC_REQUIREMENT`'s doc comment in `constants.ts` has the
     * cohort numbers). w6 still turns the lottery into a decision without
     * paying rent against the relic-granting cards a second time.
     *
     * It cannot leak to anyone who has not earned it: the `requires` gate, the
     * decline phase and the seen-once rule all still apply.
     */
    weight: 6,
    options: [
      {
        kind: 'certain',
        label: 'Accept. The decline still has to be survived.',
        // `becomeLich` IS the price: the engine forfeits every relic and every
        // follower and freezes decay. This was six stacked `loseArtifact`
        // entries and a `followers: -999` sentinel — an author hand-rolling a
        // bulk effect the union could not express. The renderer prints the
        // forfeiture in full, so the player still sees the whole bill.
        effects: [
          { t: 'becomeLich' },
          { t: 'notoriety', v: 12 },
        ],
        resultText: 'The vault empties. The household walks out through the front gate in daylight, and nobody stops them.',
      },
      {
        kind: 'certain',
        label: 'Refuse, and say why',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -30 },
          { t: 'notoriety', v: 5 },
          { t: 'loyalty', v: 10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ask for it without the price',
        odds: 0.25,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'legendary' },
          { t: 'standing', factionId: 'worm_below', v: 20 },
          { t: 'notoriety', v: 10 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'worm_below', v: -25 },
          { t: 'followers', v: -30 },
          { t: 'pactDebt', v: 2 },
          { t: 'notoriety', v: -6 },
        ],
        successText: 'It gives you the relic and keeps the rite. It can wait; that is its whole advantage.',
        failureText: 'It does not take offence. It simply stops offering, which is worse.',
      },
    ],
  },

  {
    id: 'scripted_the_reckoning',
    title: 'The Reckoning',
    body: 'The Covenant ledger has been closed and totalled. Ceremoniarch Yull is not present; what has come in his place brought the ledger and nothing to write with.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    scripted: true,
    requires: [{ c: 'minPactDebt', v: 4 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Pay everything you have',
        effects: [
          { t: 'followers', v: -80 },
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'pactDebt', v: -6 },
          { t: 'notoriety', v: -10 },
          { t: 'standing', factionId: 'ashen_covenant', v: 20 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse to pay',
        effects: [{ t: 'ending', endingId: 'consumed_by_pact' }],
      },
      {
        kind: 'gamble',
        label: 'Contest the total',
        odds: 0.25,
        onSuccess: [
          { t: 'pactDebt', v: -4 },
          { t: 'notoriety', v: 10 },
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
        ],
        onFailure: [{ t: 'ending', endingId: 'consumed_by_pact' }],
        successText: 'Four of the entries were double-counted. The thing corrects the ledger and leaves without a word.',
        failureText: 'It turns the ledger round so you can see it. Your name is written on both sides.',
      },
    ],
  },

  {
    id: 'scripted_the_chosen_one',
    title: 'The Chosen One',
    body: 'She is at the gate. She is twenty-two, she has the sword, and she has been preparing for this conversation since she was nine years old.',
    phase: 'decline',
    factionId: 'crownlands',
    scripted: true,
    requires: [{ c: 'minNotoriety', v: 45 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Surrender the tower and walk out',
        effects: [
          { t: 'lairTier', v: -2 },
          { t: 'notoriety', v: -25 },
          { t: 'heroThreat', v: -20 },
          { t: 'followers', v: -40 },
        ],
      },
      {
        kind: 'certain',
        label: 'Offer her the apprenticeship',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: -30 },
          { t: 'heroThreat', v: -12 },
          { t: 'notoriety', v: 6 },
        ],
        resultText: 'She accepts. She keeps the sword, and she keeps it where you can see it.',
      },
      {
        kind: 'gamble',
        label: 'Fight her',
        odds: 0.4,
        onSuccess: [
          { t: 'notoriety', v: 25 },
          { t: 'heroThreat', v: -25 },
          { t: 'followers', v: 20 },
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'legendary' },
        ],
        onFailure: [{ t: 'ending', endingId: 'slain_by_chosen_one' }],
        successText: 'You keep the sword. It is a very good sword, and it does not like you.',
        failureText: 'She has been rehearsing this since she was nine. You began at the gate.',
      },
      {
        kind: 'gamble',
        label: 'Tell her about her father',
        odds: 0.15,
        onSuccess: [
          { t: 'heroThreat', v: -30 },
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'followers', v: 10 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 10 },
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: -20 },
        ],
        successText: 'She rides for the capital instead. The Crown spends a year denying what she says there.',
        failureText: 'She already knew. She has known longer than you have.',
      },
    ],
  },

  {
    id: 'scripted_the_reliquary',
    title: 'The Reliquary',
    body: 'The Pale Academy proposes preservation rather than execution: a gem, a shelf, a climate-controlled room, and a review of your case every hundred years.',
    phase: 'decline',
    factionId: 'pale_academy',
    scripted: true,
    requires: [{ c: 'minStanding', factionId: 'pale_academy', v: 30 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Consent to the gem',
        effects: [{ t: 'ending', endingId: 'sealed_in_gem' }],
      },
      {
        kind: 'certain',
        label: 'Ask for a century to settle affairs',
        effects: [
          { t: 'heroThreat', v: -10 },
          { t: 'notoriety', v: -8 },
          { t: 'standing', factionId: 'pale_academy', v: 15 },
          { t: 'followers', v: -15 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Agree, and substitute a decoy',
        odds: 0.35,
        onSuccess: [
          { t: 'heroThreat', v: -18 },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'pale_academy', v: -25 },
          { t: 'followers', v: -10 },
        ],
        onFailure: [{ t: 'ending', endingId: 'sealed_in_gem' }],
        successText: 'The gem is sealed, labelled, and shelved. The label is not wrong, exactly.',
        failureText: 'The Academy has catalogued a great many wizards. It has seen the decoy before.',
      },
    ],
  },

  {
    id: 'scripted_the_succession',
    title: 'The Succession',
    body: 'Your apprentices have called a meeting and not invited you. There is an agenda. You know there is an agenda because a copy was left where you would find it.',
    phase: 'decline',
    scripted: true,
    requires: [{ c: 'minApprentices', v: 3 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Dissolve the household tonight',
        effects: [
          { t: 'apprentices', v: -3 },
          { t: 'followers', v: -30 },
          { t: 'loyalty', v: -20 },
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attend the meeting',
        effects: [
          { t: 'loyalty', v: 20 },
          { t: 'apprentices', v: -1 },
          { t: 'notoriety', v: -5 },
          { t: 'followers', v: 10 },
        ],
        resultText: 'You take the empty chair. Item four is moved to any other business and never returns to it.',
      },
      {
        kind: 'gamble',
        label: 'Let it proceed and see who speaks',
        odds: 0.45,
        onSuccess: [
          { t: 'apprentices', v: -2 },
          { t: 'loyalty', v: 15 },
          { t: 'notoriety', v: 12 },
          { t: 'followers', v: 8 },
        ],
        onFailure: [{ t: 'ending', endingId: 'betrayed_by_apprentice' }],
        successText: 'Two of them speak. They are wrong about the succession and right about you.',
        failureText: 'Nobody speaks. The agenda was left where you would find it on purpose.',
      },
    ],
  },
];
