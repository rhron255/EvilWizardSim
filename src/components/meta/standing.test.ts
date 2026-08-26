/**
 * The two ends of the faction ledger.
 *
 * Reported from play: standing feels like a nuisance rather than something you
 * built. It is, during a run — its only visible payoffs are a locked reliquary
 * and a gem, both punishments. The ending card names the relationship instead.
 *
 * These pin the SELECTION, not the prose: which faction gets named, when
 * nobody does, and that the thresholds are the mechanical ones the player
 * already felt rather than numbers invented for the summary.
 */
import { describe, expect, it } from 'vitest';
import { ARTIFACT_LOCKOUT_STANDING, DEVOTION_STANDING } from '../../engine';
import { factions } from '../../content/factions';
import type { FactionId, RunState } from '../../types';
import { standingPassageFor } from './standing';

const run = (standing: Partial<Record<FactionId, number>>): RunState =>
  ({
    factionStanding: {
      ashen_covenant: 0,
      gilded_hand: 0,
      pale_academy: 0,
      verdant_choir: 0,
      crownlands: 0,
      worm_below: 0,
      ...standing,
    },
  }) as RunState;

describe('standingPassageFor', () => {
  it('names nobody for a wizard who courted and offended nobody', () => {
    // A real career, not an edge case — `retired_to_swamp` is full of them.
    const p = standingPassageFor(run({}), factions);
    expect(p.patron).toBeNull();
    expect(p.nemesis).toBeNull();
  });

  it('names the faction you courted hardest', () => {
    const p = standingPassageFor(run({ worm_below: 80, ashen_covenant: 60 }), factions);
    expect(p.patron?.factionId).toBe('worm_below');
    expect(p.patron?.name).toBe('The Worm Below');
  });

  it('names the faction you alienated worst', () => {
    const p = standingPassageFor(run({ pale_academy: -90, crownlands: -60 }), factions);
    expect(p.nemesis?.factionId).toBe('pale_academy');
  });

  it('reports a patron with no nemesis, and the reverse', () => {
    // The passage has to read as a complete thought with one line or none.
    const onlyPatron = standingPassageFor(run({ worm_below: 70 }), factions);
    expect(onlyPatron.patron).not.toBeNull();
    expect(onlyPatron.nemesis).toBeNull();

    const onlyNemesis = standingPassageFor(run({ crownlands: -70 }), factions);
    expect(onlyNemesis.patron).toBeNull();
    expect(onlyNemesis.nemesis).not.toBeNull();
  });

  it('uses the mechanical thresholds, at the boundary in both directions', () => {
    // Borrowed, not invented: `DEVOTION_STANDING` is where a reliquary opens
    // and `ARTIFACT_LOCKOUT_STANDING` is where a faction stops giving you
    // anything. Naming a relationship the game was already enforcing.
    expect(standingPassageFor(run({ worm_below: DEVOTION_STANDING }), factions).patron).not.toBeNull();
    expect(standingPassageFor(run({ worm_below: DEVOTION_STANDING - 1 }), factions).patron).toBeNull();
    expect(
      standingPassageFor(run({ crownlands: ARTIFACT_LOCKOUT_STANDING }), factions).nemesis,
    ).not.toBeNull();
    expect(
      standingPassageFor(run({ crownlands: ARTIFACT_LOCKOUT_STANDING + 1 }), factions).nemesis,
    ).toBeNull();
  });

  it('takes the name from the supplied cast, never from a literal', () => {
    // The engine takes a ContentBundle and a content pack may rename the six.
    const renamed = factions.map((f) =>
      f.id === 'worm_below' ? { ...f, name: 'The Thing Downstairs' } : f,
    );
    const p = standingPassageFor(run({ worm_below: 80 }), renamed);
    expect(p.patron?.name).toBe('The Thing Downstairs');
  });

  it('yields nothing for a faction missing from the cast', () => {
    const short = factions.filter((f) => f.id !== 'worm_below');
    expect(standingPassageFor(run({ worm_below: 90 }), short).patron).toBeNull();
  });
});
