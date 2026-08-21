# Handoff

Point a fresh session at this file plus `CLAUDE.md`. `CLAUDE.md` carries the
rules and the ten failure modes this build has already produced — read it before
touching anything; every one of those patterns cost a real bug.

## State

**Built and playable.** `main`, 12 commits, nothing pushed. All four gates green:

```bash
npm run typecheck && npm run test && npm run lint && npm run validate:content
npm run dev        # → localhost:5173
npm run sim        # 2000-run balance report, 11/11 targets pass
```

67 tests. Every one was mutation-checked — broken deliberately to confirm it
goes red — because this repo has shipped a test that passed on `0 == 0`.

**Mobile is the target audience.** 393×852 (iPhone 14/15) is the reference
device, not a breakpoint to degrade toward.

## Verified working

- Full run: title → creation → ~15 eras → prophecy set piece → ending →
  collection. Clean playthrough at 393px and 1440px, no console errors.
- 110 offers, 30 artifacts, 6 factions, 10 lairs, 7 endings, 28 epithets.
- All seven endings reachable. Ascension 2.20%, no single ending above 45%.
- Ending card names its agent: *"AT THE HANDS OF / Halloran Greyleigh"*.
- Run screen at 393×852: first choice card at y=729, fully visible at y=826.
  **Scroll needed to reach it: 0.**

## Outstanding, in priority order

### 1. The pact still kills without warning at the moment it happens — BUG

Reported: *"I died being consumed by the pact, even though the last action I
took had nothing to do with pacts."*

**Cause.** `PACT_INTEREST` adds +1 per decline era once `pactDebt >=
PACT_INTEREST_MIN_DEBT` (`src/engine/run.ts`, in the era-end systems block). The
resolution card deliberately omits systemic effects — `appliedEffects` is only
what the *option* did — so the tick that crossed `PACT_LIMIT` and ended the run
was invisible on the very card that reported the death.

An earlier fix added a header caption (`6 / 7 · the Covenant collects this era
unless you pay`), which warns *beforehand*. It does not explain the death
*afterwards*, and the player's last action genuinely had nothing to do with
pacts, so the card reads as a non-sequitur.

**Direction.** Surface the interest tick in the resolution when it fires. This
is NOT the doom meter wiki/04 forbids — that prohibition covers announcing the
decline's notoriety erosion, which is gradual and survivable. Pact interest is
lethal, countable and player-controllable; the same reasoning already justified
the decline-phase wards readout. Consider a distinct "systemic" section on the
card so it is not confused with the option's own consequences.

Related: `sealed_in_gem` may have the same shape — check whether contagion can
push standing past the seal on an era whose card never mentioned the Academy.

### 2. A tutorial — REQUESTED, undesigned

There is none. New players meet six factions, five stats and a hidden
prophecy pivot with no onboarding.

Constraints before designing one:
- The whole run is 2–4 minutes. A tutorial that adds a minute costs a third of
  the experience.
- Reference principle 3: 2–4 tappable choices, never typing. Setup is already
  the only input-heavy moment.
- Principle 1: identity capture comes *before* any mechanic is explained.
- The stat captions and the allegiance strip already do a lot of teaching in
  place. The gap is arguably the *pivot* (prophecy) and the *fixed cast*, not
  the numbers.

Worth asking the user whether they want a first-run overlay, a guided first
run, or just better in-place affordances — this is a design decision, not an
implementation one.

### 3. Creation screen is still too long — INCOMPLETE

Reported: *"the initialization screen's starting options should be shorter."*

Measured at 393×852: `scrollHeight` **1819px = 2.13 screens**, commit button at
y=1703. The agent doing this was cut off before starting it.

Constraint: shorten prose freely, but **every option's starting modifier must
stay visible**. An origin that silently shifts faction standing is exactly the
undisclosed-consequence bug this repo keeps producing.

### 4. Unverified

- The ending screen was never checked at 1440px after the button resize.
- No component tests for `WizardHeader`, `OfferPanel`, `Ledger`, or any screen
  except `EndingScreen`.
- Relics accumulate ~1/run, so the 30-slot collection fills slowly across many
  runs. May be intended long-tail retention; never tuned deliberately.

## Architecture in one paragraph

`src/types.ts` is the frozen contract. `src/engine/` owns all run state in one
pure reducer and never imports `src/content/` — it takes a `ContentBundle`,
which is what lets `npm run sim` hold content constant. `src/components/` is
presentational; `useGame` is the only stateful thing. Balance constants live in
`src/engine/constants.ts` and nowhere else. `qa/*.mjs` are Playwright probes —
`playthrough.mjs` plays a real run and fails on console errors,
`measure-density.mjs` reports layout offsets, `probe-*.mjs` inspect specific
states.

## The one habit that mattered

Measure, then look. Every significant bug in this project was found by running
the thing and reading the numbers — not by reading the code, and not by
trusting a report. Three separate times the *instrument* was the thing that was
broken, and it confidently reported a healthy game.
