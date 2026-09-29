---
name: Systems Architecture
description: Component boundaries, state ownership, persistence strategy, and content pipeline for the web client.
---

# Systems Architecture

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Stack choice | Decided | React + TypeScript + Vite, no router, no backend. The proposal below was adopted unchanged. |
| Component map | Built | The tree below is the **original** proposal; the shipped one is under "As built". |
| Persistence | Built | `localStorage`, versioned and migrated (`src/engine/persistence.ts`). |
| Backend | None | Not needed. The share image is rendered client-side to a canvas. |

## Design Intent

The whole game is client-side and stateless between runs except for the
collection. There is no server authority to protect because there is
nothing to cheat *for* — the collection is a personal record, not a
leaderboard. Keeping v1 backendless removes the largest source of build
and hosting risk.

## Stack (as adopted)

- **React + TypeScript**, single-page, no router beyond run/collection.
- **No game engine.** This is a state machine and a table; a canvas
  framework would be overhead.
- **Static hosting** (Vercel/Netlify/Pages equivalent).
- Content authored as **typed data files in-repo**, not a CMS. Volume is
  low enough (~120 offers) that a CMS adds friction without payoff.

Nothing in this design depends on React specifically, and the engine
(`src/engine/`) does not import it.

## Component Boundaries (original proposal)

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

### As built

```
<App>                     routes `useGame`'s screen to a component; holds no state
├── <TitleScreen>         + <ChangelogPopup> on launch (issue #67)
├── <CreationScreen>      name · epithet · origin · length
├── <RunScreen>           ONE continuous column, no tabs (issue #36)
│   ├── <Masthead>            name, era, lair, Notoriety badge, Ascension trophy
│   ├── <FactionStandings>    the six standings, collapsed to the two most extreme
│   ├── <DecisionPanel>       threat lines, resources, wards readout, <OfferPanel>
│   │   └── <OptionCard>      the card that prints the odds and what the engine WILL do
│   ├── <RelicPage>           swapped in for the decision, one tap away (issue #78)
│   ├── <ResolutionOverlay>   the roll, the verdict, the consequences
│   └── <FirstRunGuide>       three cards, once ever
├── <ProphecyInterstitial>    the phase-flip set piece
├── <EndingScreen>            the shareable card; `shareImage.ts` paints it to a canvas
├── <NecrolexiconScreen>      the in-game wiki: relics, endings, mechanics (issue #66)
├── <ThemeScreen>             cosmetic themes, one per ending (issue #15)
└── <ChangelogScreen>         what changed, from `src/content/changelog.ts`
```

The scroll position is the document's, so `App` resets it on every screen
change and `RunScreen` resets it when an era's resolution is dismissed.

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
| `Collection` | `localStorage` (`evil-wizard-sim:collection`) | Written at run end and on theme/tutorial changes |
| In-progress run | `localStorage` (`evil-wizard-sim:run`) | Saved every era; cleared at the ending |
| Changelog acknowledgement | `localStorage` (`evil-wizard-sim:changelog-ack`) | On dismissing the launch popup |
| Analytics | none | Not collected |

**In-progress run persistence** is built, so a closed tab does not destroy a
15-era run (`RUN_SAVE_VERSION`; a save from a different version is
discarded, and a shape check backs the version check). This matters more than it appears —
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

**Resolved: option 1.** `shareImage.ts` paints a 1080×1350 canvas and hands
the PNG to `navigator.share` where the platform supports files, else
downloads it. It has only been rendered in desktop Chromium by the repo's own
probes — see `00_tasks-1.md`. Link previews (as opposed to the image the
player shares) use static Open Graph tags and `public/og.png`.

## Content Pipeline

- Offers, artifacts, factions, lairs, endings live as typed const arrays
  in `src/content/`.
- A validation script checks at build time: every artifact has a valid
  faction, every offer has 2–4 options, every probabilistic option has
  both success and failure effects defined.
- That validation script should exist before content authoring begins,
  not after.

## Open Tasks

- [x] Stack sign-off.
- [x] `RunState` reducer with full era history.
- [x] Collection persistence with a version key.
- [x] Share-image approach.
- [x] Content validation script (`npm run validate:content`).
- [ ] Render the share image on real mobile Safari and Android Chrome.
