---
name: Operational Behaviors
description: Dynamic rules — offer generation, odds presentation policy, Notoriety decay, hero escalation, and faction standing.
---

# Operational Behaviors

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Offer selection | Planned | Weighted-pool approach proposed. |
| Odds policy | Planned | Rule is firm; implementation is not. |
| Decay curve | Planned | Formula is a starting guess for tuning. |
| Hero escalation | Planned | Untuned. |
| Faction standing | Planned | Effects sketched only. |

## Odds Presentation Policy

**Every probabilistic option displays its probability and both outcomes
before the player commits.** No hidden rolls. No "fate decides."

This is the single most important rule in the codebase. Printed odds are
what convert a coin flip into a decision the player feels they authored —
it is the cheapest agency available and the reason the reference game
does not feel like a slot machine despite being one.

Presentation format, per option:

```
[ Accept the Covenant's offer ]
  35%  →  +12 Notoriety, gain Bone Crown
  65%  →  lose an apprentice, +1 pact debt
```

Corollary: **no option may have undisclosed downside.** A player who is
surprised by an unlisted consequence loses the sense of authorship, and
the whole structure depends on it.

## Offer Generation

Weighted pool, filtered then sampled:

1. Filter the catalog by current `phase` and any `requires` conditions
   (faction standing, artifacts held, apprentice count, lair tier).
2. Exclude offers already seen **this run**.
3. Weight by faction standing — factions the player has courted surface
   more often. This is what makes deliberate routing legible.
4. Weight by pact debt — offers that deepen a debt, and offers that offer a
   way out of one, both surface more often as the balance climbs. This is
   the pressure that replaced the interest tick (see § Pact Debt below):
   the world stops leaving a debtor alone, without any number moving on its
   own.
5. Sample 2–4.

Guarantees:
- At least one option in every era must be low-risk. A player should
  never be forced into a gamble.
- At least one faction-affiliated offer every 2–3 eras, so faction
  identity stays present.

## Notoriety Decay

Zero during ascent. Begins at the prophecy trigger and compounds:

```
decayPerEra = base * (1 + erasSinceProphecy * 0.15)
base ≈ 3
```

Starting guess only. Tuning target: a player who takes no defensive
action should visibly slide but not collapse — the decline should feel
like erosion, not a cliff. Lich branch sets decay to 0.

**Do not add a doom meter.** The decline works because it is a number
quietly going the wrong way, not because it is announced.

### Doom meter vs. disclosure — reconciled in implementation

The rule above and the odds policy's "no undisclosed downside" corollary
were read as contradicting each other three times during the build, so the
line between them is drawn here:

- **The erosion stays quiet.** Notoriety decay and hero-threat escalation
  are gradual and survivable. Neither is announced as it happens, and no
  UI element counts down to them.
- **A counter that ENDS a run is disclosed** — its threshold, the distance
  to it, and its rate of change. Apprentice loyalty drift (`-(2 + count)`
  per decline era) is lethal, countable and player-controllable; a player
  who cannot see it is not playing a tenser game, only a more surprising
  one.
- **Disclosure does not stop at the choice card.** That tick fires in the
  era-end systems, so it is printed on the resolution that reports the era
  — in a section of its own, never mixed into the option's own
  consequences. A death arriving on a card that lists nothing capable of
  causing it is the undisclosed downside this document forbids, reached by
  a different route.

### Pact Debt

Pact debt **has no rate of change**. It moves only on a card the player
accepted, and every point is printed on that card before the commit.

It used to accrue `+1` per decline era, which made it the second most common
ending in the game (29.4% of runs) and this project's richest source of
disclosure defects — a player shown one era of headroom that did not exist,
and a death arriving on a card that mentioned nothing capable of causing it.
Both were patched by explaining the tick better; the tick was deleted instead.

