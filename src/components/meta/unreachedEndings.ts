/**
 * Which endings the ending card points at (issue #113). Pure, and reads the
 * collection only — never the hidden good/ill counters.
 */

import type { Ending, EndingId, Rarity } from '../../types';

/** Nearest goals first: the common endings, then the storied, then the fabled. */
const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, legendary: 2 };

export const UNREACHED_LIMIT = 3;

/**
 * Pure and collection-only. A stable sort, so equal rarities keep content
 * order — which is what puts `good_wizard` and `arch_lich` last.
 */
export function unreachedEndings(
  endings: readonly Ending[],
  endingsSeen: readonly EndingId[],
  limit: number = UNREACHED_LIMIT,
): Ending[] {
  const seen = new Set(endingsSeen);
  return endings
    .filter((e) => !seen.has(e.id))
    .map((ending, index) => ({ ending, index }))
    .sort((a, b) => RARITY_RANK[a.ending.rarity] - RARITY_RANK[b.ending.rarity] || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.ending);
}
