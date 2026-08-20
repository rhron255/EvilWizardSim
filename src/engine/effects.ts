/**
 * Effect application.
 *
 * The output is not just a new state — it is a list of the effects that
 * ACTUALLY LANDED, with real magnitudes after clamping, lockouts and
 * already-held checks. wiki/04's odds policy says a player may never be
 * surprised by an unlisted consequence; the mirror of that rule is that the
 * resolution card must show what genuinely happened, not what was advertised.
 * A `+15 Notoriety` that clamped at 99 lands as `+4`, and the UI can say so.
 */

import type { Artifact, Effect, EndingId, FactionId, Rarity, RunState } from '../types';
import type { ContentBundle, ContentIndex } from './content-port';
import { indexOf } from './content-port';
import {
  ARTIFACT_LOCKOUT_STANDING,
  CONTAGION_GAIN,
  CONTAGION_LOSS,
  RARITY_DRAW_WEIGHT,
  STANDING_MAX,
  STANDING_MIN,
} from './constants';
import type { Rng } from './rng';
import { weightedPick } from './rng';
import { clamp, clampNotoriety } from './systems';

export type EffectApplication = {
  /** Exactly what landed, with post-clamp magnitudes. */
  applied: Effect[];
  artifactsGained: Artifact[];
  artifactsLost: Artifact[];
  /** Set if any effect requested a terminal state. First one wins. */
  endingRequested?: EndingId;
};

/** A mutable working copy. Arrays/objects are cloned so the input is untouched. */
export function draftOf(run: RunState): RunState {
  return {
    ...run,
    heldArtifactIds: run.heldArtifactIds.slice(),
    factionStanding: { ...run.factionStanding },
    apprentices: { ...run.apprentices },
    eras: run.eras,
    seenOfferIds: run.seenOfferIds,
  };
}

const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, legendary: 2 };

/**
 * Apply `effects` to `draft` in order, mutating it.
 *
 * `rng` is drawn from only for genuinely random effects (`artifactFrom`,
 * `loseArtifact`), and always in list order, so the sequence is stable.
 */
