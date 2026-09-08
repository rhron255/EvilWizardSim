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
  DEVOTION_STANDING,
  CONTAGION_GAIN,
  CONTAGION_LOSS,
  GOOD_WIZARD_ILL_CAP,
  NOVELTY_BIAS,
  RARITY_DRAW_WEIGHT,
  STANDING_MAX,
  STANDING_MIN,
} from './constants';
import type { Rng } from './rng';
import { weightedPick } from './rng';
import { clamp, clampNotoriety, clampThreat } from './systems';

export type EffectApplication = {
  /** Exactly what landed, with post-clamp magnitudes. */
  applied: Effect[];
  artifactsGained: Artifact[];
  artifactsLost: Artifact[];
  /** Set if any effect requested a terminal state. First one wins. */
  endingRequested?: EndingId;
  /**
   * Set by `{ t: 'becomeLich' }`. The forfeiture itself lives in `run.ts`,
   * which owns the run-level transformation; this switch only records that it
   * was asked for.
   */
  lichRequested?: boolean;
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
        draft.heroThreat = clampThreat(before + effect.v);
        const delta = draft.heroThreat - before;
        if (delta !== 0) out.applied.push({ t: 'heroThreat', v: delta });
        break;
      }

      case 'lairTier': {
        const applied = moveLair(draft, effect.v, index);
        if (applied !== 0) out.applied.push({ t: 'lairTier', v: applied });
        break;
      }

      case 'becomeLich': {
        out.lichRequested = true;
        // Pushed so the resolution card lists the rite alongside its price;
        // `run.ts` appends the concrete forfeiture once it knows what was held.
        out.applied.push({ t: 'becomeLich' });
        break;
      }

      /**
       * The rule-1 exception (issue #23) — see the doc comment on these two
       * variants in `types.ts`. Every other numeric case above pushes to
       * `out.applied` only `if (delta !== 0)`; these two never push at all,
       * unconditionally. That is what makes disclosure structural rather
       * than a UI-layer filter: `appliedEffects` (the ledger, the resolution
       * card) reads this array directly, and `projectEffects` below reads it
       * too (via `PROJECTABLE`), so both leak points close from one place.
       */
      case 'goodAct': {
        draft.goodActs = Math.max(0, draft.goodActs + effect.v);
        break;
      }

      case 'illAct': {
        draft.illActs = Math.max(0, draft.illActs + effect.v);
        // The vow is a promise the career keeps to the end ("held to the
        // end", per `virtue_resolution_the_quiet_ledger`'s own resultText),
        // not a one-time gate check spent at the moment it was taken. That
        // offer's own `requires` caps illActs at `GOOD_WIZARD_ILL_CAP`, but
        // nothing enforced the cap AFTER the vow — a wizard who vowed at
        // illActs 0 or 1 and then picked an illAct-tagged option elsewhere in
        // the pool (`virtue_obscure_*` offers are ordinary-reading and
        // ungated, so every run sees them, saint or not) kept `good_wizard`/
        // `arch_lich` regardless of how many more harmful choices followed,
        // contradicting the card's own gate and its own promise.
        //
        // Revoked here, silently — as silently as the counters that gate it.
        // Rule 1's amendment permits this route to only ever ADD an ending;
        // un-adding it the moment its OWN condition stops holding is the same
        // door the counters already gate, not a new one.
        if (draft.goodWizardVowed && draft.illActs > GOOD_WIZARD_ILL_CAP) {
          draft.goodWizardVowed = false;
        }
        break;
      }

      case 'vowGoodWizard': {
        draft.goodWizardVowed = true;
        // Fully disclosed, unlike the case above — see the doc comment on
        // `Effect`'s `vowGoodWizard` member.
        out.applied.push({ t: 'vowGoodWizard' });
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
 *   1. `rarity`, when present, is an EXACT request, not a cap. Content asking
 *      for a `legendary` is authoring a set-piece grant, not an upper bound —
 *      the field once meant "cap" to this function and "exact" to the author,
 *      and the mismatch weighted legendary grants down to a common ~97% of the
 *      time and sat Ascension at 0.00% across 2000 runs (CLAUDE.md failure mode
 *      4). Two riders on the exact match: a faction courted to
 *      `DEVOTION_STANDING` upgrades the request one rarity (common→rare,
 *      rare→legendary), and if the requested rarity is exhausted for this
 *      faction the draw falls to the next tier DOWN rather than granting
 *      nothing. Omitting `rarity` is the only way to ask for a rarity-weighted
 *      random draw.
 *   2. Draws with no `rarity` are rarity-weighted so they almost never cough up
 *      a legendary — legendaries gate Ascension and are meant to be granted by
 *      id or by the devotion upgrade, deliberately, as an authored prize.
 *   3. A faction at or below `ARTIFACT_LOCKOUT_STANDING` gives you nothing.
 *      wiki/04: "Hostile → their artifacts lock out." The empty result shows
 *      up in `appliedEffects`, so the UI can say the vault was shut.
 */
function drawArtifact(
  draft: RunState,
  factionId: FactionId,
  rarity: Rarity | undefined,
  rng: Rng,
  index: ContentIndex,
): Artifact | undefined {
  const standing = draft.factionStanding[factionId] ?? 0;
  if (standing <= ARTIFACT_LOCKOUT_STANDING) return undefined;

  const held = new Set(draft.heldArtifactIds);
  const unheld = (index.artifactsByFaction.get(factionId) ?? []).filter((a) => !held.has(a.id));
  if (unheld.length === 0) return undefined;

  // An explicit rarity is an EXACT request: content asking for a legendary is
  // authoring a set-piece grant, not expressing an upper bound.
  if (rarity) {
    // Devotion is the route to a faction's best relic. Only three of the six
    // factions have an authored legendary grant at all, so without this the
    // Pale Academy's legendary is unreachable and Ascension — which needs
    // `ASCENSION_LEGENDARIES`, currently one — sat at 0.00% across 2000 runs.
    // (This comment said "two" long after the constant became one; the sim's
    // ascension diagnostic had drifted the same way. Read the constant.)
    // Standing this high is a run-defining
    // commitment, which is exactly the "committed path" wiki/04 asks routing
    // to reward, and it gives the near-miss a legible cause.
    const devoted = (draft.factionStanding[factionId] ?? 0) >= DEVOTION_STANDING;
    const wanted: Rarity =
      devoted && rarity !== 'legendary' ? (rarity === 'common' ? 'rare' : 'legendary') : rarity;
    if (wanted !== rarity) {
      const better = unheld.filter((a) => a.rarity === wanted);
      if (better.length > 0) return pickNovel(draft, better, rng);
    }

    const exact = unheld.filter((a) => a.rarity === rarity);
    if (exact.length > 0) return pickNovel(draft, exact, rng);
    // That rarity is exhausted for this faction — fall back to the next tier
    // down rather than silently granting nothing.
    const rank = RARITY_RANK[rarity];
    const below = unheld.filter((a) => RARITY_RANK[a.rarity] < rank);
    if (below.length === 0) return undefined;
    return drawByRarityThenNovelty(draft, below, rng);
  }

  return drawByRarityThenNovelty(draft, unheld, rng);
}

/**
 * One of a fixed rarity, preferring a relic the player has never held.
 *
 * An authored `{ rarity: 'legendary' }` is a set-piece grant and stays exactly
 * that — this only decides WHICH legendary, and a player who already owns one
 * of them should meet a different one.
 */
function pickNovel(draft: RunState, candidates: Artifact[], rng: Rng): Artifact | undefined {
  const known = new Set(draft.knownArtifactIds);
  return weightedPick(rng, candidates, (a) => (known.has(a.id) ? 1 : NOVELTY_BIAS));
}

/**
 * The uncapped draw, in two stages.
 *
 * STAGE ONE picks the rarity on `RARITY_DRAW_WEIGHT`, weighting each rarity by
 * the sum of its members' weights. That is arithmetically the same
 * distribution the old single-stage `weightedPick` produced, so how often a
 * legendary drops — the thing that gates Ascension — is untouched.
 *
 * STAGE TWO spends the remaining choice on novelty: a relic the player has
 * never held in any career outweighs one already in their collection by
 * `NOVELTY_BIAS`.
 *
 * Splitting it this way is the whole point. Novelty across rarities would let
 * a veteran player's exhausted commons push the draw up into legendaries and
 * quietly move a balance target; novelty inside a rarity cannot.
 */
function drawByRarityThenNovelty(draft: RunState, pool: Artifact[], rng: Rng): Artifact | undefined {
  if (pool.length === 0) return undefined;

  const byRarity = new Map<Rarity, Artifact[]>();
  for (const a of pool) {
    const bucket = byRarity.get(a.rarity);
    if (bucket) bucket.push(a);
    else byRarity.set(a.rarity, [a]);
  }

  const rarity = weightedPick(
    rng,
    Array.from(byRarity.keys()),
    (r) => RARITY_DRAW_WEIGHT[r] * (byRarity.get(r)?.length ?? 0),
  );
  if (!rarity) return undefined;

  return pickNovel(draft, byRarity.get(rarity) ?? [], rng);
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

// ---------------------------------------------------------------------------
// Projection — what the card should print, given where the run actually is
// ---------------------------------------------------------------------------

/**
 * Effects whose landed value is a pure function of the current run state.
 *
 * Everything NOT in this set stays exactly as the author wrote it, because
 * projecting it would either be a lie or spoil a reveal: `artifactFrom` draws
 * at random and the card's honest promise is "a common Gilded Hand relic",
 * `loseArtifact` picks at random, and `ending`/`becomeLich` are not quantities.
 */
const PROJECTABLE: ReadonlySet<Effect['t']> = new Set([
  'notoriety',
  'followers',
  'apprentices',
  'loyalty',
  'pactDebt',
  'heroThreat',
  'standing',
  'lairTier',
  /**
   * `goodAct`/`illAct` are projectable for the opposite of the usual reason:
   * not to correct the authored number, but to make it vanish. Routing them
   * through `applyEffects` (which never pushes either to `out.applied`, see
   * the case above) means the pre-commit offer card gets the same silence
   * the post-commit resolution card does, from the same mechanism — see the
   * rule-1 exception on `Effect` in `types.ts`. Leaving them OUT of this set
   * would send them down the "pass through raw" branch below instead, which
   * is exactly the leak this exists to close.
   */
  'goodAct',
  'illAct',
]);

/** Never reached: no projectable effect draws from the rng. */
const NO_RNG: Rng = () => {
  throw new Error('projectEffects: a projectable effect must not draw from the rng');
};

/**
 * What an option will ACTUALLY do to this run, ready to print on the card.
 *
 * Two ways the authored list and the outcome came apart, both of which the
 * player then saw only after committing:
 *
 *   1. CONTAGION. `applyStanding` spills onto `hostileTo` at 0.5 of a gain and
 *      0.25 of a loss. So a card reading "+8 Standing · The Gilded Hand" also
 *      cost 4 with the Verdant Choir, and the card never said so. CLAUDE.md
 *      names this exactly — "an undisclosed downside reached by an invisible
 *      route" — and it is the route into `sealed_in_gem`, which is 18.5% of
 *      runs. The spill is deterministic and computable before the commit, so
 *      there was never a reason it could not be printed.
 *
 *   2. FLOOR CLAMPS. Followers clamp at 0, and the run starts at 0. Measured
 *      over 800 runs: 49.6% of options that printed a follower cost deducted
 *      NOTHING, and in era 1 it was 70%. "−12 Followers" on a card that will
 *      charge nothing is not a downside the player can reason about; it is
 *      decoration that teaches them to discount every number on the card.
 *
 * Printing the projection fixes both, and it cannot drift from the engine
 * because it IS the engine: each effect is run through `applyEffects` against a
 * draft and what comes back is what the card prints. A parallel "what would
 * this do" implementation is precisely the seam CLAUDE.md's failure mode 3 is
 * about.
 *
 * Effects are projected in list order against a running draft, so a card that
 * touches the same faction twice reads with the second value already knowing
 * about the first — the same order the resolution applies them in.
 */
export function projectEffects(
  run: RunState,
  effects: readonly Effect[],
  content: ContentBundle,
): Effect[] {
  const draft = draftOf(run);
  const out: Effect[] = [];

  for (const effect of effects) {
    if (!PROJECTABLE.has(effect.t)) {
      out.push(effect);
      continue;
    }
    const { applied } = applyEffects(draft, [effect], NO_RNG, content);
    // An effect that lands as nothing is still worth a line ONLY if the author
    // meant a quantity and the state ate it — but a zero row reads as noise,
    // and the honest reading of "this will cost you nothing" is silence.
    out.push(...applied);
  }

  return out;
}
