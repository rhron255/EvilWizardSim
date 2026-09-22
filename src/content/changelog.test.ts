/**
 * The shipped changelog DATA (issue #67).
 *
 * Just the one structural guarantee that belongs to this file rather than to
 * `src/engine/changelog.ts` (which owns the version-comparison logic, tested
 * in its own `changelog.test.ts`): the compiled build has an entry for
 * itself. `validate:content` and the `prebuild` check both enforce this too,
 * so it is pinned here as well to catch a build/changelog drift on a bare
 * unit-test run.
 */
import { describe, expect, it } from 'vitest';
import { changelogHasVersion } from '../engine/changelog';
import { BUILD_VERSION } from '../version';
import { CHANGELOG } from './changelog';

describe('the shipped catalog', () => {
  it('has an entry for the compiled BUILD_VERSION', () => {
    expect(changelogHasVersion(CHANGELOG, BUILD_VERSION)).toBe(true);
  });
});