What carries the pressure now is the offer pool (§ Offer Generation, step 4).
A wizard who owes nothing draws from an unweighted catalog. A wizard deep in
debt meets the Ashen Covenant constantly — its temptations and its exits both
— and the cards themselves escalate in register as the balance climbs, which
is where the escalation is disclosed. There is deliberately no UI clause for
it: it changes which cards are drawn, never a number behind the player's back.

The header therefore states the ceiling and nothing else. Adding a rate clause
back would be the same lie the old one told, pointing the other way.

The same distinction covers the seal: `sealed_in_gem` takes Pale Academy
standing **and** notoriety, so the run screen names both numbers.

Since issue #14 that condition belongs to all six factions, and the disclosure
generalised with it rather than after it: every bar carries the threshold as a
tick, any faction whose reprisal is live and close reads as lethal, and the
header's one sentence names whichever faction would actually act — picked by
the engine's own rule, not by a second implementation of it. Five reprisals
with a warning for one of them would have been the ceiling-with-no-distance
bug five times over.

#### Paying it down has to cost something

An exit that trades stock — followers, an apprentice, a relic — for a fixed
number of points must be **gated on the stock it spends**. `applyEffects`
floors those balances at zero, so an ungated exit hands a wizard with nothing
the full relief for whatever they happen to have, while the result text
narrates a payment that did not occur. Six cards shipped that way and were
found in review.

Options carry no gates of their own, so a card offering two different payments
requires both. That gating closes the ladder for the destitute, which is why
`pact_service_in_lieu` exists: a certain exit in both phases priced in time and
reputation, neither of which is a countable transfer and neither of which can
therefore be clamped into a lie. `validate-content.ts` enforces both halves —
the payment rule, and the exit ladder walked as a wizard with nothing left to
sell.

## Hero Escalation

`heroThreat` rises each decline-phase era. Compared against a defense
value derived from Notoriety, artifacts held, and lair tier. When threat
exceeds defense, the run ends in *Slain by the Chosen One*.

Escalation should be steep enough that survival to the age limit is
uncommon — the swamp retirement ending should feel earned, not default.

## Faction Standing

Range −100..100 per faction. Effects:

| Standing | Effect |
|----------|--------|
| High | Their offers surface more; their artifacts become reachable |
| Neutral | Baseline |
| Hostile | Their offers convert to threats; their artifacts lock out |

Hostility is **contagious along `hostileTo`** — courting the Ashen
Covenant should cost standing with the Pale Academy. This is what makes
runs feel like committed paths rather than shopping trips, and it is
what gives self-imposed constraints ("Covenant-only run") something to
push against.

**Standing must pay before the endgame (added 2026-08-27).** In-run, standing's
only *visible* consequences used to be punishments — the seal threshold and a
locked reliquary — with the reward (the concordat legendary) sitting at
`DEVOTION_STANDING` (50), a gate most runs never reach. That made deliberate
faction routing, the behaviour meant to produce hundred-run players, read as all
stick and no carrot. A mid-run **favor** beat now fills the gap: at +30 standing
each of the four courtable factions offers a genuine reward in its own currency
(the Gilded Hand a discounted relic, the Covenant infamy on credit, the Academy
shelter that dulls your menace, the Choir followers), for a real price and always
with a walk-away. The carrot arrives while there is still a run to spend it on.

## Near-Miss Tuning

The Ascension ending is the run's visible unattainable prize, with its
empty slot in the header from era one. Target rate: **low single-digit
percent of runs.** High enough to feel real, low enough that missing it
reads as unfinished business.

Deliberate: a player who reaches high Notoriety and still ends without
Ascension is the target experience, not a balance failure.

## Open Tasks

- [ ] Implement weighted offer selection with seen-this-run exclusion.
- [ ] Enforce the odds-display rule in the offer renderer, not by
      convention — make an undisclosed effect impossible to author.
- [ ] Tune decay base and exponent against 100 simulated runs.
- [ ] Tune hero escalation so age-limit survival is uncommon.
- [ ] Instrument Ascension rate and hold it in the low single digits.
