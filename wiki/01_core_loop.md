---
name: Core Loop
description: Run lifecycle from creation to ending — era structure, phase transitions, choice presentation, and terminal states.
---

# Core Loop

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Run lifecycle | Planned | Structure below is proposed, unvalidated. |
| Era count / pacing | Planned | 16–20 eras targeting 2–4 min; needs playtest tuning. |
| Phase transition | Planned | Prophecy trigger point is a guess. |
| Endings | Planned | Seven proposed; none implemented. |

## Design Intent

One run is a compressed biography. The player makes roughly 15–20
decisions, each taking a few seconds, and arrives at a death card that
summarizes a life. The loop must be short enough that "one more run"
costs less than the curiosity it provokes.

## Run Lifecycle

```
CREATION → ASCENT PHASE → [prophecy triggers] → DECLINE PHASE → ENDING → COLLECTION
```

### 1. Creation (one screen, ~15 seconds)

Identity capture happens **before any mechanic is explained**. Everything
afterward happens to something the player named.

Fields:
- **Wizard name** (text input, required) — rendered large on a sigil.
- **Epithet** — chosen from 3–4 options, or auto-assigned later by deeds.
- **Origin** — 3 options, each a light starting modifier and a tone-setter
  (e.g. *expelled from the Pale Academy*, *self-taught in a bog*,
  *inherited a tower and its debts*).
- **Run length** — 2–4 options mirroring the reference game's season
  selector. Controls era count, not difficulty.

No stat allocation. No sliders. Setup is the only text-input moment in
the entire run.

### 2. Era Structure

An **era** is the unit of progression. Each era:

1. Presents **2–4 tappable choice cards**. Never more than four. Never
   requires typing.
2. Resolves the choice — instantly if deterministic, with a printed
   probability roll if not.
3. **Appends a row to the ledger** (see below).
4. Advances age and re-evaluates phase state.

Proposed: **5 in-world years per era**, starting age 20, 16–20 eras per
run. Wizard lifespans are long enough that this stays plausible while
keeping the row count visually satisfying.

### 3. The Ledger

The single most important UI element. A table that grows downward, one
row per era.

Columns: `Age | Lair | Notoriety | Followers | Artifacts | Deeds`

Rules:
- **Append only.** Rows are never removed or rewritten.
- Notoriety renders as a colored badge per tier (see
  `02_data_models_and_content.md`).
- The current era's row is highlighted; prior rows dim slightly with age.
- A shared masthead — not the ledger's own header — shows lifetime totals
  and, critically, an **empty trophy slot** for the run's unattainable
  prize, visible from the first era to the last.

**Revised for issue #18, then issue #36.** This section originally called the
ledger "always visible above the choice cards", on a single stacked screen.
Issue #18 split the run screen into a Decision tab (the choice cards, plus
the ambient stakes a player needs to choose) and a Career tab (the ledger,
full faction standing, full stats), because the stacked layout pushed the
cards themselves below the fold on a phone. Issue #36 removed that split
again and, with it, the ledger from the run UI entirely: the six faction
standings moved to sit directly below the masthead instead, and the decision
content renders below them on the one screen that exists now. The ledger as
described above is no longer part of the run screen; `RunState.eras` still
carries the same per-era record underneath, but nothing currently renders it
as a table.

### 4. Ascent Phase

Roughly the first 55–60% of eras. Offers skew toward upside: new lairs,
pacts, apprentices, artifact opportunities, faction alliances. Notoriety
generally climbs. The player is building.

### 5. Prophecy Trigger

A single scripted event around era 9–11 (proposed) that flips the run's
motivational mode. A chosen one is born. From this point:

- Notoriety decay begins (see `04_operational_behaviors.md`).
- Hero-threat offers begin appearing and escalate.
- Offer text shifts from acquisition to protection.

This transition must be **loud** — a full-screen interstitial, not a card.
It is the pivot the whole design rests on.

### 6. Decline Phase

The remaining eras. The player is defending: Notoriety erodes each era,
heroes escalate, factions defect. Offers are now largely damage control
with occasional high-variance gambles to reverse the slide.

**Design note:** the reference game's decline was the most emotionally
effective stretch of a run precisely because it was *not* signposted as
a losing phase — it was just a stat quietly going the wrong way. Resist
the urge to add a doom meter.

### 7. Endings

Reached by age limit, by hero, or by a branch the player chose. Proposed
set:

| Ending | Trigger | Notes |
|--------|---------|-------|
| Slain by the Chosen One | Hero threat exceeds defense | Default failure-shaped ending. Still narrated as a life. |
| Sealed in a Gem | Specific faction outcome | Recoverable in flavor; hints at a future run. |
| Betrayed by an Apprentice | High apprentice count, low loyalty | Comedic potential. |
| Lichdom | Player-chosen branch, high cost | See below. |
| Retired to a Swamp | Survive to age limit, low Notoriety | The anticlimax ending. Must still feel like a story. |
| Consumed by the Pact | Demon-pact debt unpaid | High-variance play punished. |
| Ascension | Rare; requires the run's top prize | The near-miss target. Should be genuinely uncommon. |

