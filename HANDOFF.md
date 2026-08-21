# Handoff

Point a fresh session at this file plus `CLAUDE.md`. `CLAUDE.md` carries the
rules and the failure modes this build has already produced — read it before
touching anything; every one of those patterns cost a real bug.

## State

**Built and playable.** `main`, 21 commits, nothing pushed. All four gates green:

```bash
npm run typecheck && npm run test && npm run lint && npm run validate:content
npm run dev        # → localhost:5173
npm run sim        # 2000-run balance report, 11/11 targets pass
```

153 tests across 11 files. Every one was mutation-checked — broken deliberately
to confirm it goes red — because this repo has shipped a test that passed on
`0 == 0`, and a *validator rule* that silently checked nothing (see below).

**Mobile is the target audience.** 393×852 (iPhone 14/15) is the reference
device, not a breakpoint to degrade toward.

## Verified working

- Full run: title → creation → ~15 eras → prophecy → ending → collection. Clean
  playthrough at 393×852 and 1440×1000, no console errors.
- 110 offers, 30 artifacts (all 30 reachable), 6 factions, 10 lairs, 7 endings.
- All seven endings reachable. Ascension 2.20%, no single ending above 45%.
- Creation screen: 1424px at 393×852 = **1.67 screens** (was 2.13).
- Run screen: first choice card visible without scrolling.
- The share card renders — `node qa/shoot-share.mjs <endingId>` writes the real
  PNG. Nothing in the repo had ever looked at it before; it is a canvas, so no
  DOM screenshot shows it.

## Done since the last handoff

- **Systemic ticks are disclosed.** Pact interest and apprentice loyalty drift
  fire between eras and could end a run on a card that never mentioned them.
  `Resolution.systemic` carries them; the overlay prints them under *While you
  were elsewhere*, deliberately separated from the option's own consequences.
  The seal warning names both of its conditions.
- **First-run guide.** Three cards, once ever, over the run screen.
  `Collection.tutorialSeen`, COLLECTION_VERSION 2. It does not teach the
  prophecy — that pivot is a staged reveal and explaining it spends the set
  piece.
- **The name persists** between careers (`Collection.lastWizardName`),
  prefilled and selected.
- **The verdict is legible**: `Success` / `Failure` in display type using the
  existing up/down pair, echoed on the card edge. A win at ≤40% says *Against
  the odds*. A relic new to the collection says *Never seen before*.
- **Ascension prose** no longer describes the four-artifact rule the engine
  replaced with one; `validate:content` now fails any content string that puts
  a count in the same sentence as Ascension.
- **Share card** keeps whole sentences instead of cutting mid-clause.
- Component tests for OfferPanel, Ledger, WizardHeader, ResolutionOverlay,
  FirstRunGuide, and the `useGame` gates.

## Outstanding, in priority order

### 1. The collection barely moves — MEASURED, NOT FIXED

`npm run sim` now reports a collection curve (120 simulated players, sequential
careers, folded into one grid exactly as `recordRun` does):

```
relics discovered per career            1.16
careers discovering nothing at all     29.7%
slots filled after 40 careers       12.4 / 30
careers that add nothing new           80.2%
```

`NOVELTY_BIAS` (prefer a relic never held, within a rarity) was added and is
worth about **+0.6 slots at forty careers** — honest, and small. Do not reach
for a bigger number: **the binding constraint is that only 33 of 110 offers
grant a relic at all.** More granting options is the change that moves this.
The wiki page (`wiki/02`) carries the numbers and the reasoning.

Related open question the numbers raise: 29.7% of careers end with no relic
found at all, so those runs have nothing for the ending card's trophy case. A
per-run guarantee (like `FACTION_OFFER_GAP` guarantees faction presence) is one
option; more granting content is the other.

### 2. More "woah" moments — PARTLY ADDRESSED

Reported: *"there aren't enough 'woah, I can't believe I did this!' kinds of
events, making you feel very happy or positive about your progress."*

Done: the long-odds win, the first-ever relic, and a verdict you can read at
arm's length. Still on the table:

- The ending card never says what the career ADDED to the collection.
- A legendary relic arrives looking like a common with a different word on it.
- Ascension's near-miss (peak 75+, no ascension) is engineered and never named.
- The collection screen does not celebrate a newly filled slot on return.

### 3. The editorial pass — RULE VIOLATIONS FIXED, VOICE NOTES NOT

A full content review ran over every user-facing string. Everything in its
"rule violations" section is fixed. Its **voice** and **craft** notes were left
alone deliberately — the jokes are the author's call — but two findings there
are real and worth a decision:

- **Deed lines.** 321 options, only 44 carry authored text, and 71 of 73
  gambles have no `successText` — so ~86% of ledger rows draw on 8 stock tails,
  4 of which are near-synonyms. Rule 2 says rows that read alike mean the
  ledger has stopped saying anything. Either author ~20 `successText` lines for
  the highest-weight gambles or widen the tail pools.
- **Vocabulary drift.** The ledger header says `Artifacts` where the rest of
  the game says `relic`; `EndingSlot` maps `legendary → 'Rare'` while
  `ArtifactCard` prints `rare` raw on the same screen; `Faction.adjective` is
  authored for all six factions and read by nothing, while two other short-name
  systems exist.
- Content is en-GB throughout except ~34 strings (all 30 artifact `Defense +N.`
  lines against `stakes.ts`'s `defence`).

### 4. Unverified

- No tests for `CreationScreen`, `TitleScreen`, `CollectionScreen`,
  `ProphecyInterstitial`.
- The share card's fixed 1080×1350 canvas has variable-height sections; a run
  with many lairs AND many relics may overflow the bottom. Never measured.

## Two traps this session actually fell into

1. **`git checkout --` to undo a mutation destroys uncommitted work.** It
   silently reverted two files to HEAD mid-experiment, and the follow-up run
   then "passed" while measuring code that no longer existed. Back up with `cp`
   to `.tmp/` when mutation-testing anything not yet committed.
2. **A validator rule that matched nothing.** The first version of the
   Ascension check was a regex; it matched in a scratch script, matched nothing
   inside the validator, and reported the catalog clean while the bad string sat
   in it. Run the check against the string it exists to catch, and watch it go
   red, before believing it.

## Architecture in one paragraph

`src/types.ts` is the frozen contract. `src/engine/` owns all run state in one
pure reducer and never imports `src/content/` — it takes a `ContentBundle`,
which is what lets `npm run sim` hold content constant. Anything the engine
needs to know about the *player* (their collection, for novelty bias) is passed
into `createRun`, never read from storage. `src/components/` is presentational;
`useGame` is the only stateful thing. Balance constants live in
`src/engine/constants.ts` and nowhere else. `qa/*.mjs` are Playwright probes —
`playthrough.mjs` plays a real run and fails on console errors,
`measure-density.mjs` and `probe-creation.mjs` report layout offsets,
`shoot-share.mjs` renders the share card, `first-run.mjs` is the shared helper
that knows the tutorial is modal over the first era.

## The one habit that mattered

Measure, then look. Every significant finding this session came from running the
thing and reading the numbers: the collection curve, the 19px the seal warning
cost the first choice card, the render-phase dispatch the browser caught and
jsdom did not, and seven endings truncated mid-sentence on the card the game
exists to produce. Three separate times the *instrument* was the thing that was
broken, and it confidently reported a healthy game.
