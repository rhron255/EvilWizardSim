/**
 * Hexes (issue #124): an opt-in handicap applied once at creation.
 *
 * What these pin, and what each is anchored to that the code under test does
 * not itself supply (failure mode 11):
 *   - the card prints what the engine does: the stat a hex moves, measured
 *     against the SAME seed and origin played without it, equals the authored
 *     number the creation screen prints;
 *   - failure mode 1: a starting-threat hex cannot kill in the ascent, where
 *     no siege readout exists. The bound is computed from the real offer
 *     catalog, not from a constant this file chose;
 *   - the Good Wizard counters, the one hidden pair, are never touched.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { REAL_CONTENT as content } from '../testing/realContent';
import type { Effect, EndingId, RunState } from '../types';
import { DEF_FLOOR, COLLECTION_VERSION, HEX_UNLOCK_CAREERS, RUN_KEY, RUN_SAVE_VERSION } from './constants';
import { createRun } from './index';
import {
  emptyCollection,
  loadInProgressRun,
  migrateCollection,
  recordRun,
  saveInProgressRun,
} from './persistence';
import { prophecyEraFor } from './systems';

const make = (originId: string, hexId?: string, seed = 7) =>
  createRun({ wizardName: 'Ada', originId, eraCount: 16, seed, hexId }, content);

beforeEach(() => localStorage.clear());

describe('hex catalog', () => {
  it('ships three hexes with unique ids, names, and at least one effect each', () => {
    expect(content.hexes.map((h) => h.id).sort()).toEqual([
      'empty_handed',
      'file_is_open',
      'twice_inherited',
    ]);
    expect(new Set(content.hexes.map((h) => h.name)).size).toBe(content.hexes.length);
    for (const hex of content.hexes) expect(hex.effects.length).toBeGreaterThan(0);
  });

  it('never names an ending, a lich, a vow or a hidden counter', () => {
    const banned = new Set<Effect['t']>(['ending', 'becomeLich', 'vowGoodWizard', 'goodAct', 'illAct']);
    for (const hex of content.hexes) {
      for (const effect of hex.effects as Effect[]) expect(banned.has(effect.t)).toBe(false);
    }
  });

  it('is offered after HEX_UNLOCK_CAREERS finished careers, and not before', () => {
    expect(HEX_UNLOCK_CAREERS).toBe(3);
  });
});

describe('createRun under a hex', () => {
  it('records the hex id, and ignores an id the content does not define', () => {
    const origin = content.origins[0].id;
    expect(make(origin, 'file_is_open').hexId).toBe('file_is_open');
    expect(make(origin, 'no_such_hex').hexId).toBe('');
    expect(make(origin).hexId).toBe('');
  });

  it.each(content.origins.map((o) => o.id))(
    'moves exactly what the card prints, against the same seed without a hex (%s)',
    (originId) => {
      const base = make(originId);
      const threat = make(originId, 'file_is_open');
      expect(threat.heroThreat - base.heroThreat).toBe(12);
      expect(threat.pactDebt).toBe(base.pactDebt);
      expect(threat.heldArtifactIds).toEqual(base.heldArtifactIds);

      const debt = make(originId, 'twice_inherited');
      expect(debt.pactDebt - base.pactDebt).toBe(2);
      expect(debt.heroThreat).toBe(base.heroThreat);
    },
  );

  it.each(content.origins.map((o) => o.id))(
    'Empty-Handed takes the origin relic and does not credit it to the collection (%s)',
    (originId) => {
      const base = make(originId);
      expect(base.heldArtifactIds.length).toBe(1); // the origin relic the hex takes back
      const run = make(originId, 'empty_handed');
      expect(run.heldArtifactIds).toEqual([]);
      expect(run.startingArtifactIds).toEqual([]);
      const folded = recordRun(emptyCollection(), { ...run, ending: 'retired_to_swamp' }, content);
      expect(folded.discoveredArtifactIds).not.toContain(base.heldArtifactIds[0]);
    },
  );

  it('never touches the Good Wizard counters, whichever hex', () => {
    for (const hex of content.hexes) {
      for (const origin of content.origins) {
        const run = make(origin.id, hex.id);
        expect(run.goodActs).toBe(0);
        expect(run.illActs).toBe(0);
        expect(run.goodWizardVowed).toBe(false);
        expect(run.isLich).toBe(false);
        expect(run.ending).toBeUndefined();
      }
    }
  });

  it('leaves the rest of the career on the same stream with or without a hex', () => {
    const a = make(content.origins[1].id);
    const b = make(content.origins[1].id, 'twice_inherited');
    expect(b.seed).toBe(a.seed);
    expect(b.id).toBe(a.id);
    expect(b.eraCount).toBe(a.eraCount);
  });
});

describe('failure mode 1: a starting-threat hex cannot kill in the ascent', () => {
  /**
   * The slain test is not phase-gated and the siege readout appears only in
   * the decline. So the hex's starting threat plus what the ascent can force
   * on a player must stay below the lowest defense there is. "Forced" is the
   * best a player can do on a card: the least-threatening option's worst
   * branch. It is read off the real catalog, so a future ascent card with no
   * threat-free option turns this red.
   */
  const positiveThreat = (effects: readonly Effect[]) =>
    effects.reduce((sum, e) => sum + (e.t === 'heroThreat' && e.v > 0 ? e.v : 0), 0);

  const forcedPerCard = content.offers
    .filter((o) => o.phase !== 'decline')
    .map((o) =>
      Math.min(
        ...o.options.map((opt) =>
          opt.kind === 'certain'
            ? positiveThreat(opt.effects)
            : Math.max(positiveThreat(opt.onSuccess), positiveThreat(opt.onFailure)),
        ),
      ),
    )
    .sort((a, b) => b - a);

  it('has a threat-free way through every ascent card', () => {
    expect(forcedPerCard.length).toBeGreaterThan(0);
    expect(forcedPerCard[0]).toBe(0);
  });

  it('keeps starting threat plus the forced ascent gain under DEF_FLOOR', () => {
    for (const hex of content.hexes) {
      const start = (hex.effects as Effect[]).reduce(
        (s, e) => s + (e.t === 'heroThreat' ? e.v : 0),
        0,
      );
      for (const eraCount of [12, 16, 20]) {
        const ascentEras = prophecyEraFor(eraCount);
        const forced = forcedPerCard.slice(0, ascentEras).reduce((a, b) => a + b, 0);
        expect(start + forced).toBeLessThan(DEF_FLOOR);
      }
    }
  });
});

