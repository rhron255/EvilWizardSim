/**
 * `prebuild` — npm runs this automatically before `npm run build`.
 *
 * Issue #67: "Compile the current build version into the game. The build
 * version must have a matching changelog entry; catch a mismatch during the
 * build." `validate:content` asserts the same thing, so the full gate suite
 * catches it too, but `npm run build` also runs on its own in CI's "Build"
 * step and for anyone building locally without the gate — so this lives here
 * as well, ahead of `tsc -b` and `vite build`, via npm's `prebuild` lifecycle
 * hook rather than by editing the `build` script string itself.
 */

import { CHANGELOG, changelogHasVersion } from '../src/content/changelog';
import { BUILD_VERSION } from '../src/version';

if (!changelogHasVersion(CHANGELOG, BUILD_VERSION)) {
  console.error(
    `BUILD_VERSION "${BUILD_VERSION}" (src/version.ts) has no entry in ` +
      'src/content/changelog.ts. Add one before shipping this build.',
  );
  process.exit(1);
}

console.log(`build version OK — ${BUILD_VERSION}`);
