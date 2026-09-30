/**
 * Rule 1, checked against the whole catalogue instead of one card at a time.
 *
 * `projection.test.ts` proves the card equals the outcome for the cards it
 * names. That is how this repo keeps finding out, one player report at a time,
 * about the card it did not name. This plays hundreds of seeded careers against
 * the REAL content with a random policy and asserts, after every single
 * resolution, the things rule 1 promises:
 *
 *   - no stat and no relic changes by an amount the resolution did not report;
 *   - the card's printed numbers are what the engine then applied;
 *   - there is always something the player can pick (no soft-lock);
 *   - nothing goes non-finite or out of range.
 *
 * The residual checks are anchored to something the code under test does not
 * supply (failure mode 11): the state's actual before/after values, against the
 * sum of what the resolution claims it did. A mutation that makes the engine
 * change a stat without reporting it fails here; so does one that makes the
 * card print a number the engine does not apply.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK: an \`artifactFrom\` in the same list.
 * The card leaves that draw unresolved on purpose (resolving it early would
 * spoil the reveal or print a lie), and a relic drawn mid-list can rescale a
 * later number — only ever in the player's favour, because no double-edged
 * relic is ever drawn. So the card there is the worst case, not the exact case.
 *
 * Found by this test: eight effect lists put a \`loseArtifact\` BEFORE a
 * \`followers\`/\`standing\` effect, so the random loss could take the relic that
 * was rescaling it and the real outcome was worse than the printed one (Choir
 * standing printed -4, landed -8; Gilded Thumb followers printed +30, landed
 * +20). \`validate:content\` now refuses that ordering.
 */
import { describe, expect, it } from 'vitest';
import { REAL_CONTENT as content } from '../testing/realContent';
import type { Effect, RunState } from '../types';
import { createRun, projectEffects, resolveChoice } from './index';
import { isOptionPickable, nextOffer } from './offers';
import { mulberry32 } from './rng';
import { PACT_LIMIT } from './constants';

const CAREERS = 2500;
/** Types whose resolved value differs from the authored one by design. */
const RANDOM_OR_HIDDEN = new Set<Effect['t']>(['artifact', 'artifactFrom', 'loseArtifact', 'goodAct', 'illAct']);

const total = (effects: readonly Effect[], t: Effect['t'], keep: (e: Effect) => boolean = () => true) =>
  effects.reduce((sum, e) => (e.t === t && keep(e) && 'v' in e ? sum + e.v : sum), 0);

