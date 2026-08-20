/**
 * Engine invariants.
 *
 * Every test here pins a rule the wiki states in prose, and every one was
 * verified by breaking the behaviour it covers and watching it go red before
 * being committed. wiki/00 § P3 and CLAUDE.md both say it outright: a test that
 * cannot fail is worse than no test, and this repo has shipped one that passed
 * on `0 == 0`.
 *
 * These run against the FIXTURE bundle where the rule is about mechanics, and
 * against real content where the rule is about the catalog, so that content
 * edits cannot quietly turn a mechanical test green.
 */

import { describe, expect, it } from 'vitest';
import {
  buildOfferPool,
  createRun,
  decayFor,
  defenseOf,
  emptyCollection,
  migrateCollection,
  nextOffer,
  resolveChoice,
  tierCrossing,
} from './index';
import type { ContentBundle } from './index';
import { entitledLairRung, promoteLair } from './systems';
import { applyStanding } from './effects';
import { indexOf } from './content-port';
import { fixtureContent } from './__fixtures__/content';
import * as C from '../content';
import type { Collection, Effect, RunState } from '../types';

const real: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};

const start = (over: Partial<Parameters<typeof createRun>[0]> = {}, content = fixtureContent) =>
  createRun(
    { wizardName: 'Test', originId: content.origins[0].id, eraCount: 16, seed: 42, ...over },
    content,
  );

/** Play a whole run with a fixed option index, returning every state visited. */
function playOut(seed: number, pick: number, content: ContentBundle): RunState[] {
  let run = start({ seed }, content);
  const seen = [run];
  for (let i = 0; i < 60 && !run.ending; i++) {
    const offer = nextOffer(run, content);
    run = resolveChoice(run, offer, pick, content).next;
    seen.push(run);
  }
  return seen;
}

// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('replays a seed to an identical run', () => {
    const a = playOut(7, 0, fixtureContent);
    const b = playOut(7, 0, fixtureContent);
    expect(b.at(-1)).toEqual(a.at(-1));
    expect(b.map((r) => r.notoriety)).toEqual(a.map((r) => r.notoriety));
  });

  it('produces different runs for different seeds', () => {
    // Guards the test above: if the engine ignored the seed entirely, the
    // equality assertion would pass for the wrong reason.
    const a = playOut(7, 0, fixtureContent).at(-1)!;
    const b = playOut(99, 0, fixtureContent).at(-1)!;
    expect(b.eras.map((e) => e.offerId)).not.toEqual(a.eras.map((e) => e.offerId));
  });

  it('does not mutate the run it is given', () => {
    const run = start();
    const before = structuredClone(run);
    resolveChoice(run, nextOffer(run, fixtureContent), 0, fixtureContent);
    expect(run).toEqual(before);
  });
});

describe('notoriety decay', () => {
  it('is zero during the ascent', () => {
    expect(decayFor({ phase: 'ascent', erasSinceProphecy: 0, isLich: false })).toBe(0);
    expect(decayFor({ phase: 'ascent', erasSinceProphecy: 5, isLich: false })).toBe(0);
  });

  it('compounds with eras since the prophecy', () => {
    const at = (n: number) => decayFor({ phase: 'decline', erasSinceProphecy: n, isLich: false });
    expect(at(0)).toBeGreaterThan(0);
    expect(at(4)).toBeGreaterThan(at(0));
    expect(at(8)).toBeGreaterThan(at(4));
  });

  it('is frozen for a lich — the branch that cheats the decline', () => {
    expect(decayFor({ phase: 'decline', erasSinceProphecy: 6, isLich: true })).toBe(0);
  });
});

describe('the odds rules', () => {
  it('never forces a gamble: every offered era has a certain option', () => {
    // wiki/04: "At least one option in every era must be low-risk. A player
    // should never be forced into a gamble."
    for (let seed = 1; seed <= 40; seed++) {
      let run = start({ seed }, real);
      for (let i = 0; i < 30 && !run.ending; i++) {
        const offer = nextOffer(run, real);
        expect(
          offer.options.some((o) => o.kind === 'certain'),
          `offer "${offer.id}" (seed ${seed}) forced a gamble`,
        ).toBe(true);
        run = resolveChoice(run, offer, 0, real).next;
      }
    }
  });

  it('every gamble in the real catalog declares both branches', () => {
    for (const offer of real.offers) {
      for (const option of offer.options) {
        if (option.kind !== 'gamble') continue;
        expect(option.odds).toBeGreaterThan(0);
        expect(option.odds).toBeLessThan(1);
        expect(option.onSuccess.length, `${offer.id}: empty success`).toBeGreaterThan(0);
        expect(option.onFailure.length, `${offer.id}: empty failure`).toBeGreaterThan(0);
      }
    }
  });

  it('reports what actually landed, not what was advertised', () => {
    // A +40 on a run near the ceiling must be reported at its clamped value,
    // or the resolution card lies about the consequence.
    const run = { ...start(), notoriety: 90 };
    const offer = {
      id: 'test_clamp',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [{ kind: 'certain' as const, label: 'Go', effects: [{ t: 'notoriety', v: 40 } as Effect] }],
    };
    const { next, resolution } = resolveChoice(run, offer, 0, fixtureContent);
    expect(next.notoriety).toBe(99);
    const applied = resolution.appliedEffects.find((e) => e.t === 'notoriety');
    expect(applied).toEqual({ t: 'notoriety', v: 9 });
  });
});

