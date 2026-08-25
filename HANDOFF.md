# Handoff

Point a fresh session at this file plus `CLAUDE.md`. `CLAUDE.md` carries the
rules and the failure modes this build has already produced — read it before
touching anything; every one of those patterns cost a real bug.

## State

**Built and playable.** `main`, 21 commits, nothing pushed. All four gates green:

```bash
npm run typecheck && npm run test && npm run lint && npm run validate:content
npm run dev        # → localhost:5173
npm run sim        # 2000-run balance report, 13/13 targets pass
```

219 tests across 17 files. Every one was mutation-checked — broken deliberately
to confirm it goes red — because this repo has shipped a test that passed on
`0 == 0`, and a *validator rule* that silently checked nothing (see below).

**Mobile is the target audience.** 393×852 (iPhone 14/15) is the reference
device, not a breakpoint to degrade toward.

## Verified working

- Full run: title → creation → ~15 eras → prophecy → ending → collection. Clean
  playthrough at 393×852 and 1440×1000, no console errors.
- 110 offers, 30 artifacts (all 30 reachable), 6 factions, 10 lairs, 7 endings.
- All seven endings reachable. Ascension 1.50%, no single ending above 45%.
  Lichdom went 0.25% -> 0.80% by raising the rite offer's weight: a dedicated
  seeker met its standing gate in 61% of careers but was shown the card in only
  19.9% of those, so the branch was a lottery rather than the "live decision"
  wiki/01 § 7 asks for.
- Creation screen: 1424px at 393×852 = **1.67 screens** (was 2.13).
- Run screen at 393×852: the first choice card is fully on screen in every era
  measured (115/115 across eight careers), starting at worst 678px of 852px.
  Two options are fully visible in ~63% of eras. Getting the whole card list
  above the fold is NOT achievable — the header and ledger sit above the cards
  by design (rule 2) and cost ~570px before a card is reached.
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

### 1. The collection — FIXED

The binding constraint was content, exactly as the previous measurement said:
only 28 of 110 offers granted a relic at all. Ten offers gained a grant,
weighted toward `decline` and the Pale Academy (2 granting offers out of 13,
despite being the seal faction players court most warily).

```
mean relics discovered per career   1.11 -> 1.51
careers discovering nothing        31.4% -> 21.6%
slots filled after 10 careers    6.7/30  -> 9.8/30
median careers to half the grid      58  -> 25
```

All thirteen sim targets held. The remaining lever, if it is ever wanted, is
more granting content — `NOVELTY_BIAS` is still worth only ~+0.6 slots at forty
careers and should not be reached for.

### 2. "Woah" moments — FIXED

- **The gamble verdict now waits for the roll.** The card used to finish
  revealing `Success`/`Failure` at 320ms while the needle landed at 720ms — it
  announced the result and then invited you to watch a marker slide to a
  position whose meaning was already spent. The needle now runs first (900ms,
  decelerating), the word and the colour land on the settle at ~1080ms, and
  the consequences follow. Measured settle ~1268ms; **every screenshot probe's
  wait was raised past it**, which is the thing to remember if a capture ever
  looks half-empty again.
- **The whole card carries the outcome.** It was the word plus a top border;
  it is now a ring, a ground wash, a glow and the rail, all off one
  `--ew-verdict` property. Deterministic eras stay grey.
- **Legendary relics stop reading like commons.** The old ladder was a
  2.8%-alpha hatch and a font-weight step at identical geometry. Now: frame
  weight, elevation, glyph size, type scale, corner marks — plus a gold edge on
  the four legendaries, pinned to `--ew-legendary` rather than `--ew-tier`,
  because the tier colour is set per-run and a legendary won at low Notoriety
  would have drawn its edge in the Unknown tier's grey. Applied to the
  acquisition row in `ResolutionOverlay` too, which had no rarity signal at all.
- **The ending card says what the career added.** From
  `run.knownArtifactIds` — the pre-run snapshot — never from the live
  collection, which `recordRun` has already updated by the time that screen
  mounts. Reaching for the collection there reports zero forever AND typechecks;
  `EndingScreen.test.tsx` pins both failure directions.
- **The hero's approach is dramatised.** A rail in the header showing the
  distance closing, plus up to three narrative beats fired off `heroBand` —
  the same function the rail reads, so the fiction and the bar cannot disagree.
- **Pact interest has a face.** `+1 Pact Debt` still leads the row; the
  Covenant's visit is the note beside the denominator. The first attempt put
  the prose in the emphasised slot and demoted a lethal counter's label — the
  tests that exist because someone died at 6/7 caught it.

Still open: the Ascension near-miss is deliberately NOT named (considered and
rejected — the mystery is the point), and the collection screen still does not
celebrate a newly filled slot on return. The latter needs a persisted field and
a `COLLECTION_VERSION` bump for a small payoff; the pre-run snapshot is gone by
the time that screen mounts.

### 3. The editorial pass — RULE VIOLATIONS FIXED, VOICE NOTES NOT

A full content review ran over every user-facing string. Everything in its
"rule violations" section is fixed. Its **voice** and **craft** notes were left
alone deliberately — the jokes are the author's call — but two findings there
are real and worth a decision:

- ~~**Deed lines.**~~ FIXED for the rows that matter: 24 `successText` lines
  were authored on the highest-weight gambles (73 gambles had **two** between
  them). Authoring beats widening the tail pool because only authored text adds
  information — the tail is three words carrying none. The long tail of
  low-weight gambles still falls through to the stock pool, which is the right
  place to stop.
- **Vocabulary drift.** Partly fixed: `EndingSlot` now grades endings
  `Ordinary / Storied / Fabled` and a locked slot reads `Unopened` with a hint,
  so it no longer collides with the relic grid's raw rarity words. Still open —
  the ledger header says `Artifacts` where the rest of the game says `relic`,
  and `Faction.adjective` is authored for all six factions and read by nothing.
- Content is en-GB throughout except ~34 strings (all 30 artifact `Defense +N.`
  lines against `stakes.ts`'s `defence`).

### 4. Unverified

- ~~No tests for `CreationScreen`, `TitleScreen`, `CollectionScreen`,
  `ProphecyInterstitial`.~~ All four now covered — 219 tests across 17 files.
  Every new assertion was mutation-tested. `ProphecyInterstitial` uses the
  `matchMedia` reduced-motion stub rather than fake timers, which remains the
  house pattern.
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
