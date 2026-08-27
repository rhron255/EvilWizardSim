---
name: Data Models & Content
description: Schemas for run state, eras, factions, artifacts and offers, plus balance tables and content catalog targets.
---

# Data Models & Content

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Schemas | Planned | Drafted below; not implemented or reviewed. |
| Notoriety tiers | Measured | Thresholds held against 2000 real runs; see the tuning task below. |
| Faction catalog | Missing | Six proposed, none written. |
| Artifact catalog | Missing | Target 30; none written. |
| Offer/event catalog | Missing | Target 80–120; none written. |

## Design Intent

Three reward currencies, each with a **distinct job**. If they collapse
into one, the run flattens:

| Currency | Job | Scope |
|----------|-----|-------|
| **Artifacts** | Collection engine and near-miss driver | Persists **across** runs |
| **Followers** | Ledger filler — the quietly accumulating number | Single run |
| **Notoriety** | The headline stat and color signal | Single run |

Lichdom is deliberately absent from this table: it is an ending, not a
currency. See `01_core_loop.md`.

## Schemas

Draft TypeScript shapes. Not final.

```ts
type RunState = {
  id: string;
  wizardName: string;
  epithet: string;
  originId: string;
  age: number;
  eraIndex: number;
  phase: 'ascent' | 'decline';
  notoriety: number;          // 0-99
  followers: number;
  lairId: string;
  heldArtifactIds: string[];
  factionStanding: Record<FactionId, number>;  // -100..100
  apprentices: { count: number; loyalty: number };
  pactDebt: number;
  heroThreat: number;
  eras: EraRecord[];          // append-only
  ending?: EndingId;
};

type EraRecord = {
  age: number;
  lairId: string;
  notoriety: number;
  notorietyDelta: number;
  followers: number;
  artifactsGained: string[];
  deedSummary: string;        // one line, flavor
  choiceId: string;
  outcome: 'success' | 'failure' | 'deterministic';
};

type Faction = {
  id: FactionId;
  name: string;
  blurb: string;
  offersArtifactIds: string[];
  demands: string;            // what they take, in player-facing terms
  hostileTo: FactionId[];
};

type Artifact = {
  id: string;
  name: string;
  factionId: FactionId;       // every artifact belongs to a faction
  rarity: 'common' | 'rare' | 'legendary';
  effect: string;
  flavorText: string;
};

type Offer = {
  id: string;
  title: string;
  body: string;               // flavor — funny
  phase: 'ascent' | 'decline' | 'any';
  requires?: Condition[];
  options: OfferOption[];     // 2-4
};

type OfferOption = {
  label: string;
  odds?: number;              // 0-1; when present, ALWAYS displayed
  onSuccess: Effect[];
  onFailure?: Effect[];
};

type Collection = {           // persisted across runs
  discoveredArtifactIds: string[];
  endingsSeen: EndingId[];
  runsCompleted: number;
  bestNotoriety: number;
};
```

## Notoriety Tiers

Drives the badge color — the game's only rationed visual reward. The bands
below were guesses when written and have since been measured against 2000 runs
of the real catalog; they were kept. Copy is still placeholder.

| Range | Tier | Badge | Player-facing line |
|-------|------|-------|--------------------|
| 0–39 | Unknown | Grey | "The villagers do not know your name." |
| 40–59 | Local Menace | Slate | "Three hamlets have complained." |
| 60–74 | Named Threat | Bronze | "You appear in a ledger of dangers." |
| 75–89 | Kingdom-Level | Violet | The color moment. Crossing 75 must feel like an event. |
| 90–99 | Legend | Gold | Rare. Ascension territory. |

Only the 75 and 90 crossings get an animation. Everything else is a
quiet number change.

## Factions

Six proposed. The **same six recur in every run** — that fixed cast is
what lets player knowledge compound into skill by run five or six, and
it is the substitute for the free emotional weight the reference game
got from real football clubs.

| Faction | Role | Characteristic demand |
|---------|------|----------------------|
| The Ashen Covenant | Demon-pact cult | Takes apprentices; grants raw Notoriety |
| The Gilded Hand | Relic merchants | Takes followers; sells artifacts |
| The Pale Academy | Institutional wizardry; the player's alma mater | Takes reputation; offers legitimacy and shelter |
| The Verdant Choir | Druidic, hostile by default | Takes territory; blocks lair upgrades |
| The Crownlands | Hero-producing state | The prophecy's source; the decline-phase antagonist |
| The Worm Below | Subterranean horror cult | The lichdom path; takes everything |

