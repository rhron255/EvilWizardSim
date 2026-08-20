---
name: Systems Architecture
description: Component boundaries, state ownership, persistence strategy, and content pipeline for the web client.
---

# Systems Architecture

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Stack choice | Blocked | Proposal below; needs owner sign-off. See `index.md` Open Decisions. |
| Component map | Planned | Proposed boundaries only. |
| Persistence | Planned | `localStorage` proposed for v1. |
| Backend | Missing | Not required for v1. Share-image rendering may force the issue. |

## Design Intent

The whole game is client-side and stateless between runs except for the
collection. There is no server authority to protect because there is
nothing to cheat *for* — the collection is a personal record, not a
leaderboard. Keeping v1 backendless removes the largest source of build
and hosting risk.

## Proposed Stack

- **React + TypeScript**, single-page, no router beyond run/collection.
- **No game engine.** This is a state machine and a table; a canvas
  framework would be overhead.
- **Static hosting** (Vercel/Netlify/Pages equivalent).
- Content authored as **typed data files in-repo**, not a CMS. Volume is
  low enough (~120 offers) that a CMS adds friction without payoff.

Flagged as unconfirmed. If the team has an existing stack preference,
take it — nothing in this design depends on React specifically.

## Component Boundaries

```
<App>
├── <RunView>                  owns RunState for the active run
│   ├── <WizardHeader>         name, epithet, age, Notoriety badge,
│   │                          lifetime totals, empty trophy slot
│   ├── <Ledger>               append-only era table (the core UI)
│   ├── <OfferPanel>           2-4 choice cards; renders odds
│   ├── <ResolutionOverlay>    roll result + era summary
│   └── <ProphecyInterstitial> full-screen phase-flip set piece
├── <EndingCard>               terminal screen, share target
└── <CollectionView>           persistent artifact grid + endings seen
```

Ownership rules:
- `RunState` lives in one reducer. Every offer resolution is a single
  dispatched action producing a new `EraRecord`. Nothing else may mutate
  run state.
- `Collection` is separate, read/written only at run start and run end.
- Presentation components hold no game state.

## Event Flow

```
offer generated → player selects option → odds rolled (if any)
  → effects applied → EraRecord appended → age/phase advanced
  → ending check → next offer generated OR ending
```

The ending check runs **after** every era, not only at the age limit —
hero threat and pact debt can terminate a run mid-arc.

## Persistence

| Data | Where | When |
|------|-------|------|
| `Collection` | `localStorage` | Written at run end only |
| In-progress run | `localStorage` | Optional; see below |
| Analytics | TBD | Not specified |

**In-progress run persistence:** proposal is to save it, so a closed tab
does not destroy a 15-era run. This matters more than it appears —
losing an accumulated ledger to a browser refresh directly attacks the
sunk-cost mechanism the design depends on.

Schema versioning: store a `version` key alongside the collection from
day one. Migrating a collection is the one data loss players will
actually be angry about.

## Share Image

The end card needs to become an image. Two options:

1. **Client-side render** (`html-to-image` or canvas redraw). No backend.
   Fragile across browsers, especially mobile Safari.
2. **Server-rendered OG image.** Reliable, shareable as a link preview,
   requires a backend.

Unresolved. Option 1 for v1 is reasonable, but note that the reference
game's virality ran substantially through shared screenshots — this is
not a peripheral feature.

## Content Pipeline

- Offers, artifacts, factions, lairs, endings live as typed const arrays
  in `src/content/`.
- A validation script checks at build time: every artifact has a valid
  faction, every offer has 2–4 options, every probabilistic option has
  both success and failure effects defined.
- That validation script should exist before content authoring begins,
  not after.

## Open Tasks

- [ ] Get stack sign-off; replace the proposal above with the decision.
- [ ] Implement `RunState` reducer with full era history.
- [ ] Implement collection persistence with a version key.
- [ ] Decide share-image approach.
- [ ] Write the content validation script before catalog authoring starts.
