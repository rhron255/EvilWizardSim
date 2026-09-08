/**
 * Why one faction is harder to fall out with than another.
 *
 *   npx tsx qa/probe-standing-routes.ts
 *
 * Counts, per faction, every route its standing can move on, separated by
 * direction and by whether it is direct or contagion. It exists because the
 * obvious explanation for `liquidated` being the rarest ending in the game —
 * "the Gilded Hand has the fewest offers" — is measurably wrong, and was
 * written into three files before anyone counted.
 *
 * What it found (issue #14, slice 1):
 *
 *   faction        own  haters   down     up  up/down   reprisal reached
 *   crownlands      15       2    874    315     0.36   46% of its cohort
 *   pale_academy    15       3    781    478     0.61   17.6% population
 *   verdant_choir   13       1    381    288     0.75   10.5%
 *   worm_below      13       2    427    536     1.25    4.0%
 *   ashen_covenant  24       2    503    602     1.20    3.5%
 *   gilded_hand     12       1    269    254     0.94    1.0%
 *
 * The Covenant has TWICE the Hand's cards and is nearly as unreachable,
 * because its cards push its standing up: +203 across the ascent and +86 from
 * the pact economy, which pays in Covenant goodwill. The Choir has the same
 * single hater and about the same card count as the Hand and is ten times
 * more reachable. So the predictor is the DIRECTION of the authored effects,
 * with absolute volume as a second term — and the Hand has the least standing
 * movement of any faction in the catalog, which is what leaves it hovering
 * near zero for a whole career.
 *
 * Both terms compound sharply because −55 is a tail event: a thirty per cent
 * shortfall in available pressure becomes a tenfold difference in rate. Do not
 * read the columns below as linear.
 *
 * The mirror of this is what the leadership half of issue #14 needs — the same
 * table read up the page — so this measures both directions.
 */
import { factions, offers } from '../src/content';
import { CONTAGION_GAIN, CONTAGION_LOSS } from '../src/engine/constants';
import type { Effect, FactionId, OfferOption } from '../src/types';

const hatedBy = new Map<FactionId, FactionId[]>(
  factions.map((f) => [f.id, factions.filter((g) => g.hostileTo.includes(f.id)).map((g) => g.id)]),
);

const standingOf = (fx: readonly Effect[], id: FactionId) =>
  fx
    .filter((e): e is Extract<Effect, { t: 'standing' }> => e.t === 'standing' && e.factionId === id)
    .reduce((a, e) => a + e.v, 0);

const ev = (o: OfferOption, f: (fx: readonly Effect[]) => number) =>
  o.kind === 'certain' ? f(o.effects) : o.odds * f(o.onSuccess) + (1 - o.odds) * f(o.onFailure);

type Row = {
  id: FactionId;
  ownOffers: number;
  haters: number;
  /** Options that move the faction DOWN directly, and by how much in total. */
  downN: number;
  downSum: number;
  /** Options that move it UP directly. The pariah declines these, but they are
   *  also what a NEUTRAL career keeps doing to it by accident. */
  upN: number;
  upSum: number;
  /** Options that move it down through contagion (a gain for a hater). */
  spillN: number;
  spillSum: number;
  /** ...and up through contagion (a loss for a hater). */
  spillUpN: number;
  spillUpSum: number;
  /** Offers where EVERY option leaves it at or above where it started. */
  noWayDown: number;
};

const rows: Row[] = factions.map((f) => {
  const row: Row = {
    id: f.id,
    ownOffers: offers.filter((o) => o.factionId === f.id).length,
    haters: (hatedBy.get(f.id) ?? []).length,
    downN: 0,
    downSum: 0,
    upN: 0,
    upSum: 0,
    spillN: 0,
    spillSum: 0,
    spillUpN: 0,
    spillUpSum: 0,
    noWayDown: 0,
  };

  for (const offer of offers) {
    let anyDown = false;
    for (const option of offer.options) {
      const direct = ev(option, (fx) => standingOf(fx, f.id));
      let spill = 0;
      for (const hater of hatedBy.get(f.id) ?? []) {
        const v = ev(option, (fx) => standingOf(fx, hater));
        spill += v * (v > 0 ? CONTAGION_GAIN : CONTAGION_LOSS);
      }
      if (direct < 0) {
        row.downN++;
        row.downSum += direct;
      }
      if (direct > 0) {
        row.upN++;
        row.upSum += direct;
      }
      if (spill > 0) {
        row.spillN++;
        row.spillSum += spill;
      }
      if (spill < 0) {
        row.spillUpN++;
        row.spillUpSum += spill;
      }
      if (direct - spill < 0) anyDown = true;
    }
    if (!anyDown) row.noWayDown++;
  }
  return row;
});

const pad = (s: string | number, n: number) => String(s).padStart(n);
console.log(
  'faction          own  haters   down  downSum     up    upSum   spill  spillSum          net',
);
for (const r of rows) {
  // Net authored pressure across the WHOLE catalog, not per option: every
  // downward route (direct negatives and gains for a hater) against every
  // upward one. Negative means the catalog, played adversarially, can take
  // this faction down; positive means it hands more back than it takes.
  const net = r.downSum - r.spillSum + r.upSum - r.spillUpSum;
  console.log(
    `${r.id.padEnd(16)}${pad(r.ownOffers, 4)}${pad(r.haters, 8)}${pad(r.downN, 7)}${pad(
      r.downSum.toFixed(0),
      9,
    )}${pad(r.upN, 7)}${pad(r.upSum.toFixed(0), 9)}${pad(r.spillN, 8)}${pad(
      r.spillSum.toFixed(0),
      10,
    )}${pad(net.toFixed(0), 13)}`,
  );
}

console.log('\nUP:DOWN ratio of authored magnitude (direct + contagion):');
for (const r of rows) {
  const down = Math.abs(r.downSum) + r.spillSum;
  const up = r.upSum + Math.abs(r.spillUpSum);
  console.log(
    `${r.id.padEnd(16)} down ${pad(down.toFixed(0), 5)}   up ${pad(up.toFixed(0), 5)}   up/down ${(
      up / down
    ).toFixed(2)}`,
  );
}