describe('faction standing', () => {
  /**
   * Origins apply a starting standing modifier -- the default one is "expelled
   * from the Pale Academy" -- so these assert on the DELTA a call produces
   * rather than on an absolute. Two of these tests were written against an
   * assumed pristine zero baseline and failed for that reason, not because the
   * engine was wrong.
   */
  const deltas = (fid: Parameters<typeof applyStanding>[1], v: number) => {
    const run = start({}, real);
    const before = { ...run.factionStanding };
    applyStanding(run, fid, v, indexOf(real), []);
    const out = {} as Record<keyof typeof before, number>;
    for (const k of Object.keys(before) as (keyof typeof before)[]) {
      out[k] = run.factionStanding[k] - before[k];
    }
    return out;
  };

  it('spreads hostility along hostileTo, and only one hop', () => {
    // The Ashen Covenant is hostile to the Pale Academy and the Crownlands.
    const d = deltas('ashen_covenant', 40);
    expect(d.ashen_covenant).toBe(40);
    expect(d.pale_academy).toBeLessThan(0);
    expect(d.crownlands).toBeLessThan(0);
    // The Gilded Hand is not on that list and must be untouched.
    expect(d.gilded_hand).toBe(0);
    // One hop only: the Academy's own enemies must not move.
    expect(d.worm_below).toBe(0);
  });

  it('respects the asymmetry of the hostility web', () => {
    // The Verdant Choir resents the Crownlands; the Crownlands have not
    // noticed them. Courting the Crown must not cost Choir standing.
    expect(deltas('crownlands', 30).verdant_choir).toBe(0);
  });

  it('charges nothing to enemies when the gain is clamped away', () => {
    const run = start({}, real);
    run.factionStanding = { ...run.factionStanding, ashen_covenant: 100 };
    const before = run.factionStanding.pale_academy;
    applyStanding(run, 'ashen_covenant', 25, indexOf(real), []);
    expect(run.factionStanding.ashen_covenant).toBe(100);
    expect(run.factionStanding.pale_academy).toBe(before);
  });
});

describe('lichdom', () => {
  const lichOffer = {
    id: 'test_rite',
    title: 'The Rite',
    body: 'b',
    phase: 'any' as const,
    options: [{ kind: 'certain' as const, label: 'Accept', effects: [{ t: 'becomeLich' } as Effect] }],
  };

  it('forfeits every relic and every follower, and freezes decay', () => {
    const run: RunState = {
      ...start(),
      followers: 120,
      heldArtifactIds: fixtureContent.artifacts.slice(0, 3).map((a) => a.id),
      phase: 'decline',
      erasSinceProphecy: 3,
      eraIndex: 10,
    };
    expect(run.heldArtifactIds.length).toBe(3);

    const { next } = resolveChoice(run, lichOffer, 0, fixtureContent);
    expect(next.isLich).toBe(true);
    expect(next.heldArtifactIds).toEqual([]);
    expect(next.followers).toBe(0);
    expect(decayFor(next)).toBe(0);
  });

  it('continues the run rather than ending it on the spot', () => {
    // The wiki calls lichdom "the branch that cheats the decline phase". There
    // is no decline left to cheat if the rite also stops the run.
    const run: RunState = { ...start(), phase: 'decline', eraIndex: 9, eraCount: 16 };
    const { next } = resolveChoice(run, lichOffer, 0, fixtureContent);
    expect(next.ending).toBeUndefined();
  });

  it('discloses the forfeiture in the resolution', () => {
    const run: RunState = {
      ...start(),
      followers: 50,
      heldArtifactIds: [fixtureContent.artifacts[0].id],
      phase: 'decline',
      eraIndex: 9,
    };
    const { resolution } = resolveChoice(run, lichOffer, 0, fixtureContent);
    expect(resolution.appliedEffects.some((e) => e.t === 'loseArtifact')).toBe(true);
    expect(resolution.appliedEffects.some((e) => e.t === 'followers' && e.v === -50)).toBe(true);
  });
});

describe('tier crossings — the one rationed celebration', () => {
  it('fires only on an upward crossing into a celebrated band', () => {
    expect(tierCrossing(70, 76)?.id).toBe('kingdom');
    expect(tierCrossing(80, 91)?.id).toBe('legend');
  });

  it('stays silent on uncelebrated bands and on the way back down', () => {
    expect(tierCrossing(30, 45)).toBeUndefined(); // into Local Menace
    expect(tierCrossing(50, 65)).toBeUndefined(); // into Named Threat
    expect(tierCrossing(80, 70)).toBeUndefined(); // sliding out of Kingdom
    expect(tierCrossing(95, 85)).toBeUndefined(); // sliding out of Legend
    expect(tierCrossing(76, 80)).toBeUndefined(); // no band change
  });
});