function violationsFor(before: RunState, next: RunState, offerId: string, index: number, optionLabel: string, res: ReturnType<typeof resolveChoice>['resolution'], branch: readonly Effect[]): string[] {
  const out: string[] = [];
  const at = `${offerId}#${index} "${optionLabel}"`;
  const bad = (msg: string) => out.push(`${at}: ${msg}`);

  // ---- sanity ------------------------------------------------------------
  const stats: [string, number][] = [
    ['notoriety', next.notoriety],
    ['followers', next.followers],
    ['apprentices', next.apprentices.count],
    ['loyalty', next.apprentices.loyalty],
    ['pactDebt', next.pactDebt],
    ['heroThreat', next.heroThreat],
    ...Object.entries(next.factionStanding).map(([f, v]) => [`standing.${f}`, v] as [string, number]),
  ];
  for (const [k, v] of stats) if (!Number.isFinite(v)) bad(`${k} is ${v}`);
  if (next.notoriety < 0 || next.notoriety > 99) bad(`notoriety ${next.notoriety} is out of range`);
  if (next.followers < 0 || !Number.isInteger(next.followers)) bad(`followers ${next.followers} is not a whole, non-negative count`);
  if (next.apprentices.count < 0) bad(`apprentices ${next.apprentices.count} is negative`);
  if (next.apprentices.loyalty < 0 || next.apprentices.loyalty > 100) bad(`loyalty ${next.apprentices.loyalty} is out of range`);
  if (next.pactDebt < 0 || next.pactDebt > PACT_LIMIT + 6) bad(`pact debt ${next.pactDebt} is out of range`);
  if (next.heroThreat < 0) bad(`hero threat ${next.heroThreat} is negative`);
  for (const [f, v] of Object.entries(next.factionStanding)) if (v < -100 || v > 100) bad(`standing ${f} ${v} is out of range`);

  // ---- bookkeeping -------------------------------------------------------
  if (new Set(next.heldArtifactIds).size !== next.heldArtifactIds.length) bad('a relic is held twice');
  if (new Set(next.seenOfferIds).size !== next.seenOfferIds.length) bad('an offer is marked seen twice');
  if (next.eras.length !== before.eras.length + 1) bad('the era record was not appended exactly once');
  if (next.eraIndex !== before.eraIndex + 1) bad('the era index did not advance by one');
  if (res.notorietyDelta !== next.notoriety - before.notoriety) bad(`notorietyDelta ${res.notorietyDelta} is not the real change ${next.notoriety - before.notoriety}`);
  if ((res.ending ?? undefined) !== (next.ending ?? undefined)) bad('the resolution and the run disagree about the ending');

  // ---- no undisclosed consequence ---------------------------------------
  const reported: Effect[] = [
    ...res.appliedEffects,
    ...res.relicEvents.flatMap((e) => e.applied),
    ...(res.lifeline?.applied ?? []),
  ];
  const drift = res.systemic.reduce((s, c) => (c.t === 'loyaltyDrift' ? s + c.v : s), 0);

  const residual = (label: string, actual: number) => {
    if (actual !== 0) bad(`${label} changed by ${actual} more than the resolution reported`);
  };
  residual('followers', next.followers - before.followers - total(reported, 'followers'));
  residual('apprentices', next.apprentices.count - before.apprentices.count - total(reported, 'apprentices'));
  residual('loyalty', next.apprentices.loyalty - before.apprentices.loyalty - total(reported, 'loyalty') - drift);
  residual('pact debt', next.pactDebt - before.pactDebt - total(reported, 'pactDebt'));
  for (const f of Object.keys(next.factionStanding) as (keyof typeof next.factionStanding)[]) {
    residual(
      `standing ${f}`,
      next.factionStanding[f] - before.factionStanding[f] - total(reported, 'standing', (e) => e.t === 'standing' && e.factionId === f),
    );
  }
  // Notoriety and threat have QUIET era-end ticks by design (rule 5: the erosion
  // stays unannounced) — so only the impossible directions are violations: a
  // gain nobody reported, or any unreported movement during the ascent.
  const dNotoriety = next.notoriety - before.notoriety - total(reported, 'notoriety');
  if (dNotoriety > 0) bad(`notoriety rose ${dNotoriety} more than reported`);
  if (dNotoriety < 0 && before.phase !== 'decline') bad(`notoriety fell ${-dNotoriety} unreported during the ascent`);
  const dThreat = next.heroThreat - before.heroThreat - total(reported, 'heroThreat');
  if (dThreat < 0) bad(`hero threat fell ${-dThreat} more than reported`);
  if (dThreat > 0 && before.phase !== 'decline') bad(`hero threat rose ${dThreat} unreported during the ascent`);

  // Relic ledger: the option's losses land first, then relic-trigger grants.
  const lost = new Set(res.artifactsLost.map((a) => a.id));
  const gained = new Set<string>([
    ...res.artifactsGained.map((a) => a.id),
    ...reported.filter((e): e is Extract<Effect, { t: 'artifact' }> => e.t === 'artifact').map((e) => e.artifactId),
  ]);
  const expected = new Set(before.heldArtifactIds.filter((id) => !lost.has(id)));
  for (const id of gained) expected.add(id);
  for (const id of next.heldArtifactIds) if (!expected.has(id)) bad(`relic ${id} was gained without being reported`);
  for (const id of expected) if (!next.heldArtifactIds.includes(id)) bad(`relic ${id} was lost without being reported`);

  // ---- the card equals the outcome ---------------------------------------
  const lichRite = branch.some((e) => e.t === 'becomeLich' || (e.t === 'ending' && e.endingId === 'lichdom'));
  if (!lichRite && !branch.some((e) => e.t === 'artifactFrom')) {
    const printed = projectEffects(before, branch, content).filter((e) => !RANDOM_OR_HIDDEN.has(e.t));
    const done = res.appliedEffects.filter((e) => !RANDOM_OR_HIDDEN.has(e.t));
    if (JSON.stringify(printed) !== JSON.stringify(done)) {
      bad(`the card printed ${JSON.stringify(printed)} but the engine applied ${JSON.stringify(done)} (relics held: ${before.heldArtifactIds.join(', ') || 'none'})`);
    }
  }
  return out;
}

describe('rule 1 across the whole catalogue · a random career, checked at every step', () => {
  it(
    `discloses every consequence and prints what the engine does, over ${CAREERS} seeded careers`,
    () => {
      const problems: string[] = [];
      let resolutions = 0;

      for (let i = 0; i < CAREERS && problems.length < 10; i++) {
        const rand = mulberry32(90_000 + i);
        const origin = content.origins[Math.floor(rand() * content.origins.length)];
        const eraCount = ([12, 16, 20] as const)[Math.floor(rand() * 3)];
        let run = createRun({ wizardName: 'Property', originId: origin.id, eraCount, seed: 1000 + i, knownArtifactIds: [] }, content);

        for (let guard = 0; !run.ending && run.eraIndex < run.eraCount && guard < 60; guard++) {
          const offer = nextOffer(run, content);
          const pickable = offer.options.map((_, k) => k).filter((k) => isOptionPickable(run, offer.options[k], content));
          if (pickable.length === 0) {
            problems.push(`${offer.id}: nothing the player can pick (era ${run.eraIndex})`);
            break;
          }
          const index = pickable[Math.floor(rand() * pickable.length)];
          const option = offer.options[index];
          const before = run;
          const { next, resolution } = resolveChoice(run, offer, index, content);
          resolutions++;
          const branch: readonly Effect[] =
            option.kind === 'certain' ? option.effects : resolution.outcome === 'success' ? option.onSuccess : option.onFailure;
          problems.push(...violationsFor(before, next, offer.id, index, option.label, resolution, branch));
          run = next;
        }
      }

      // Guard against a vacuous pass: the loop must actually have played.
      expect(resolutions).toBeGreaterThan(CAREERS * 8);
      // Report the first few, not a count — a count hides which card.
      expect(problems.slice(0, 5)).toEqual([]);
    },
    120_000,
  );
});
