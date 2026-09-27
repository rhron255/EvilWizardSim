/**
 * A reprisal takes TWO numbers, and the header used to name one — for one
 * faction, out of six that now carry the same condition.
 *
 * `sealed_in_gem` fires at Pale Academy standing ≤ SEAL_MAX_STANDING *and*
 * notoriety ≥ SEAL_MIN_NOTORIETY. A wizard already past the standing half read
 * "The Pale Academy is done deliberating." and could then be ended by a card
 * that granted Notoriety and never mentioned the Academy — the fame half of the
 * trigger was never printed anywhere, so the choice that armed it looked free.
 *
 * Issue #14 gave the other five factions the same condition, which is why the
 * "marks the gem on the Academy bar and nowhere else" case below is now the
 * opposite assertion: five bars carrying a lethal threshold with no tick on
 * them would be that same bug, five times.
 */
import { describe, expect, it } from 'vitest';
import {
  DEVOTION_STANDING,
  PATRON_MARGIN,
  REPRISAL_BY_FACTION,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
} from '../../engine';
import type { FactionId, Phase, RunState } from '../../types';
import { factions } from '../../content';
import { allegiancesFor, extremeAllegiances, nextThreatFor, patronFor, reprisalSentence } from './allegiances';

const run = (
  standing: number | Partial<Record<FactionId, number>>,
  notoriety: number,
  phase: Phase = 'decline',
): RunState =>
  ({
    phase,
    erasSinceProphecy: phase === 'decline' ? 1 : 0,
    factionStanding: {
      ashen_covenant: 0,
      gilded_hand: 0,
      pale_academy: 0,
      verdant_choir: 0,
      crownlands: 0,
      worm_below: 0,
      ...(typeof standing === 'number' ? { pale_academy: standing } : standing),
    },
    notoriety,
  }) as RunState;

const sentence = (standing: number, notoriety: number, phase: Phase = 'decline') =>
  reprisalSentence(nextThreatFor(run(standing, notoriety, phase))!);

describe('the next-threat sentence', () => {
  it('names the fame that arms it, when fame is the half still missing', () => {
    const line = sentence(SEAL_MAX_STANDING, 20);
    expect(line).toContain(String(SEAL_MIN_NOTORIETY));
    expect(line).toMatch(/Notoriety/);
  });

  it('names the distance in standing while standing is the half still missing', () => {
    expect(sentence(SEAL_MAX_STANDING + 9, SEAL_MIN_NOTORIETY - 5)).toContain('9 from the gem');
  });

  it('says the deliberating is over once standing is past the line', () => {
    expect(sentence(SEAL_MAX_STANDING - 4, 90)).toContain('done deliberating');
  });

  it('stops asking for fame once the wizard already has it', () => {
    const line = sentence(SEAL_MAX_STANDING, SEAL_MIN_NOTORIETY);
    expect(line).toContain('your fame qualifies');
    expect(line).not.toContain(String(SEAL_MIN_NOTORIETY));
  });
});

/**
 * Five factions arrived with the same lethal condition and no sentence.
 *
 * Each of these is the Academy's own case, moved one faction over: the header
 * has to name the faction that would actually act, in that faction's own
 * imagery, or a player driven under the Choir reads a warning about a gem.
 */
describe('the next-threat sentence · all six factions', () => {
  const factions: FactionId[] = [
    'ashen_covenant',
    'gilded_hand',
    'pale_academy',
    'verdant_choir',
    'crownlands',
    'worm_below',
  ];

  it('names whichever faction is closest, not only the Academy', () => {
    for (const id of factions) {
      const threat = nextThreatFor(run({ [id]: SEAL_MAX_STANDING + 6 }, SEAL_MIN_NOTORIETY));
      expect(threat, `no threat for ${id}`).not.toBeNull();
      expect(threat!.factionId).toBe(id);
    }
  });

  it('gives each faction its own noun, so no two reprisals read alike', () => {
    const lines = factions.map((id) =>
      reprisalSentence(nextThreatFor(run({ [id]: SEAL_MAX_STANDING + 6 }, SEAL_MIN_NOTORIETY))!),
    );
    expect(new Set(lines).size).toBe(factions.length);
    // The Academy's own wording is the one that must not have moved: it is the
    // line `qa/probe-seal-fit.mjs` measured the one-line budget against.
    expect(lines[2]).toBe('The Academy is 6 from the gem · your fame qualifies.');
  });

  it('holds every variant to the length the Academy line established', () => {
    // Not a layout measurement — the browser probe is that. This is the cheap
    // guard that a new faction noun cannot quietly double the sentence.
    for (const id of factions) {
      for (const standing of [SEAL_MAX_STANDING + 6, SEAL_MAX_STANDING - 1]) {
        for (const notoriety of [SEAL_MIN_NOTORIETY, SEAL_MIN_NOTORIETY - 6]) {
          const line = reprisalSentence(nextThreatFor(run({ [id]: standing }, notoriety))!);
          expect(line.length, line).toBeLessThanOrEqual(60);
        }
      }
    }
  });

  it('names the faction the ENGINE would fire, when two are under at once', () => {
    // Contagion puts two factions under the line together far more often than
    // the arithmetic suggests. A warning about the Crown above a run that ends
    // in the Choir's loam is worse than no warning at all.
    const both = run(
      { verdant_choir: SEAL_MAX_STANDING - 20, crownlands: SEAL_MAX_STANDING - 4 },
      SEAL_MIN_NOTORIETY,
    );
    expect(nextThreatFor(both)!.factionId).toBe('verdant_choir');
    expect(REPRISAL_BY_FACTION.verdant_choir).toBe('turned_to_fertilizer');
  });

  it('names a non-Academy faction in the ascent too, now that every reprisal is live in every phase', () => {
    const ascent = run({ verdant_choir: SEAL_MAX_STANDING + 6 }, SEAL_MIN_NOTORIETY, 'ascent');
    expect(nextThreatFor(ascent)!.factionId).toBe('verdant_choir');

    // ...same as the Academy always could, unchanged.
    const academy = run({ pale_academy: SEAL_MAX_STANDING + 6 }, SEAL_MIN_NOTORIETY, 'ascent');
    expect(nextThreatFor(academy)!.factionId).toBe('pale_academy');
  });
});