describe('the lair ladder', () => {
  it('promotes at most one rung per era', () => {
    const run = { ...start({}, real), notoriety: 99, followers: 400 };
    const ladder = indexOf(real).lairLadder;
    expect(entitledLairRung(run, ladder.length)).toBeGreaterThan(3);
    const next = promoteLair(run, real);
    expect(indexOf(real).lairRung.get(next)).toBe(1);
  });

  it('never demotes, however far notoriety falls', () => {
    const ladder = indexOf(real).lairLadder;
    const run = { ...start({}, real), lairId: ladder[5].id, notoriety: 0, followers: 0 };
    expect(promoteLair(run, real)).toBe(ladder[5].id);
  });
});

describe('endings', () => {
  it('are checked after every era, not only at the age limit', () => {
    // Pact debt at the limit must terminate mid-arc.
    const run: RunState = { ...start(), pactDebt: 6, eraIndex: 4, eraCount: 16 };
    const offer = {
      id: 'test_debt',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [{ kind: 'certain' as const, label: 'Sign', effects: [{ t: 'pactDebt', v: 1 } as Effect] }],
    };
    const { next } = resolveChoice(run, offer, 0, fixtureContent);
    expect(next.ending).toBe('consumed_by_pact');
    expect(next.eraIndex).toBeLessThan(next.eraCount);
  });

  it('always terminate a run within its era budget', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const states = playOut(seed, 0, real);
      expect(states.at(-1)!.ending, `seed ${seed} never ended`).toBeDefined();
    }
  });

  it('leaves a finished run immutable', () => {
    const states = playOut(3, 0, real);
    const done = states.at(-1)!;
    const { next } = resolveChoice(done, nextOffer(done, real), 0, real);
    expect(next).toBe(done);
  });
});

describe('the ledger', () => {
  it('appends and never rewrites', () => {
    const states = playOut(11, 1, real);
    for (let i = 1; i < states.length; i++) {
      const prev = states[i - 1].eras;
      const now = states[i].eras;
      expect(now.length).toBeGreaterThanOrEqual(prev.length);
      expect(now.slice(0, prev.length)).toEqual(prev);
    }
  });

  it('gives consecutive eras distinct deed lines', () => {
    // Every row reading `It is done.` is the failure this pins: the Deeds
    // column is the ledger's only prose, and the ledger is the game.
    let repeats = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const eras = playOut(seed, 0, real).at(-1)!.eras;
      for (let i = 1; i < eras.length; i++) {
        total++;
        if (eras[i].deedSummary === eras[i - 1].deedSummary) repeats++;
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(repeats / total).toBeLessThan(0.02);
  });
});

describe('offer sampling', () => {
  it('does not repeat an offer within a run while the pool holds', () => {
    const run = start({ seed: 5 }, real);
    const { pool } = buildOfferPool(run, real);
    expect(pool.length).toBeGreaterThan(1);
    const eras = playOut(5, 0, real).at(-1)!.eras;
    const ids = eras.map((e) => e.offerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('withholds the prophecy until its era, then plays it there', () => {
    let run = start({ seed: 21 }, real);
    const before: string[] = [];
    while (run.eraIndex < run.prophecyEra && !run.ending) {
      const offer = nextOffer(run, real);
      before.push(offer.id);
      run = resolveChoice(run, offer, 0, real).next;
    }
    expect(before).not.toContain('prophecy');
    if (!run.ending) expect(nextOffer(run, real).id).toBe('prophecy');
  });
});

describe('defense', () => {
  it('counts relics and the lair, and ignores followers', () => {
    // wiki/02 gives followers a distinct job as ledger filler; letting them
    // buy safety would collapse two currencies into one.
    const base = start({}, real);
    const withCrowd = { ...base, followers: 500 };
    expect(defenseOf(withCrowd, real)).toBe(defenseOf(base, real));

    const armed = { ...base, heldArtifactIds: [real.artifacts[0].id] };
    expect(defenseOf(armed, real)).toBeGreaterThan(defenseOf(base, real));
  });
});

describe('collection persistence', () => {
  it('starts empty at the current version', () => {
    const empty = emptyCollection();
    expect(empty.discoveredArtifactIds).toEqual([]);
    expect(empty.runsCompleted).toBe(0);
    expect(empty.version).toBeGreaterThan(0);
  });

  it('keeps a collection written by the current version intact', () => {
    const mine: Collection = {
      ...emptyCollection(),
      discoveredArtifactIds: ['a', 'b'],
      runsCompleted: 4,
      bestNotoriety: 71,
    };
    expect(migrateCollection(mine)).toEqual(mine);
  });

  it('discards junk rather than crashing a fresh run', () => {
    for (const junk of [null, undefined, 42, 'nope', {}, { version: 999 }, []]) {
      const out = migrateCollection(junk);
      expect(Array.isArray(out.discoveredArtifactIds)).toBe(true);
      expect(Number.isFinite(out.runsCompleted)).toBe(true);
    }
  });
});
