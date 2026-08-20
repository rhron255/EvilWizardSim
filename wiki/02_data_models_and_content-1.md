---
name: Data Models & Content
description: Schemas for run state, eras, factions, artifacts and offers, plus balance tables and content catalog targets.
---

# Data Models & Content

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Schemas | Planned | Drafted below; not implemented or reviewed. |
| Notoriety tiers | Planned | Thresholds are starting guesses. |
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

Drives the badge color — the game's only rationed visual reward. Copy is
placeholder.

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
- [ ] Tune Notoriety tier thresholds against real run distributions.
- [ ] Add profanity screening before sharing ships.
