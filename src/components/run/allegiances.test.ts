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
import type { Faction, FactionId, Phase, RunState } from '../../types';
import { allegiancesFor, nextThreatFor, patronFor, reprisalSentence, reprisalWarningFor } from './allegiances';

const run = (
  standing: number | Partial<Record<FactionId, number>>,
  notoriety: number,
  phase: Phase = 'decline',
): RunState =>
  ({
    phase,
    // `reprisalLiveFor` now keys on `erasSinceProphecy`, not `phase`, so it
    // catches the prophecy-crossing era `phase` alone cannot distinguish (see
    // the comment on `reprisalLiveFor`). This file is about the warning's
    // faction/threshold logic, not that one-era edge, so callers here get the
    // same live/not-live reading `phase` used to give directly.
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

  it('holds the not-yet-live variant to the same budget, for the five factions that can show it', () => {
    // The Academy is excluded on purpose: `reprisalLiveFor` never returns
    // false for it, so nextThreatFor can never actually hand this wording a
    // pale_academy warning — including it here would test an impossible case.
    const nonAcademy = FACTIONS.filter((id) => id !== 'pale_academy');
    for (const id of nonAcademy) {
      for (const standing of [SEAL_MAX_STANDING + 6, SEAL_MAX_STANDING - 1]) {
        const ascent = run({ [id]: standing }, SEAL_MIN_NOTORIETY, 'ascent');
        const line = reprisalSentence(nextThreatFor(ascent)!);
        expect(line, line).toContain('not live yet');
        expect(line.length, line).toBeLessThanOrEqual(60);
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

/**
 * The Decision tab's ambient status line (issue #18) — nearest by STANDING,
 * live or not, unlike `reprisalWarningFor`'s live-only alarm below.
 */
describe('the next-threat line', () => {
  it('speaks even when nobody is anywhere near acting — the gates that silence the warning do not apply', () => {
    // All six tied at 0 in the decline, where all six are live: the tie
    // resolves to FACTION_ORDER's first entry, same rule `reprisalWarningFor`
    // would use if it were not gated silent here by the 55-margin check.
    expect(nextThreatFor(run(0, 90))).not.toBeNull();
    expect(nextThreatFor(run(0, 90))!.factionId).toBe('ashen_covenant');
    expect(reprisalWarningFor(run(0, 90))).toBeNull();
  });

  it('names the same faction reprisalWarningFor would, whenever the closest candidate is live', () => {
    const close = run(SEAL_MAX_STANDING + 6, SEAL_MIN_NOTORIETY);
    expect(nextThreatFor(close)!.factionId).toBe(reprisalWarningFor(close)!.factionId);
    expect(nextThreatFor(close)!.margin).toBe(reprisalWarningFor(close)!.margin);
    expect(nextThreatFor(close)!.live).toBe(true);
  });

  /**
   * The reported bug, pinned. A `'live'`-only scan skipped the Verdant
   * Choir at −50 (5 from −55, genuinely the closest thing to ending the run)
   * for as long as its reprisal wasn't live yet, and reported the Academy
   * instead — live in every phase, but sitting at a harmless +20 (75 from
   * the gem). The ambient line pointed at the wrong faction: not a false
   * alarm, but a real, close threat going unmentioned while a distant one
   * was named as "the" threat.
   */
  it('names the closer faction by STANDING even when its reprisal cannot fire yet', () => {
    const notYetLive = run(
      { verdant_choir: -50, pale_academy: 20 },
      SEAL_MIN_NOTORIETY,
      'ascent',
    );
    const threat = nextThreatFor(notYetLive);
    expect(threat!.factionId).toBe('verdant_choir');
    expect(threat!.margin).toBe(5);
    expect(threat!.live).toBe(false);
  });

  it('says plainly that a not-yet-live faction cannot fire, instead of the armed/fame wording', () => {
    const notYetLive = run(
      { verdant_choir: -50, pale_academy: 20 },
      SEAL_MIN_NOTORIETY,
      'ascent',
    );
    const line = reprisalSentence(nextThreatFor(notYetLive)!);
    expect(line).toContain('not live yet');
    expect(line).not.toMatch(/Notoriety|fame qualifies/);
  });

  it('still prefers a live faction when it really is the closest', () => {
    const bothClose = run(
      { verdant_choir: -50, pale_academy: -60 },
      SEAL_MIN_NOTORIETY,
      'decline',
    );
    const threat = nextThreatFor(bothClose);
    expect(threat!.factionId).toBe('pale_academy');
    expect(threat!.live).toBe(true);
  });

  it("does not let the alarm regress to a faction whose reprisal isn't live", () => {
    // Same fixture as the bug above: the Choir is closer by standing, but its
    // reprisal cannot fire yet — the Career tab's ALARM must stay quiet
    // (Academy's own margin, 75, is nowhere near the 25-point warning gate),
    // never substitute the Choir just because `nearestReprisalFaction('any')`
    // would prefer it.
    const notYetLive = run(
      { verdant_choir: -50, pale_academy: 20 },
      SEAL_MIN_NOTORIETY,
      'ascent',
    );
    expect(reprisalWarningFor(notYetLive)).toBeNull();
  });
});

/**
 * The Decision tab's other status line: who this career has courted, by the
 * engine's own `patronFaction` rule rather than a second walk of
 * `factionStanding` (the drift `standing.ts`'s doc comment warns about).
 */
describe('the patron line', () => {
  const FACTIONS: Faction[] = [
    { id: 'ashen_covenant', name: 'The Ashen Covenant', blurb: '', demands: '', hostileTo: [], adjective: '' },
    { id: 'gilded_hand', name: 'The Gilded Hand', blurb: '', demands: '', hostileTo: [], adjective: '' },
    { id: 'pale_academy', name: 'The Pale Academy', blurb: '', demands: '', hostileTo: [], adjective: '' },
    { id: 'verdant_choir', name: 'The Verdant Choir', blurb: '', demands: '', hostileTo: [], adjective: '' },
    { id: 'crownlands', name: 'The Crownlands', blurb: '', demands: '', hostileTo: [], adjective: '' },
    { id: 'worm_below', name: 'The Worm Below', blurb: '', demands: '', hostileTo: [], adjective: '' },
  ];

  it('is null for a career nobody has courted — the honest "no patron yet" state', () => {
    expect(patronFor(run(0, 10), FACTIONS)).toBeNull();
  });

  it('is null below the devotion bar, even as the sole leader', () => {
    const under = run({ ashen_covenant: DEVOTION_STANDING - 1 }, 10);
    expect(patronFor(under, FACTIONS)).toBeNull();
  });

  it('is null when devotion is cleared but a runner-up denies the exclusivity margin', () => {
    const contested = run(
      { ashen_covenant: DEVOTION_STANDING + 10, gilded_hand: DEVOTION_STANDING + 10 - (PATRON_MARGIN - 1) },
      10,
    );
    expect(patronFor(contested, FACTIONS)).toBeNull();
  });

  it('names the faction once both bars clear, using the cast\'s own name', () => {
    const devoted = run(
      { ashen_covenant: DEVOTION_STANDING + PATRON_MARGIN, gilded_hand: 0 },
      10,
    );
    const patron = patronFor(devoted, FACTIONS);
    expect(patron).not.toBeNull();
    expect(patron!.factionId).toBe('ashen_covenant');
    expect(patron!.name).toBe('The Ashen Covenant');
    expect(patron!.standing).toBe(DEVOTION_STANDING + PATRON_MARGIN);
  });

  it('returns null rather than a half sentence for a cast missing the faction', () => {
    const devoted = run({ ashen_covenant: DEVOTION_STANDING + PATRON_MARGIN }, 10);
    expect(patronFor(devoted, FACTIONS.filter((f) => f.id !== 'ashen_covenant'))).toBeNull();
  });
});
