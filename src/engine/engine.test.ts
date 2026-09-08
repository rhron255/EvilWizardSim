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
  checkEndings,
  createRun,
  decayFor,
  defenseOf,
  emptyCollection,
  DEVOTION_STANDING,
  FACTION_ORDER,
  LEADERSHIP_BY_FACTION,
  PATRON_MARGIN,
  migrateCollection,
  nextOffer,
  pactRoleOf,
  pactWeight,
  PACT_LIMIT,
  PACT_RELIEF_MAX,
  PACT_TEMPT_MAX,
  QUIET_ERA_OFFER,
  REPRISAL_BY_FACTION,
  resolveChoice,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
  tierCrossing,
} from './index';
import type { ContentBundle } from './index';
import { entitledLairRung, promoteLair } from './systems';
import { applyStanding } from './effects';
import { indexOf } from './content-port';
import { fixtureContent } from './__fixtures__/content';
import * as C from '../content';
import type { Collection, Effect, FactionId, RunState } from '../types';

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

  it('supplies the roll and the threshold for a gamble', () => {
    // The overlay draws the roll landing against the printed odds -- wiki/06
    // principle 4's visual proof that the outcome was authored. The UI type
    // declared these OPTIONAL, the engine never set them, and the rail silently
    // never rendered for the entire build. Optional fields hid the drift.
    const run = start();
    const offer = {
      id: 'test_gamble',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [
        {
          kind: 'gamble' as const,
          label: 'Risk it',
          odds: 0.35,
          onSuccess: [{ t: 'notoriety', v: 5 } as Effect],
          onFailure: [{ t: 'notoriety', v: -5 } as Effect],
          successText: 'It works.',
          failureText: 'It does not work.',
        },
      ],
    };
    const { resolution } = resolveChoice(run, offer, 0, fixtureContent);
    expect(resolution.odds).toBe(0.35);
    expect(resolution.roll).toBeGreaterThanOrEqual(0);
    expect(resolution.roll).toBeLessThan(1);
    // The roll must AGREE with the outcome, or the rail would show a lie.
    const succeeded = resolution.outcome === 'success';
    expect(resolution.roll! < resolution.odds!).toBe(succeeded);
  });

  it('omits roll and odds for a certain choice', () => {
    const run = start();
    const offer = {
      id: 'test_certain',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [{ kind: 'certain' as const, label: 'Do it', effects: [] as Effect[] }],
    };
    const { resolution } = resolveChoice(run, offer, 0, fixtureContent);
    expect(resolution.roll).toBeUndefined();
    expect(resolution.odds).toBeUndefined();
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
  it('reports a move so the UI can announce it', () => {
    // "I don't notice the lair changes, despite them happening." Promotion was
    // systemic and silent; the resolution now carries it.
    const run = { ...start({}, real), notoriety: 99, followers: 400 };
    const offer = {
      id: 'test_move',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [{ kind: 'certain' as const, label: 'Wait', effects: [] as Effect[] }],
    };
    const { next, resolution } = resolveChoice(run, offer, 0, real);
    expect(next.lairId).not.toBe(run.lairId);
    expect(resolution.lairMoved).toBeDefined();
    expect(resolution.lairMoved!.up).toBe(true);
    expect(resolution.lairMoved!.from.id).toBe(run.lairId);
    expect(resolution.lairMoved!.to.id).toBe(next.lairId);
  });

  it('reports no move when the wizard stays put', () => {
    const run = { ...start({}, real), notoriety: 0, followers: 0 };
    const offer = {
      id: 'test_stay',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [{ kind: 'certain' as const, label: 'Wait', effects: [] as Effect[] }],
    };
    const { resolution } = resolveChoice(run, offer, 0, real);
    expect(resolution.lairMoved).toBeUndefined();
  });

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

  /**
   * `oath_verdant_choir` and `concordat_choir` both charge `lairTier: -1` as
   * a real price. `entitledLairRung` reads fame and followers alone, with no
   * memory of an authored move, so a wizard entitled to the rung they just
   * gave up used to be promoted straight back into it by the SAME call to
   * `resolveChoice` — refunding the cost before the resolution card finished
   * printing it as paid. The demotion must survive the era it happens in.
   */
  it('does not refund an authored demotion in the same era', () => {
    const ladder = indexOf(real).lairLadder;
    // Entitled to exactly rung 5 today, per `entitledLairRung`'s formula —
    // so absent the demotion below, nothing would move at all.
    const run = { ...start({}, real), lairId: ladder[5].id, notoriety: 45, followers: 90 };
    expect(entitledLairRung(run, ladder.length)).toBe(5);
    const offer = {
      id: 'test_demote',
      title: 'T',
      body: 'b',
      phase: 'any' as const,
      options: [
        {
          kind: 'certain' as const,
          label: 'Give it back',
          effects: [{ t: 'lairTier', v: -1 } as Effect],
        },
      ],
    };
    const { next } = resolveChoice(run, offer, 0, real);
    expect(indexOf(real).lairRung.get(next.lairId)).toBe(4);
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

/**
 * The six reprisals, and the rule that decides between them.
 *
 * `sealed_in_gem` was the only ending faction standing could reach, so the
 * check read one faction and nothing else. Six factions carrying the same
 * condition need an ORDER, because contagion routinely puts two of them under
 * the line in the same era — courting the Covenant drives the Academy and the
 * Crownlands down together. "Whichever the object literal happens to list
 * first" is a nondeterminism bug that no single playthrough would show.
 */
describe('faction reprisals', () => {
  /** A run under the line with one faction, deep in the decline. */
  const at = (
    standing: Partial<Record<FactionId, number>>,
    over: Partial<RunState> = {},
  ): RunState => ({
    ...start(),
    phase: 'decline',
    // One era clear of the prophecy transition, not merely `phase: 'decline'`
    // — `reprisalLiveFor` now keys on this, not on `phase` alone, and a
    // fixture that left it at `start()`'s default 0 would make every "fires"
    // test below false-negative the moment that fix landed instead of
    // exercising it.
    erasSinceProphecy: 1,
    notoriety: SEAL_MIN_NOTORIETY,
    eraIndex: 8,
    eraCount: 16,
    factionStanding: { ...start().factionStanding, ...standing },
    ...over,
  });

  /**
   * A bundle that DEFINES all six reprisal endings.
   *
   * `fixtureContent` declares only `sealed_in_gem` — the one reprisal that
   * predates issue #14 — so a test run against it for any other faction
   * exercises `reprisalEnding`'s bundle guard rather than the reprisal rule
   * the tests below are named for. Mirrors the leadership suite's `crowned`
   * bundle below, for the identical reason: the engine takes a
   * `ContentBundle`, and content declaring fewer endings than the frozen
   * contract lists is a legitimate pack, not a bug.
   */
  const withReprisals: ContentBundle = {
    ...fixtureContent,
    endings: [
      ...fixtureContent.endings,
      ...Object.values(REPRISAL_BY_FACTION)
        .filter((id) => !fixtureContent.endings.some((e) => e.id === id))
        .map((id) => ({
          id,
          name: `Fixture ${id}`,
          summary: 'Fixture summary.',
          hint: 'for a fixture',
          narration: 'Fixture narration.',
          rarity: 'rare' as const,
          codaMode: 'fixed' as const,
          coda: 'Fixture coda.',
        })),
    ],
  };

  it('gives every faction its own ending, not the Academy’s', () => {
    for (const [factionId, endingId] of Object.entries(REPRISAL_BY_FACTION)) {
      const run = at({ [factionId as FactionId]: SEAL_MAX_STANDING });
      expect(checkEndings(run, withReprisals), factionId).toBe(endingId);
    }
  });

  it('needs BOTH halves, exactly as the seal did', () => {
    // Deep enough, not famous enough.
    expect(
      checkEndings(at({ crownlands: SEAL_MAX_STANDING - 40 }, { notoriety: SEAL_MIN_NOTORIETY - 1 }), withReprisals),
    ).toBeUndefined();
    // Famous enough, one point short.
    expect(
      checkEndings(at({ crownlands: SEAL_MAX_STANDING + 1 }), withReprisals),
    ).toBeUndefined();
  });

  it('fires the LOWEST standing when two factions are under at once', () => {
    const run = at({ gilded_hand: SEAL_MAX_STANDING - 2, worm_below: SEAL_MAX_STANDING - 30 });
    expect(checkEndings(run, withReprisals)).toBe(REPRISAL_BY_FACTION.worm_below);
  });

  it('breaks an exact tie by FACTION_ORDER, the same way every time', () => {
    const [first, second] = [FACTION_ORDER[4], FACTION_ORDER[1]];
    const run = at({ [first]: SEAL_MAX_STANDING - 7, [second]: SEAL_MAX_STANDING - 7 });
    // `second` is earlier in FACTION_ORDER, so it wins the tie regardless of
    // which order the two were written into `factionStanding` above.
    expect(checkEndings(run, withReprisals)).toBe(REPRISAL_BY_FACTION[second]);
    expect(FACTION_ORDER.indexOf(second)).toBeLessThan(FACTION_ORDER.indexOf(first));
  });

  /**
   * The mirror of leadership's own guard test, for `reprisalEnding`'s copy of
   * the same rule (see the comment on `reprisalEnding` in `src/engine/
   * endings.ts`). Same run, same standings: a bundle that declares the id
   * ends the run on it, and a bundle that does not — `fixtureContent`, which
   * carries only `sealed_in_gem` — lets the career continue rather than
   * crash the ending screen on an id it cannot render.
   */
  it('never returns a reprisal the content bundle does not define', () => {
    const run = at({ crownlands: SEAL_MAX_STANDING });
    expect(checkEndings(run, withReprisals)).toBe(REPRISAL_BY_FACTION.crownlands);
    expect(checkEndings(run, fixtureContent)).toBeUndefined();
  });

  it('keeps the five new ones out of the ascent, and the Academy in it', () => {
    const ascent = { phase: 'ascent' as const };
    expect(
      checkEndings(at({ verdant_choir: SEAL_MAX_STANDING - 30 }, ascent), fixtureContent),
    ).toBeUndefined();
    expect(checkEndings(at({ pale_academy: SEAL_MAX_STANDING }, ascent), fixtureContent)).toBe(
      'sealed_in_gem',
    );
  });

  /**
   * The bug underneath issue #25's review: `phase` flips to `'decline'` the
   * instant `resolveChoice` advances `eraIndex` to `prophecyEra`, and
   * `checkEndings` runs on that SAME transition — before the player has ever
   * been shown the pinned prophecy card for that era. A reprisal gated on
   * `phase` alone could fire right there, ending the run before the central
   * beat the whole arc is built around ever appears. `erasSinceProphecy`
   * stays 0 on exactly that transition (it becomes 1 only once the prophecy
   * era's own card has been resolved), which is what `reprisalLiveFor` must
   * key on instead.
   */
  it('does not fire on the era that crosses into decline, before the prophecy card is shown', () => {
    const crossing = at(
      { crownlands: SEAL_MAX_STANDING },
      { erasSinceProphecy: 0 },
    );
    expect(checkEndings(crossing, withReprisals)).toBeUndefined();
    // The very next era, the same standing fires as normal.
    const oneEraLater = at({ crownlands: SEAL_MAX_STANDING }, { erasSinceProphecy: 1 });
    expect(checkEndings(oneEraLater, withReprisals)).toBe(REPRISAL_BY_FACTION.crownlands);
  });

  it('does not outrank the blade', () => {
    // Precedence is unchanged from the seal's: the hero lands first. Pinned
    // because generalising the branch moved it, and a reordering here would
    // silently redistribute two endings' rates.
    const run = at({ pale_academy: SEAL_MAX_STANDING }, { heroThreat: 9999 });
    expect(checkEndings(run, fixtureContent)).toBe('slain_by_chosen_one');
  });
});

/**
 * The other end of the same relationship: what a faction does about a wizard
 * who spent a career at the TOP of its standing.
 *
 * Leadership is read at the AGE LIMIT only, so every run below has run out of
 * eras. That is the asymmetry with the reprisals and it is deliberate: a
 * reprisal is something done to you and may cut a career short, a crown is
 * what is left to say about one that lasted.
 */
describe('faction leadership', () => {
  /**
   * A bundle that DEFINES the leadership endings.
   *
   * `src/content` now defines them too (issue #14 slice 2), but this suite
   * stays fixture-driven on purpose: the engine takes a `ContentBundle`, and a
   * test that only worked against the real one would say nothing about a pack
   * that ships different — or no — leadership prose. The last test in this
   * block covers that other case, where the bundle declares none.
   */
  const crowned: ContentBundle = {
    ...fixtureContent,
    endings: [
      ...fixtureContent.endings,
      ...Object.values(LEADERSHIP_BY_FACTION).map((id) => ({
        id,
        name: `Fixture ${id}`,
        summary: 'Fixture summary.',
        hint: 'for a fixture',
        narration: 'Fixture narration.',
        rarity: 'rare' as const,
        codaMode: 'fixed' as const,
        coda: 'Fixture coda.',
      })),
    ],
  };

  /** A career that reached the age limit, with the given standings. */
  const retiring = (
    standing: Partial<Record<FactionId, number>>,
    over: Partial<RunState> = {},
  ): RunState => ({
    ...start(),
    phase: 'decline',
    eraIndex: 16,
    eraCount: 16,
    factionStanding: { ...start().factionStanding, ...standing },
    ...over,
  });

  it('gives every faction its own crown', () => {
    for (const [factionId, endingId] of Object.entries(LEADERSHIP_BY_FACTION)) {
      // `lichdom` is the Worm's and is earned by the rite, not by standing —
      // it is covered on its own below.
      if (endingId === 'lichdom') continue;
      const run = retiring({ [factionId as FactionId]: DEVOTION_STANDING + PATRON_MARGIN });
      expect(checkEndings(run, crowned), factionId).toBe(endingId);
    }
  });

  it('retires the wizard who was liked by three factions and led by none', () => {
    // The whole reason `PATRON_MARGIN` exists: devotion has to be a
    // commitment, not the top of a flat spread.
    const run = retiring({
      ashen_covenant: DEVOTION_STANDING + 6,
      pale_academy: DEVOTION_STANDING + 4,
      crownlands: DEVOTION_STANDING,
    });
    expect(checkEndings(run, crowned)).toBe('retired_to_swamp');
  });

  it('needs the margin, at the boundary in both directions', () => {
    const dominant = retiring({
      verdant_choir: DEVOTION_STANDING + PATRON_MARGIN,
      gilded_hand: DEVOTION_STANDING,
    });
    expect(checkEndings(dominant, crowned)).toBe(LEADERSHIP_BY_FACTION.verdant_choir);

    const oneShort = retiring({
      verdant_choir: DEVOTION_STANDING + PATRON_MARGIN - 1,
      gilded_hand: DEVOTION_STANDING,
    });
    expect(checkEndings(oneShort, crowned)).toBe('retired_to_swamp');
  });

  it('needs devotion, at the boundary in both directions', () => {
    // Borrowed, never invented: `DEVOTION_STANDING` is the same threshold that
    // opens a reliquary, so leadership is not a second number to learn.
    expect(checkEndings(retiring({ crownlands: DEVOTION_STANDING }), crowned)).toBe(
      LEADERSHIP_BY_FACTION.crownlands,
    );
    expect(checkEndings(retiring({ crownlands: DEVOTION_STANDING - 1 }), crowned)).toBe(
      'retired_to_swamp',
    );
  });

  it('breaks an exact tie by FACTION_ORDER, the same way every time', () => {
    // Two factions at the same top standing cannot both crown you, and which
    // one does may not depend on object key order.
    const [first, second] = [FACTION_ORDER[4], FACTION_ORDER[1]];
    const run = retiring({
      [first]: DEVOTION_STANDING + PATRON_MARGIN,
      [second]: DEVOTION_STANDING + PATRON_MARGIN,
    });
    // A tie means no margin over the runner-up, so nobody is crowned at all.
    expect(checkEndings(run, crowned)).toBe('retired_to_swamp');
    expect(FACTION_ORDER.indexOf(second)).toBeLessThan(FACTION_ORDER.indexOf(first));
  });

  it('leaves a lich a lich, whatever the standings say', () => {
    // `lichdom` is the Worm's leadership ending and the rite already charged
    // for it. A Covenant devotee who took the rite must not die a Pact Master.
    const run = retiring(
      { ashen_covenant: DEVOTION_STANDING + PATRON_MARGIN },
      { isLich: true },
    );
    expect(checkEndings(run, crowned)).toBe('lichdom');
  });

  /**
   * Issue #21's real bug, not just its disclosure gap. `LEADERSHIP_BY_FACTION`
   * maps `worm_below` to `lichdom` for attribution's sake, and
   * `patronFaction` reads standing alone — so a wizard who courted the Worm
   * to a dominant standing but never took the rite used to reach this branch
   * with `isLich: false` and still get mapped through to `lichdom`,
   * narrating a transformation, a forfeited vault and a frozen decay that
   * never happened. The Worm's crown is earned by the rite ONLY
   * (`content/standing.ts`'s `PATRON_BY_ENDING` comment says the same thing
   * from the flavor side); a standing-only wizard retires like anyone else
   * who committed to nothing that pays off.
   */
  it('does not crown a standing-only devotee of the Worm Below', () => {
    const run = retiring({ worm_below: DEVOTION_STANDING + PATRON_MARGIN });
    expect(run.isLich).toBe(false);
    expect(checkEndings(run, crowned)).toBe('retired_to_swamp');
  });

  it('never returns an ending the content bundle does not define', () => {
    // The guard that makes this branch safe for any pack — and for this repo
    // today, where the ids exist and the prose does not. Same run, same
    // standings, a bundle that declares no crowns: the career retires instead
    // of ending on a card that cannot be rendered.
    const run = retiring({ ashen_covenant: DEVOTION_STANDING + PATRON_MARGIN });
    expect(checkEndings(run, crowned)).toBe(LEADERSHIP_BY_FACTION.ashen_covenant);
    expect(checkEndings(run, fixtureContent)).toBe('retired_to_swamp');
  });
});

/**
 * The era-end ticks that can end a run on a card that never mentioned them.
 *
 * Reported from play: "I died being consumed by the pact, even though the last
 * action I took had nothing to do with pacts." An interest tick crossing
 * `PACT_LIMIT` was applied in the systems block, and `appliedEffects` carries
 * the OPTION's consequences only, so the card announcing the death listed
 * nothing capable of causing it.
 *
 * That tick has since been deleted outright — debt now moves only on a card
 * the player picked, and the first two tests here pin that. Apprentice loyalty
 * drift still fires in the same block and is still lethal, so the disclosure
 * channel and the separation it enforces are unchanged.
 */
/**
 * Novelty bias: which relic a random draw hands you, and what it must not touch.
 *
 * 80.9% of runs added nothing at all to the 30-slot collection, because draws
 * are faction-bound — courting the Covenant means re-drawing Covenant commons
 * you already own. The fix prefers a relic the player has never held, WITHIN a
 * rarity. Across rarities it would let a veteran's exhausted commons push the
 * draw up into legendaries, which gate Ascension: a balance target moved by a
 * quality-of-life change, which is how this repo has broken balance before.
 */
describe('novelty bias', () => {
  const covenant = real.artifacts.filter((a) => a.factionId === 'ashen_covenant');

  /** Draw `n` times from one faction, with the given collection behind us. */
  function draws(n: number, known: string[], rarity?: 'common' | 'rare' | 'legendary') {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const run: RunState = {
        ...start({ seed: 1000 + i }, real),
        knownArtifactIds: known,
        // Neutral standing: no lockout, no devotion upgrade.
        factionStanding: { ...start({}, real).factionStanding },
      };
      const effect: Effect = rarity
        ? { t: 'artifactFrom', factionId: 'ashen_covenant', rarity }
        : { t: 'artifactFrom', factionId: 'ashen_covenant' };
      const offer = {
        id: `test_draw_${i}`,
        title: 'T',
        body: 'b',
        phase: 'any' as const,
        options: [{ kind: 'certain' as const, label: 'Take it', effects: [effect] }],
      };
      const { resolution } = resolveChoice(run, offer, 0, real);
      const gained = resolution.artifactsGained[0];
      if (gained) out.push(gained.id);
    }
    return out;
  }

  it('prefers a relic the player has never held', () => {
    const commons = covenant.filter((a) => a.rarity === 'common').map((a) => a.id);
    expect(commons.length).toBeGreaterThan(1);
    // Everything but one common is already in the collection.
    const known = commons.slice(1);
    const got = draws(120, known).filter((id) => commons.includes(id));
    const novel = got.filter((id) => id === commons[0]).length;
    expect(got.length).toBeGreaterThan(20);
    // Uniform would be 1/commons.length; the bias must beat that clearly.
    expect(novel / got.length).toBeGreaterThan(1.6 / commons.length);
  });

  it('does not change how often a legendary drops', () => {
    // The invariant the two-stage draw exists to protect. Same seeds, same
    // draws, only the collection differs.
    const blank = draws(300, []);
    const veteran = draws(300, covenant.filter((a) => a.rarity === 'common').map((a) => a.id));
    const rarityOf = (id: string) => real.artifacts.find((a) => a.id === id)!.rarity;
    const share = (ids: string[], r: string) =>
      ids.filter((id) => rarityOf(id) === r).length / Math.max(1, ids.length);

    expect(blank.length).toBeGreaterThan(200);
    expect(Math.abs(share(veteran, 'legendary') - share(blank, 'legendary'))).toBeLessThan(0.05);
    expect(Math.abs(share(veteran, 'rare') - share(blank, 'rare'))).toBeLessThan(0.1);
  });

  it('leaves an authored rarity request exactly as authored', () => {
    // `{ rarity: 'rare' }` is a set-piece grant. Novelty picks WHICH rare, and
    // must never promote or demote the rank the card promised.
    const rares = new Set(covenant.filter((a) => a.rarity === 'rare').map((a) => a.id));
    const got = draws(40, [], 'rare');
    expect(got.length).toBeGreaterThan(20);
    expect(got.every((id) => rares.has(id))).toBe(true);
  });

  it('still hands over a relic when the player already owns every candidate', () => {
    // The degenerate case: nothing novel left. The draw must not go empty.
    const all = covenant.map((a) => a.id);
    expect(draws(20, all).length).toBeGreaterThan(10);
  });
});

describe('systemic disclosure', () => {
  const quiet = {
    id: 'test_quiet',
    title: 'T',
    body: 'b',
    phase: 'any' as const,
    options: [{ kind: 'certain' as const, label: 'Do nothing of the kind', effects: [] as Effect[] }],
  };

  /** A decline-phase run, one era in, holding whatever the caller sets. */
  const declining = (over: Partial<RunState>): RunState => ({
    ...start(),
    eraIndex: 10,
    phase: 'decline',
    erasSinceProphecy: 1,
    ...over,
  });

  /**
   * The regression pin for the interest tick's removal.
   *
   * Debt used to grow `+1` every decline era at or above 2, which killed 29.4%
   * of all careers on a clock rather than on a choice. It does not any more:
   * a wizard one point from the ceiling who picks a card that says nothing
   * about pacts must survive the era with the same balance they started it.
   *
   * Anchored to `next.pactDebt` and `next.ending` — engine state, which the
   * removal cannot also supply. Asserting on the absent constant would have
   * gone green the moment it stopped existing (failure mode 11).
   */
  it('does not move pact debt on an era whose card never mentioned it', () => {
    const run = declining({ pactDebt: PACT_LIMIT - 1 });
    const { next, resolution } = resolveChoice(run, quiet, 0, fixtureContent);

    expect(next.pactDebt).toBe(PACT_LIMIT - 1);
    expect(next.ending).toBeUndefined();
    expect(resolution.systemic).toEqual([]);
    expect(resolution.appliedEffects).toEqual([]);
  });

  /**
   * The same pin across a whole decline, because one era proves nothing about
   * a counter that used to compound. A run that signs one pact and then never
   * touches another must reach the age limit holding exactly what it signed
   * for — under the old tick this run died every single time.
   */
  it('carries a debt through the entire decline without it growing', () => {
    let run = declining({ pactDebt: PACT_LIMIT - 1 });
    for (let i = 0; i < 6 && !run.ending; i++) {
      run = resolveChoice(run, quiet, 0, fixtureContent).next;
      expect(run.pactDebt).toBe(PACT_LIMIT - 1);
    }
    expect(run.ending).not.toBe('consumed_by_pact');
  });

  it('reports the loyalty drift that ends the run', () => {
    const run = declining({ apprentices: { count: 3, loyalty: 18 } });
    const { next, resolution } = resolveChoice(run, quiet, 0, fixtureContent);

    expect(next.ending).toBe('betrayed_by_apprentice');
    expect(resolution.systemic).toContainEqual({ t: 'loyaltyDrift', v: -5, loyalty: 13 });
  });

  it('stays silent during the ascent, when neither tick fires', () => {
    const run = { ...start(), apprentices: { count: 3, loyalty: 40 } };
    expect(run.phase).toBe('ascent');
    const { resolution } = resolveChoice(run, quiet, 0, fixtureContent);
    expect(resolution.systemic).toEqual([]);
  });

  it('leaves decay and hero threat out of it', () => {
    // wiki/04 § Notoriety Decay: "Do not add a doom meter." The erosion is
    // gradual and survivable; these two ticks are lethal and countable, which
    // is the whole distinction the section rests on.
    const run = declining({ notoriety: 60, apprentices: { count: 3, loyalty: 60 } });
    const { next, resolution } = resolveChoice(run, quiet, 0, fixtureContent);
    expect(next.heroThreat).toBeGreaterThan(0);
    expect(next.notoriety).toBeLessThan(60);
    expect(resolution.systemic.map((c) => c.t)).toEqual(['loyaltyDrift']);
  });

  it('reports nothing when the option itself ended the run', () => {
    // The systems block is skipped entirely in that case, so claiming a tick
    // fired would be inventing one.
    const ends = {
      ...quiet,
      options: [
        {
          kind: 'certain' as const,
          label: 'Walk into the swamp',
          effects: [{ t: 'ending', endingId: 'retired_to_swamp' } as Effect],
        },
      ],
    };
    const { next, resolution } = resolveChoice(declining({ pactDebt: 6 }), ends, 0, fixtureContent);
    expect(next.ending).toBe('retired_to_swamp');
    expect(next.pactDebt).toBe(6);
    expect(resolution.systemic).toEqual([]);
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

/**
 * Pact debt's pull on the offer pool — what replaced the interest tick.
 *
 * Asserted at the EXTREMES rather than at a typical value. CLAUDE.md failure
 * mode 13: the faction standing bar mapped its range across half its track and
 * every value past ±50 drew an identical picture, on the one bar where the
 * difference ended a run. A multiplier that quietly saturates two points early
 * is the same defect with no pixels to give it away.
 */
describe('pact debt weighting', () => {
  const tempts = { ...QUIET_ERA_OFFER, id: 't', options: [
    { kind: 'certain' as const, label: 'Sign', effects: [{ t: 'pactDebt', v: 2 }] as Effect[] },
    { kind: 'certain' as const, label: 'Decline', effects: [] as Effect[] },
  ] };
  const relieves = { ...tempts, id: 'r', options: [
    { kind: 'certain' as const, label: 'Pay', effects: [{ t: 'pactDebt', v: -2 }] as Effect[] },
    { kind: 'certain' as const, label: 'Walk', effects: [] as Effect[] },
  ] };
  const inert = { ...tempts, id: 'n', options: [
    { kind: 'certain' as const, label: 'Brood', effects: [{ t: 'notoriety', v: 1 }] as Effect[] },
    { kind: 'certain' as const, label: 'Sulk', effects: [] as Effect[] },
  ] };
  const bundle = { ...real, offers: [tempts, relieves, inert] };
  const at = (pactDebt: number, offer: typeof tempts) =>
    pactWeight({ ...start({}, real), pactDebt }, offer, bundle);

  it('classifies each shape from its effects alone', () => {
    expect(pactRoleOf(tempts)).toBe('tempts');
    expect(pactRoleOf(relieves)).toBe('relieves');
    expect(pactRoleOf(inert)).toBe('none');
  });

  /**
   * The card that does BOTH. `decline_collections` clears 2 debt on two of its
   * options and adds 2 on a lost gamble; to a wizard at 5/7 it is an exit, and
   * weighting it as a temptation would be backwards. Named explicitly rather
   * than derived, so an edit that flips it has to flip this line too.
   */
  it('reads a card that both clears and adds debt as an exit', () => {
    const both = real.offers.find((o) => o.id === 'decline_collections')!;
    expect(both).toBeDefined();
    expect(pactRoleOf(both)).toBe('relieves');
  });

  it('reads a gamble that only clears on SUCCESS as an exit', () => {
    const twoWay = {
      ...tempts,
      id: 'g',
      options: [
        { kind: 'certain' as const, label: 'Wait', effects: [] as Effect[] },
        {
          kind: 'gamble' as const,
          label: 'Bet',
          odds: 0.35,
          onSuccess: [{ t: 'pactDebt', v: -2 }] as Effect[],
          onFailure: [{ t: 'pactDebt', v: 3 }] as Effect[],
          successText: 's',
          failureText: 'f',
        },
      ],
    };
    expect(pactRoleOf(twoWay)).toBe('relieves');
  });

  it('leaves the pool completely unweighted at zero debt', () => {
    // The property that keeps a pact-free career playing exactly as it did
    // before this system existed. Exactly 1, not approximately.
    for (const offer of [tempts, relieves, inert]) expect(at(0, offer)).toBe(1);
  });

  it('never weights an offer that does not touch debt', () => {
    for (const debt of [0, 1, 4, PACT_LIMIT, 99]) expect(at(debt, inert)).toBe(1);
  });

  it('reaches its ceiling and stops, rather than clipping past it', () => {
    expect(at(99, tempts)).toBe(PACT_TEMPT_MAX);
    expect(at(99, relieves)).toBe(PACT_RELIEF_MAX);
    // And is still BELOW the ceiling one step in, or the ramp is decoration.
    expect(at(1, tempts)).toBeLessThan(PACT_TEMPT_MAX);
    expect(at(1, relieves)).toBeLessThan(PACT_RELIEF_MAX);
  });

  it('climbs monotonically, and never lets relief outrun temptation', () => {
    for (let debt = 1; debt <= PACT_LIMIT; debt++) {
      expect(at(debt, tempts), `debt ${debt}`).toBeGreaterThanOrEqual(at(debt - 1, tempts));
      expect(at(debt, relieves), `debt ${debt}`).toBeGreaterThanOrEqual(at(debt - 1, relieves));
      expect(at(debt, relieves), `debt ${debt}`).toBeLessThan(at(debt, tempts));
    }
  });

  /**
   * The multiplier has to reach the SAMPLER, not just exist beside it. This
   * repo shipped a roll rail that computed correctly and rendered never, and a
   * `planShareTail` that fixed a bug the renderer went on having — so the pin
   * is on which offer actually comes out of `nextOffer` across many seeds,
   * which is the thing a player experiences.
   */
  it('actually shifts what the sampler draws', () => {
    const draws = (pactDebt: number) => {
      let temptCount = 0;
      for (let seed = 0; seed < 400; seed++) {
        const run = { ...start({ seed }, real), pactDebt, seenOfferIds: [], eraIndex: seed % 5 };
        if (nextOffer(run, bundle).id === 't') temptCount++;
      }
      return temptCount;
    };
    expect(draws(6)).toBeGreaterThan(draws(0) * 1.3);
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
