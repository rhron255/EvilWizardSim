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
4. Sample 2–4.

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