**Amended by issue #14 — the seal was one of six.** "Sealed in a Gem" reads
above as a *specific* faction outcome, and that was the problem: faction
standing is the most-touched system in the game and reached exactly one
ending, so five of the six factions were a shop rather than a life. The same
trigger — standing at or under `SEAL_MAX_STANDING`, notoriety at or over
`SEAL_MIN_NOTORIETY` — now reads against all six, and each faction has its own
idea of what to do about you.

| Faction | Reprisal |
|---|---|
| Ashen Covenant | Eternally Repurposed |
| Gilded Hand | Liquidated |
| Pale Academy | Sealed in a Gem *(unchanged)* |
| Verdant Choir | Turned to Fertilizer |
| Crownlands | Exiled and Overrun |
| Worm Below | Consumed |

The trigger itself was deliberately **not** retuned when the five were added.
For a time, only the Academy's fired in any phase, as it always had; the other
five were decline-only, so an ascent dip could not end a career before the
prophecy the arc rests on.

**Amended — the decline-only gate is gone; all six are now uniform.** Reported
from play: a wizard survived at −66 Verdant Choir standing (well past
`SEAL_MAX_STANDING`) and 66 Notoriety (well past `SEAL_MIN_NOTORIETY`) simply
because the prophecy card had not fired yet, which read as a bug from the
player's seat — a threshold that is disclosed on the bar (`allegiances.ts`)
but silently does not apply is the same undisclosed-exception shape as failure
mode 1, just pointed the other way: not a hidden downside, a hidden immunity.

The decline-only reasoning was never applied to the Academy's own case, which
has fired in *every* phase since it was the only reprisal in the game and
nobody found that unfair — the Academy is not a special case that survived
unscathed, it is the ORIGINAL rule, and the other five were the ones carrying
an exception nothing about the mechanic itself justifies. Six factions with
one condition should not read five ways one direction and the sixth a
different way; uniform is the correct reading of "all six carry the same
condition" (issue #14's own framing), so `reprisalLiveFor` and the `'live'` /
`'any'` scan split it fed (`nearestReprisalFaction`, `reprisalWarningFor` vs
`nextThreatFor`) are gone. Every reprisal now fires the moment its two numbers
cross, in the ascent exactly as in the decline — see
`src/engine/endings.ts`'s `nearestReprisalFaction`.

One real consequence: `FactionStandings`'s own second alarm line
(`reprisalWarningFor`) existed only to warn about a faction *other than* the
one `DecisionPanel`'s ambient line was already naming, which could happen only
while the two scans disagreed on which faction was live. With one uniform
scan, they can no longer disagree, so that second alarm was dead code the
moment the gate came out and was removed rather than left unreachable — see
`allegiances.ts`.

This reopens the balance question issue #14 deferred: `npm run sim`'s FACTION
REPRISALS table will read differently once the five ascent-phase deaths are
possible again, and the population shares recorded elsewhere in this document
predate the change. Re-run the harness before citing any of those numbers as
current. The leadership half of the same issue — devotion, rather than
enmity — is a separate mechanic and was not touched by this.

**Lichdom is an ending, not a prize.** It is the branch that cheats the
decline phase — the lich's Notoriety does not decay. The cost must be
real and mechanical, not flavor: proposal is that the lich forfeits all
held artifacts and all followers desert. This makes it a live decision
rather than a strict upgrade.

**Amended by issue #14 slice 5 / issue #23 — a thirteenth, obscure ending.**
The Good Wizard is reached by a career of consistently constructive choices
— blessing a harvest, fixing a mill, resolving a haunting by talking to the
ghost instead of binding it — counted by two hidden run-scoped counters
(`goodActs`/`illActs`) that are never shown on screen, the one deliberate
exception to this document's odds-disclosure rule (see CLAUDE.md's amendment
to failure mode 1). The exception holds only because the route is purely
additive: it can add this ending at the age limit, ahead of Lichdom, and
cannot end a run early, close off any other ending, or move any other
threshold. Like Lichdom, it is player-chosen rather than triggered by a
faction or a stat crossing a threshold — three phases of offers (constructive
choices scattered through the catalog, then a reputation shift once enough
have accumulated, then a closing card that commits to it) rather than one.

### 8. Ending Card & Collection

The terminal screen must be screenshot-worthy without prompting:
- Wizard name, final epithet, lifespan, ending type.
- Lifetime totals.
- A **grid of lairs held**, one card each — the reference game's club
  grid was the single most-shared element.
- Artifacts recovered this run.
- Buttons: share image, view collection, play again.

The **collection** persists across runs and is specified in
`02_data_models_and_content.md`. It is the primary long-term retention
mechanism.

## Open Tasks

- [ ] Prototype the ledger with placeholder rows and confirm it is
      compelling before any content is written.
- [ ] Playtest era count against the 2–4 minute target; tune.
- [ ] Determine prophecy trigger era by playtest, not by theory.
- [ ] Write the prophecy interstitial as a set piece.
- [ ] Verify every ending reads as a story, including the swamp.
