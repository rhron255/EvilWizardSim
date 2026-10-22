import type { Hex } from '../types';

/**
 * Opt-in handicaps (issue #124). Name: "hex" — no other player-facing text in
 * `src/content` uses the word (checked when it was chosen).
 *
 * Each is a few ordinary `Effect`s applied once at creation, after the
 * origin, so the creation screen can print them with `formatEffect` and every
 * number lands in the header. Single-select only: the balance harness plays
 * one cohort per hex, not every combination.
 *
 * Measured against the base population (seed 1, before these shipped): slain
 * 42.45%, Ascension 1.10%, age limit 30.4%. The candidates that failed rule 6
 * ("a hex may make an ending harder, never impossible") are not here: -15
 * standing with every faction left Ascension at 0.05%, and an earlier
 * prophecy would have announced the decline (rule 5).
 *
 * What a hex may never do is held by the type (`HexEffect` excludes `ending`,
 * `becomeLich`, `vowGoodWizard`, `goodAct`, `illAct`) and by
 * `validate:content`.
 */
export const hexes: Hex[] = [
  {
    id: 'empty_handed',
    name: 'Empty-Handed',
    rule: 'Your origin keeps the robes and loses the relic.',
    effects: [{ t: 'loseArtifact' }],
  },
  {
    id: 'file_is_open',
    name: 'The File Is Open',
    rule: 'The Crownlands started a file on you before you started a career.',
    effects: [{ t: 'heroThreat', v: 12 }],
  },
  {
    id: 'twice_inherited',
    name: 'Twice Inherited',
    rule: 'The creditors found a second ledger in the walls.',
    effects: [{ t: 'pactDebt', v: 2 }],
  },
];