/**
 * The tick that replaced the permanent sentence.
 *
 * If `sealAt` is ever null for a faction that can end the run, the header
 * silently loses the continuous half of that disclosure and the compression
 * becomes a regression.
 */
describe('the reprisal tick', () => {
  const factions = [
    { id: 'ashen_covenant', name: 'The Ashen Covenant' },
    { id: 'gilded_hand', name: 'The Gilded Hand' },
    { id: 'pale_academy', name: 'The Pale Academy' },
    { id: 'verdant_choir', name: 'The Verdant Choir' },
    { id: 'crownlands', name: 'The Crownlands' },
    { id: 'worm_below', name: 'The Worm Below' },
  ] as unknown as Parameters<typeof allegiancesFor>[1];

  it('marks the threshold on every bar, because every bar can now end the run', () => {
    const rows = allegiancesFor(run(0, 10), factions);
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row.sealAt, `no tick on ${row.id}`).toBeCloseTo(SEAL_MAX_STANDING / 100);
    }
  });

  it('reads as lethal for any faction whose reprisal is live and close', () => {
    const rows = allegiancesFor(run({ worm_below: SEAL_MAX_STANDING + 4 }, 60), factions);
    expect(rows.find((r) => r.id === 'worm_below')!.tone).toBe('lethal');
    expect(rows.find((r) => r.id === 'worm_below')!.note).toContain('appointment');
  });

  it('reads as lethal during the ascent too, now that every reprisal is live in every phase', () => {
    const rows = allegiancesFor(
      run({ worm_below: SEAL_MAX_STANDING + 4, pale_academy: SEAL_MAX_STANDING + 4 }, 60, 'ascent'),
      factions,
    );
    expect(rows.find((r) => r.id === 'worm_below')!.tone).toBe('lethal');
    expect(rows.find((r) => r.id === 'pale_academy')!.tone).toBe('lethal');
  });

  it('scales standing to HALF the centre-zero bar, so ±100 is the end of the rail', () => {
    // The fill read `ratio * 100%` under `overflow: hidden`, so every value
    // past ±50 drew an identical full bar — including the difference between
    // "the Academy dislikes you" and "the Academy is sealing you in a gem".
    const rows = allegiancesFor(run(-100, 10), factions);
    const academy = rows.find((r) => r.id === 'pale_academy')!;
    expect(Math.abs(academy.ratio)).toBe(1);
    expect(Math.abs(academy.ratio) * 50).toBe(50);
  });
});

/**
 * The Decision tab's ambient status line (issue #18) — nearest by STANDING.
 * It speaks unconditionally — no margin or fame gate silences it — because
 * the ambient line's job is "who is closest", full stop, on every era of the
 * run.
 */