export function applyEffects(
  draft: RunState,
  effects: readonly Effect[],
  rng: Rng,
  content: ContentBundle,
): EffectApplication {
  const index = indexOf(content);
  const out: EffectApplication = { applied: [], artifactsGained: [], artifactsLost: [] };

  for (const effect of effects) {
    switch (effect.t) {
      case 'notoriety': {
        const before = draft.notoriety;
        draft.notoriety = clampNotoriety(before + effect.v);
        const delta = draft.notoriety - before;
        if (delta !== 0) out.applied.push({ t: 'notoriety', v: delta });
        break;
      }

      case 'followers': {
        const before = draft.followers;
        draft.followers = Math.max(0, Math.round(before + effect.v));
        const delta = draft.followers - before;
        if (delta !== 0) out.applied.push({ t: 'followers', v: delta });
        break;
      }

      case 'standing': {
        applyStanding(draft, effect.factionId, effect.v, index, out.applied);
        break;
      }

      case 'artifact': {
        const artifact = index.artifactById.get(effect.artifactId);
        if (!artifact) break;
        if (draft.heldArtifactIds.includes(artifact.id)) break;
        draft.heldArtifactIds.push(artifact.id);
        out.artifactsGained.push(artifact);
        out.applied.push({ t: 'artifact', artifactId: artifact.id });
        break;
      }

      case 'artifactFrom': {
        const artifact = drawArtifact(draft, effect.factionId, effect.rarity, rng, index);
        if (!artifact) break;
        draft.heldArtifactIds.push(artifact.id);
        out.artifactsGained.push(artifact);
        // Resolve the abstract draw into the concrete grant so the UI has a
        // name to render.
        out.applied.push({ t: 'artifact', artifactId: artifact.id });
        break;
      }

      case 'loseArtifact': {
        if (draft.heldArtifactIds.length === 0) break;
        const doomedId = draft.heldArtifactIds[Math.floor(rng() * draft.heldArtifactIds.length)];
        draft.heldArtifactIds = draft.heldArtifactIds.filter((id) => id !== doomedId);
        const artifact = index.artifactById.get(doomedId);
        if (artifact) out.artifactsLost.push(artifact);
        out.applied.push({ t: 'loseArtifact' });
        break;
      }

      case 'apprentices': {
        const before = draft.apprentices.count;
        draft.apprentices = {
          ...draft.apprentices,
          count: Math.max(0, Math.round(before + effect.v)),
        };
        const delta = draft.apprentices.count - before;
        if (delta !== 0) out.applied.push({ t: 'apprentices', v: delta });
        break;
      }

      case 'loyalty': {
        const before = draft.apprentices.loyalty;
        draft.apprentices = {
          ...draft.apprentices,
          loyalty: clamp(Math.round(before + effect.v), 0, 100),
        };
        const delta = draft.apprentices.loyalty - before;
        if (delta !== 0) out.applied.push({ t: 'loyalty', v: delta });
        break;
      }

      case 'pactDebt': {
        const before = draft.pactDebt;
        draft.pactDebt = Math.max(0, Math.round(before + effect.v));
        const delta = draft.pactDebt - before;
        if (delta !== 0) out.applied.push({ t: 'pactDebt', v: delta });
        break;
      }

      case 'heroThreat': {
        const before = draft.heroThreat;
        draft.heroThreat = Math.max(0, Math.round((before + effect.v) * 10) / 10);
        const delta = Math.round((draft.heroThreat - before) * 10) / 10;
        if (delta !== 0) out.applied.push({ t: 'heroThreat', v: delta });
        break;
      }

      case 'lairTier': {
        const applied = moveLair(draft, effect.v, index);
        if (applied !== 0) out.applied.push({ t: 'lairTier', v: applied });
        break;
      }

      case 'ending': {
        if (!out.endingRequested) out.endingRequested = effect.endingId;
        out.applied.push({ t: 'ending', endingId: effect.endingId });
        break;
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Faction standing, with contagion
// ---------------------------------------------------------------------------

/**
 * wiki/04: "Hostility is contagious along `hostileTo` — courting the Ashen
 * Covenant should cost standing with the Pale Academy."
 *
 * Contagion is computed from the ACTUAL applied delta, so courting a faction
 * already pinned at +100 costs its enemies nothing. It is one hop only — no
 * recursion, no cascades — and each secondary change is pushed onto
 * `applied` so the resolution card shows the whole bill.
 */
export function applyStanding(
  draft: RunState,
  factionId: FactionId,
  v: number,
  index: ContentIndex,
  applied: Effect[],
): number {
  const before = draft.factionStanding[factionId] ?? 0;
  const after = clamp(Math.round(before + v), STANDING_MIN, STANDING_MAX);
  const delta = after - before;
  draft.factionStanding = { ...draft.factionStanding, [factionId]: after };
  if (delta !== 0) applied.push({ t: 'standing', factionId, v: delta });
  if (delta === 0) return 0;

  const enemies = index.factionById.get(factionId)?.hostileTo ?? [];
  const rate = delta > 0 ? CONTAGION_GAIN : CONTAGION_LOSS;
  for (const enemyId of enemies) {
    if (enemyId === factionId) continue;
    const spill = -Math.round(delta * rate);
    if (spill === 0) continue;
    const enemyBefore = draft.factionStanding[enemyId] ?? 0;
    const enemyAfter = clamp(enemyBefore + spill, STANDING_MIN, STANDING_MAX);
    if (enemyAfter === enemyBefore) continue;
    draft.factionStanding = { ...draft.factionStanding, [enemyId]: enemyAfter };
    applied.push({ t: 'standing', factionId: enemyId, v: enemyAfter - enemyBefore });
  }

  return delta;
}

// ---------------------------------------------------------------------------
// Artifact draws
// ---------------------------------------------------------------------------

/**
 * `artifactFrom`: a random not-yet-held artifact from a faction.
 *
 * Three rules ride on this:
 *   1. `rarity` is a CAP, not an exact match ("optionally rarity-capped").
 *   2. Draws are rarity-weighted so an uncapped draw almost never coughs up a
 *      legendary — legendaries gate Ascension and are meant to be granted by
 *      id, deliberately, as an authored prize.
 *   3. A faction at or below `ARTIFACT_LOCKOUT_STANDING` gives you nothing.
 *      wiki/04: "Hostile → their artifacts lock out." The empty result shows
 *      up in `appliedEffects`, so the UI can say the vault was shut.
 */
function drawArtifact(
  draft: RunState,
  factionId: FactionId,
  rarityCap: Rarity | undefined,
  rng: Rng,
  index: ContentIndex,
): Artifact | undefined {
  const standing = draft.factionStanding[factionId] ?? 0;
  if (standing <= ARTIFACT_LOCKOUT_STANDING) return undefined;

  const cap = rarityCap ? RARITY_RANK[rarityCap] : RARITY_RANK.legendary;
  const held = new Set(draft.heldArtifactIds);
  const pool = (index.artifactsByFaction.get(factionId) ?? []).filter(
    (a) => !held.has(a.id) && RARITY_RANK[a.rarity] <= cap,
  );
  if (pool.length === 0) return undefined;

  return weightedPick(rng, pool, (a) => RARITY_DRAW_WEIGHT[a.rarity]);
}

// ---------------------------------------------------------------------------
// Lair ladder
// ---------------------------------------------------------------------------

/** Returns the rungs actually moved (0 if already at an end of the ladder). */
function moveLair(draft: RunState, v: number, index: ContentIndex): number {
  const ladder = index.lairLadder;
  if (ladder.length === 0) return 0;
  const current = index.lairRung.get(draft.lairId) ?? 0;
  const next = clamp(current + Math.round(v), 0, ladder.length - 1);
  if (next === current) return 0;
  draft.lairId = ladder[next].id;
  return next - current;
}
