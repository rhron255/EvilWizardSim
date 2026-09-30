/**
 * The key under which a commit's balance numbers are cached in CI.
 *
 *   npx tsx scripts/balance-cache-key.ts <full-commit-sha>
 *
 * Prints the key. Read its settings from the environment the sim itself runs
 * under (`.github/workflows/ci.yml` sets them once per job).
 *
 * WHY THE NUMBERS CAN BE CACHED AT ALL: `scripts/simulate.ts` is deterministic
 * per seed — the same commit, seeds and settings produce the same numbers, byte
 * for byte. So the base ref's numbers are a pure function of its commit, and
 * measuring the same commit again on every pull request is seven wasted minutes
 * (fourteen on a slow runner, which is what pushed the job past its limit). A
 * cache keyed by the commit is exact: no committed file to go stale, no merge
 * conflicts on one, and movement is still attributed to exactly this PR.
 *
 * WHY ONE FUNCTION: two jobs share the cache — the pull-request job reads the
 * base numbers, the push-to-main job writes them — so a key built two different
 * ways would never hit, silently, and the only symptom would be a slow job.
 * Both call this. The settings are in the key because they change what is
 * measured (`COMPLETION_PLAYERS`, `COMPLETION_CAP`, the seed list); a key that
 * ignored them would serve numbers measured under different settings, a wrong
 * comparison that looks right. There are deliberately no defaults: a default
 * would have to match `simulate.ts`'s own, which is two copies of one number.
 *
 * Tested in `scripts/balance-cache-key.test.ts`.
 */
import { pathToFileURL } from 'node:url';

const REQUIRED = ['BALANCE_CACHE_VERSION', 'BALANCE_SEEDS', 'COMPLETION_PLAYERS', 'COMPLETION_CAP'] as const;

export function balanceCacheKey(sha: string, env: Record<string, string | undefined>): string {
  // A branch name would make the key mean "whatever it points at when read" — a
  // different commit next run, served the previous commit's numbers.
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`balance-cache-key: expected a full 40-character commit SHA, got "${sha}"`);
  }
  for (const name of REQUIRED) {
    if (!env[name]) {
      throw new Error(
        `balance-cache-key: ${name} is not set — the key has to change whenever the measurement does`,
      );
    }
  }
  const seeds = env.BALANCE_SEEDS!.trim().split(/\s+/).join('');
  return `balance-base-${env.BALANCE_CACHE_VERSION}-s${seeds}-cp${env.COMPLETION_PLAYERS}-cap${env.COMPLETION_CAP}-${sha}`;
}

function main(): void {
  const sha = process.argv[2];
  if (!sha) {
    console.error('usage: npx tsx scripts/balance-cache-key.ts <full-commit-sha>');
    process.exit(2);
  }
  try {
    console.log(balanceCacheKey(sha, process.env));
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

// `pathToFileURL`, not a raw `file://` template: see the same guard in
// `scripts/balance-report.ts` for the checkout-path-with-a-space failure it avoids.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