describe('the next-threat line', () => {
  it('speaks even when nobody is anywhere near acting', () => {
    // All six tied at 0: the tie resolves to FACTION_ORDER's first entry.
    expect(nextThreatFor(run(0, 90))).not.toBeNull();
    expect(nextThreatFor(run(0, 90))!.factionId).toBe('ashen_covenant');
  });

  /**
   * All six reprisals are live in every phase now, exactly as the Academy's
   * always was — there is no longer a "cannot fire yet" case for the scan to
   * skip. (A previous version of this file distinguished a `'live'` scan
   * from an `'any'` scan for exactly that reason; that distinction is gone
   * along with the phase gate — see `nearestReprisalFaction` in
   * `src/engine/endings.ts`.)
   */
  it('names the closer faction by STANDING, in the ascent as much as the decline', () => {
    const ascent = run(
      { verdant_choir: -50, pale_academy: 20 },
      SEAL_MIN_NOTORIETY,
      'ascent',
    );
    const threat = nextThreatFor(ascent);
    expect(threat!.factionId).toBe('verdant_choir');
    expect(threat!.margin).toBe(5);
  });

  it('phrases an ascent-phase threat the same way as a decline-phase one', () => {
    const ascent = run(
      { verdant_choir: -50, pale_academy: 20 },
      SEAL_MIN_NOTORIETY,
      'ascent',
    );
    expect(reprisalSentence(nextThreatFor(ascent)!)).toBe(
      'The Choir is 5 from the loam · your fame qualifies.',
    );
  });

  it('prefers whichever faction is truly closest by standing', () => {
    const bothClose = run(
      { verdant_choir: -50, pale_academy: -60 },
      SEAL_MIN_NOTORIETY,
      'decline',
    );
    const threat = nextThreatFor(bothClose);
    expect(threat!.factionId).toBe('pale_academy');
  });
});

/**
 * The Decision tab's other status line: who this career has courted, by the
 * engine's own `patronFaction` rule rather than a second walk of
 * `factionStanding` (the drift `standing.ts`'s doc comment warns about).
 */
describe('the patron line', () => {
  it('is null for a career nobody has courted — the honest "no patron yet" state', () => {
    expect(patronFor(run(0, 10), factions)).toBeNull();
  });

  it('is null below the devotion bar, even as the sole leader', () => {
    const under = run({ ashen_covenant: DEVOTION_STANDING - 1 }, 10);
    expect(patronFor(under, factions)).toBeNull();
  });

  it('is null when devotion is cleared but a runner-up denies the exclusivity margin', () => {
    const contested = run(
      { ashen_covenant: DEVOTION_STANDING + 10, gilded_hand: DEVOTION_STANDING + 10 - (PATRON_MARGIN - 1) },
      10,
    );
    expect(patronFor(contested, factions)).toBeNull();
  });

  it('names the faction once both bars clear, using the cast\'s own name', () => {
    const devoted = run(
      { ashen_covenant: DEVOTION_STANDING + PATRON_MARGIN, gilded_hand: 0 },
      10,
    );
    const patron = patronFor(devoted, factions);
    expect(patron).not.toBeNull();
    expect(patron!.factionId).toBe('ashen_covenant');
    expect(patron!.name).toBe(factions.find((f) => f.id === 'ashen_covenant')!.name);
    expect(patron!.standing).toBe(DEVOTION_STANDING + PATRON_MARGIN);
  });

  it('returns null rather than a half sentence for a cast missing the faction', () => {
    const devoted = run({ ashen_covenant: DEVOTION_STANDING + PATRON_MARGIN }, 10);
    expect(patronFor(devoted, factions.filter((f) => f.id !== 'ashen_covenant'))).toBeNull();
  });
});

/**
 * The two rows `FactionStandings` shows when collapsed (issue #36 follow-up):
 * whoever this career has pleased most, and whoever it has angered most.
 */
describe('the two most extreme standings', () => {
  it('picks the single highest and single lowest standing', () => {
    const rows = allegiancesFor(
      run({ ashen_covenant: 46, gilded_hand: 12, pale_academy: -38, crownlands: -61, worm_below: 4 }, 10),
      factions,
    );
    const extremes = extremeAllegiances(rows);
    expect(extremes.map((r) => r.id)).toEqual(['ashen_covenant', 'crownlands']);
  });

  it('re-sorts the pair back into FACTION_ORDER, regardless of which is higher', () => {
    // Crownlands (max) sits AFTER Ashen Covenant (min) in FACTION_ORDER —
    // the returned pair must still read in that order, not max-then-min.
    const rows = allegiancesFor(run({ ashen_covenant: -70, crownlands: 70 }, 10), factions);
    const extremes = extremeAllegiances(rows);
    expect(extremes.map((r) => r.id)).toEqual(['ashen_covenant', 'crownlands']);
  });

  it('never returns the same faction twice when every standing is tied', () => {
    const rows = allegiancesFor(run(0, 10), factions);
    const extremes = extremeAllegiances(rows);
    expect(extremes).toHaveLength(2);
    expect(extremes[0]!.id).not.toBe(extremes[1]!.id);
    // Ties broken by FACTION_ORDER, same rule the engine's own tie-breaks use.
    expect(extremes.map((r) => r.id)).toEqual(['ashen_covenant', 'gilded_hand']);
  });

  it('is a no-op for two factions or fewer', () => {
    const rows = allegiancesFor(run({ ashen_covenant: 10 }, 10), factions.slice(0, 2));
    expect(extremeAllegiances(rows)).toEqual(rows);
  });
});