describe('Collection.hexesKept', () => {
  const finished = (hexId: string, ending: EndingId): RunState => ({
    ...make(content.origins[0].id, hexId || undefined),
    ending,
  });

  it('records the hex against the ending it reached, once', () => {
    let c = recordRun(emptyCollection(), finished('file_is_open', 'slain_by_chosen_one'), content);
    expect(c.hexesKept).toEqual({ slain_by_chosen_one: ['file_is_open'] });
    c = recordRun(c, finished('file_is_open', 'slain_by_chosen_one'), content);
    c = recordRun(c, finished('twice_inherited', 'slain_by_chosen_one'), content);
    expect(c.hexesKept.slain_by_chosen_one).toEqual(['file_is_open', 'twice_inherited']);
  });

  it('records nothing for a career with no hex, or one that has not ended', () => {
    const none = recordRun(emptyCollection(), finished('', 'slain_by_chosen_one'), content);
    expect(none.hexesKept).toEqual({});
    const live = recordRun(emptyCollection(), make(content.origins[0].id, 'file_is_open'), content);
    expect(live.hexesKept).toEqual({});
  });

  it('migrates a v6 collection to an empty record and drops malformed entries', () => {
    expect(COLLECTION_VERSION).toBe(7);
    const v6 = migrateCollection({ version: 6, endingsSeen: ['slain_by_chosen_one'], runsCompleted: 4 });
    expect(v6.hexesKept).toEqual({});
    expect(v6.version).toBe(COLLECTION_VERSION);
    const messy = migrateCollection({
      version: 7,
      hexesKept: { slain_by_chosen_one: ['file_is_open', 3, 'file_is_open'], retired_to_swamp: 'x', ascension: [] },
    });
    expect(messy.hexesKept).toEqual({ slain_by_chosen_one: ['file_is_open'] });
    expect(migrateCollection({ version: 7, hexesKept: ['a'] }).hexesKept).toEqual({});
  });
});

describe('saved careers', () => {
  it('round-trips the hex, and defaults a save written before hexes existed to none', () => {
    const run = make(content.origins[0].id, 'twice_inherited');
    saveInProgressRun(run);
    expect(loadInProgressRun()?.hexId).toBe('twice_inherited');

    const { hexId: _omit, ...older } = run;
    void _omit;
    localStorage.setItem(RUN_KEY, JSON.stringify({ version: RUN_SAVE_VERSION, run: older }));
    expect(loadInProgressRun()?.hexId).toBe('');
  });
});
