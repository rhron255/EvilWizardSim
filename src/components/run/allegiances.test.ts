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
import { REPRISAL_BY_FACTION, SEAL_MAX_STANDING, SEAL_MIN_NOTORIETY } from '../../engine';
import type { FactionId, Phase, RunState } from '../../types';
import { allegiancesFor, reprisalSentence, reprisalWarningFor } from './allegiances';

const run = (
  standing: number | Partial<Record<FactionId, number>>,
  notoriety: number,
  phase: Phase = 'decline',
): RunState =>
  ({
    phase,
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
    // The five non-Academy reprisals go live one era AFTER the prophecy, not
    // on the phase flip — `resolveChoice` advances `phase` before the
    // interstitial has played, so 'decline' alone is a whole era too early
    // (see `reprisalLiveFor`). A decline run here means one that is past that
    // era, which is what every case below is about; the gap era gets its own
    // test, which supplies `erasSinceProphecy: 0` explicitly.
    erasSinceProphecy: phase === 'decline' ? 1 : 0,
  }) as RunState;

const sentence = (standing: number, notoriety: number, phase: Phase = 'decline') =>
  reprisalSentence(reprisalWarningFor(run(standing, notoriety, phase))!);

describe('the reprisal warning', () => {
  it('stays quiet while nobody is anywhere near acting', () => {
    expect(reprisalWarningFor(run(0, 90))).toBeNull();
  });

  it('names the fame that arms it, when fame is the half still missing', () => {
    const line = sentence(SEAL_MAX_STANDING, 20);
    expect(line).toContain(String(SEAL_MIN_NOTORIETY));
    expect(line).toMatch(/Notoriety/);
  });

  it('names the distance in standing while standing is the half still missing', () => {
    // Fame within reach of arming, so the sentence is a live warning.
    expect(sentence(SEAL_MAX_STANDING + 9, SEAL_MIN_NOTORIETY - 5)).toContain('9 from the gem');
  });

  /**
   * The sentence is the ARMED warning now, not a permanent fixture.
   *
   * It used to print from era one — "The Academy is 20 from the gem · it acts
   * at 55 Notoriety." above a wizard at 11 Notoriety, i.e. a standing line
   * about a death that nothing in the run could yet cause, sitting on top of
   * the choice cards on a 852px phone. The continuous half of that disclosure
   * moved to `sealAt`, a tick drawn on the faction's own bar.
   */
  it('stays quiet while fame is nowhere near arming it, because the bar carries the distance', () => {
    expect(reprisalWarningFor(run(SEAL_MAX_STANDING + 9, 11))).toBeNull();
  });

  it('warns anyway once standing is already past the line, whatever the fame', () => {
    // The only thing keeping this run alive is a number the game pushes up.
    expect(reprisalWarningFor(run(SEAL_MAX_STANDING, 11))).not.toBeNull();
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
describe('the reprisal warning · all six factions', () => {
  const FACTIONS: FactionId[] = [
    'ashen_covenant',
    'gilded_hand',
    'pale_academy',
    'verdant_choir',
    'crownlands',
    'worm_below',
  ];

  it('warns about whichever faction is closest, not only the Academy', () => {
    for (const id of FACTIONS) {
      const warning = reprisalWarningFor(run({ [id]: SEAL_MAX_STANDING + 6 }, SEAL_MIN_NOTORIETY));
      expect(warning, `no warning for ${id}`).not.toBeNull();
      expect(warning!.factionId).toBe(id);
    }
  });

  it('gives each faction its own noun, so no two reprisals read alike', () => {
    const lines = FACTIONS.map((id) =>
      reprisalSentence(
        reprisalWarningFor(run({ [id]: SEAL_MAX_STANDING + 6 }, SEAL_MIN_NOTORIETY))!,
      ),
    );
    expect(new Set(lines).size).toBe(FACTIONS.length);
    // The Academy's own wording is the one that must not have moved: it is the
    // line `qa/probe-seal-fit.mjs` measured the one-line budget against.
    expect(lines[2]).toBe('The Academy is 6 from the gem · your fame qualifies.');
  });

  it('holds every variant to the length the Academy line established', () => {
    // Not a layout measurement — the browser probe is that. This is the cheap
    // guard that a new faction noun cannot quietly double the sentence.
    for (const id of FACTIONS) {
      for (const standing of [SEAL_MAX_STANDING + 6, SEAL_MAX_STANDING - 1]) {
        for (const notoriety of [SEAL_MIN_NOTORIETY, SEAL_MIN_NOTORIETY - 6]) {
          const line = reprisalSentence(reprisalWarningFor(run({ [id]: standing }, notoriety))!);
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
    expect(reprisalWarningFor(both)!.factionId).toBe('verdant_choir');
    expect(REPRISAL_BY_FACTION.verdant_choir).toBe('turned_to_fertilizer');
  });

  it('stays silent through the prophecy era itself, not merely through the ascent', () => {
    // The gap `reprisalLiveFor` closed: the resolution that carries a wizard
    // across `prophecyEra` reaches the engine already reading 'decline',
    // while the interstitial has not played and the pinned prophecy card has
    // not been drawn. A warning that appears — or an ending that fires — in
    // that era skips the beat the whole arc is built around, and the header
    // had been silent right up to it, so it would arrive unwarned.
    const gap = {
      ...run({ verdant_choir: SEAL_MAX_STANDING - 20 }, SEAL_MIN_NOTORIETY),
      erasSinceProphecy: 0,
    } as RunState;
    expect(reprisalWarningFor(gap)).toBeNull();

    // The Academy is unaffected, in that era as in every other.
    const academy = {
      ...run({ pale_academy: SEAL_MAX_STANDING - 20 }, SEAL_MIN_NOTORIETY),
      erasSinceProphecy: 0,
    } as RunState;
    expect(reprisalWarningFor(academy)!.factionId).toBe('pale_academy');
  });

  it('stays silent about a faction whose reprisal cannot fire yet', () => {
    // Five of the six are decline-only. A red line during the ascent would be
    // a warning about something the engine will not do.
    const ascent = run({ verdant_choir: SEAL_MAX_STANDING - 20 }, SEAL_MIN_NOTORIETY, 'ascent');
    expect(reprisalWarningFor(ascent)).toBeNull();

    // ...and the Academy still warns in either phase, unchanged.
    const academy = run({ pale_academy: SEAL_MAX_STANDING - 20 }, SEAL_MIN_NOTORIETY, 'ascent');
    expect(reprisalWarningFor(academy)!.factionId).toBe('pale_academy');
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

  it('does not cry lethal during the ascent for a faction that cannot act yet', () => {
    const rows = allegiancesFor(
      run({ worm_below: SEAL_MAX_STANDING + 4, pale_academy: SEAL_MAX_STANDING + 4 }, 60, 'ascent'),
      factions,
    );
    expect(rows.find((r) => r.id === 'worm_below')!.tone).not.toBe('lethal');
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