**Every artifact belongs to a faction.** This is what converts faction
knowledge into routing decisions: once a player learns the Ashen
Covenant reliably offers the Bone Crown but demands an apprentice, they
start steering toward them deliberately. That self-imposed routing is
the behavior that produces hundred-run players.

## Artifacts

- Target **30** at launch.
- The collection grid shows all 30 slots from run one; undiscovered ones
  render as **silhouettes with the name hidden**. The visible gap is the
  point.
- Rarity mix proposal: 16 common, 10 rare, 4 legendary.
- Legendary artifacts gate the Ascension ending.

### How fast the grid actually fills — measured

`npm run sim` plays sequential careers for one player and folds each into a
persistent grid, exactly as `recordRun` does. The first measurement, before
anything was tuned for it:

| | |
|---|---|
| relics discovered per career | 1.16 |
| careers that discover nothing at all | 29.7% |
| slots filled after 40 careers | 11.8 / 30 |
| careers that add nothing new (steady state) | 80.9% |

Two things follow, and they pull in opposite directions:

1. **The gap is safe.** Nobody is completing this grid by accident; "the
   visible gap is the point" holds without any further rationing, and a change
   that fills it faster is not obviously wrong.
2. **The gap is nearly static.** A player forty careers in is still looking at
   eighteen silhouettes and adding one every six runs. Past some point a gap
   that never closes stops reading as a near-miss and starts reading as
   wallpaper.

Draws are faction-bound, which is what causes it: courting the Covenant means
re-drawing Covenant commons already in the collection. `NOVELTY_BIAS` makes a
draw prefer a relic the player has never held, WITHIN a rarity — never across
one, because rarity is what gates Ascension. It is worth what it costs
(+0.6 slots at forty careers) and it is not the lever anyone should reach for
next: **the binding constraint is how often a career draws at all** — 33
relic-granting options across 110 offers. More granting offers is the change
that would move this number.

**Update, 2026-08-27 — the lever was pulled.** Granting offers were added for
exactly this reason: a mid-run *favor* beat (one per courted faction, gated at
+30 standing) and five decline offers, several of which grant a relic. The
catalog is now 119 offers, and the same harness reports:

| | first measurement | now |
|---|---|---|
| relics discovered per career | 1.16 | ~1.66 |
| careers that discover nothing at all | 29.7% | ~17.7% |
| slots filled after 40 careers | 11.8 / 30 | ~18.6 / 30 |

`NOVELTY_BIAS` was left untouched, as above. Ascension held inside its 1–4%
band (~2.2%) because the added draws are rarity-weighted and never
uncapped-legendary — the thing that gates Ascension did not move. A second,
smaller lever came free alongside it: syncing the concordat reliquary gate to
`DEVOTION_STANDING` (both now 50; the gate had drifted to 55) lifted the share
of careers that ever hold a legendary from ~7.9% to ~11.8%.

## Offers & Events

- Target **80–120** authored offers for launch; below ~60 repetition
  becomes obvious within a session.
- Every probabilistic option **must** display its odds and both outcomes
  before the player commits. This is non-negotiable — it is the primary
  agency mechanism.
- Tone rule: **body text is comedic, effects are straight-faced.**
  "The villagers have renamed you 'That Prick From The Hill'" is the
  register. `-3 Notoriety` is not a joke.

## Naming Rules

- Wizard names: player-supplied, unvalidated except for length. Needs a
  profanity screen before any public sharing feature ships.
- Epithets: generated from the highest-magnitude deed of the run.
- Lairs: fixed authored list, tiered. Names carry the progression.

## Open Tasks

- [ ] Confirm the three-currency split survives prototype.
- [ ] Write the six faction blurbs and demand rules.
- [ ] Author 30 artifacts with faction assignment and flavor.
- [ ] Author a first 20 offers spanning both phases for the vertical slice.
- [x] Tune Notoriety tier thresholds against real run distributions. Measured 2026-08-23 against 2000 runs of the real catalog: the 0-39 / 40-59 / 60-74 / 75-89 / 90-99 bands survive measurement unchanged, and `npm run sim` now carries a target for the 40+ crossing (70-95%, currently 87.70%) alongside the 60+/75+/90+ ones it already had. The first tier crossing — the first time the rationed colour does anything — had never been measured.
- [ ] Add profanity screening before sharing ships.
