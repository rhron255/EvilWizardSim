# Evil Wizard Simulator

A short-session browser game. You build the career of an evil wizard, one era
at a time, from hedge-sorcerer to whatever you end up as. One run takes two to
four minutes and produces a permanent, shareable record of that wizard's life.

It is designed to be replayed dozens of times.

## The shape of a run

```
CREATION → ASCENT → [the prophecy] → DECLINE → ENDING → COLLECTION
```

You name a wizard, pick an origin, and then make roughly fifteen decisions.
Each one appends a row to a ledger that never resets. Partway through, a
prophecy fires: a chosen one is born, and the run flips from chasing upside to
defending what you built.

There is **no fail state**. Every ending is a biography. A wizard who dies
obscure in a swamp at two hundred still produced a story.

It is built **mobile-first**: 393x852 is the reference device, not a
breakpoint to degrade toward.

## Design rules that are load-bearing

These look like arbitrary restrictions during implementation. They are not —
they come from analysis of a game that worked at scale, recorded in
`wiki/06_reference_analysis.md`. Read that before relaxing any of them.

- **Odds are always printed before the commit.** Every gamble shows its
  probabilities and both outcomes up front. No hidden rolls, no undisclosed
  downside. This is enforced by the type system, not by convention — see
  `src/types.ts`. The rule outlives the card: a counter that can end the run
  on its own — apprentice loyalty drift — is named on the resolution that
  reports the era, under *While you were elsewhere*, and every header stat
  prints its threshold and its distance. Pact debt has no such tick: it moves
  only on cards you accepted, and the pressure comes from the Covenant's
  offers surfacing more often the more you owe.
- **The ledger appends, never resets.** By the late run you are looking at a
  table with fifteen eras in it, and that is what makes quitting expensive.
- **One scarce color.** The palette is a near-monochrome warm dark. The only
  chromatic *reward a run pays out* is the Notoriety tier badge. Two semantic
  accents exist and are spent nowhere else: the red/green pair an offer card
  already uses for `+8` and `-12`, which the faction standing bars now inherit
  rather than inventing a vocabulary of their own. Endings additionally unlock
  cosmetic **themes** — chosen by the player between runs, never handed out
  mid-career, and forbidden from touching the tier colour.
- **Comedy in the text, never in the numbers.** Flavor text is funny; stat
  changes are straight-faced.
- **No doom meter.** The decline works because a number is quietly going the
  wrong way, not because it is announced. The erosion stays unnarrated; the
  lethal counters do not. The prophecy hands off with one line — the hero
  becomes a number that climbs — and the wards readout names the threshold,
  the rate, and what the lair is contributing to it.

## Development

```bash
npm install
npm run dev              # dev server → http://localhost:5173
npm run build            # typecheck + production build
npm run typecheck        # tsc -b --noEmit
npm run test             # vitest, single pass
npm run lint             # eslint, zero warnings tolerated
npm run validate:content # faction refs, option counts, disclosed effects
npm run sim              # headless balance harness over N runs
```

The correctness gate for a change is **`npm run typecheck`, `npm run test` and
`npm run lint`**, all three. Content changes additionally need
`npm run validate:content`. Balance changes need `npm run sim`.

## Layout

| Path | Owns |
|---|---|
| `src/types.ts` | The frozen contract every other module is written against. |
| `src/theme/` | Design tokens. Never hardcode a hex in a component. |
| `src/engine/` | Run state, offer generation, resolution, persistence. |
| `src/content/` | Factions, artifacts, lairs, origins, endings, offers. |
| `src/components/` | Presentational only. No game state. |
| `src/screens/` | Screen-level composition. |
| `scripts/` | Content validation and the balance simulator. |
| `wiki/` | The design wiki. Intent and rationale, not API docs. |

## Attribution

The reward structure is modelled on **ליגיונר** (legionnaire.xyz) by Gal Bartov.
What is reproduced here is a structure, not content, naming, or visual identity.
`wiki/06_reference_analysis.md` records what was taken and what does not transfer.
