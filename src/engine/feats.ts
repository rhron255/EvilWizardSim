/**
 * Feat projection (issue #125).
 *
 * A feat is decided once, on the finished run. `recordRun` folds the result
 * into `Collection.featsEarned`; `useGame` calls the same function BEFORE that
 * fold to learn which of them are new, because afterwards the answer is always
 * "not new".
 */

import type { RunState } from '../types';
import type { ContentBundle, Feat } from './content-port';

export function featsEarnedBy(run: RunState, content: ContentBundle): Feat[] {
  if (!run.ending) return [];
  return content.feats.filter((feat) => {
    try {
      return feat.when(run);
    } catch {
      // A throwing predicate is a content bug, not a reason to lose a run.
      return false;
    }
  });
}
