/**
 * The cache key is the whole correctness story of the balance cache.
 *
 * Two jobs share one cache — the pull-request job READS the base numbers, the
 * push-to-main job WRITES them — so a key built two different ways would never
 * hit, silently, and the only symptom would be a slow job. That is why the key
 * is computed by one function both call rather than by two copies of a format
 * string in a YAML file, and why this file exists: the promises a key has to
 * keep are cheap to pin and expensive to discover in CI.
 *
 * The other half of the story is what the key must NOT hit on. The numbers a
 * sim produces are a pure function of the commit AND of how the sim was
 * invoked, so a key that ignored the invocation would happily serve numbers
 * measured under different settings — a wrong comparison that looks right.
 */
import { describe, expect, it } from 'vitest';
import { balanceCacheKey } from './balance-cache-key';

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const ENV = { BALANCE_CACHE_VERSION: 'v1', BALANCE_SEEDS: '1 2 3 4 5', COMPLETION_PLAYERS: '1', COMPLETION_CAP: '1' };

describe('balanceCacheKey', () => {
  it('is the same for the same commit and settings, however it is asked', () => {
    expect(balanceCacheKey(SHA, ENV)).toBe(balanceCacheKey(SHA, { ...ENV }));
    // Whitespace in the seed list is formatting, not a different measurement.
    expect(balanceCacheKey(SHA, ENV)).toBe(balanceCacheKey(SHA, { ...ENV, BALANCE_SEEDS: '1  2 3\n4 5' }));
  });

  it('names the commit, so a different commit can never hit', () => {
    const other = 'f'.repeat(40);
    expect(balanceCacheKey(SHA, ENV)).toContain(SHA);
    expect(balanceCacheKey(other, ENV)).not.toBe(balanceCacheKey(SHA, ENV));
  });

  it('changes with every setting that changes what the sim measures', () => {
    const base = balanceCacheKey(SHA, ENV);
    expect(balanceCacheKey(SHA, { ...ENV, COMPLETION_PLAYERS: '150' })).not.toBe(base);
    expect(balanceCacheKey(SHA, { ...ENV, COMPLETION_CAP: '2000' })).not.toBe(base);
    expect(balanceCacheKey(SHA, { ...ENV, BALANCE_SEEDS: '1 2 3' })).not.toBe(base);
    // The manual escape hatch: bumping the version discards every cached result.
    expect(balanceCacheKey(SHA, { ...ENV, BALANCE_CACHE_VERSION: 'v2' })).not.toBe(base);
  });

  it('refuses to build a key from a setting that is missing, instead of keying on nothing', () => {
    // A default here would have to match `simulate.ts`'s own default, which is
    // exactly the two-copies-of-a-number problem; failing loudly is the safe answer.
    for (const name of Object.keys(ENV)) {
      const partial: Record<string, string | undefined> = { ...ENV, [name]: undefined };
      expect(() => balanceCacheKey(SHA, partial), name).toThrow(name);
    }
  });

  it('refuses anything that is not a full commit SHA', () => {
    // A branch name would make the key mean "whatever that branch points at when
    // it is read" — a different commit on the next run, served the old numbers.
    for (const bad of ['main', 'HEAD', 'a1b2c3d', SHA.toUpperCase().slice(0, 39), `${SHA}0`, '']) {
      expect(() => balanceCacheKey(bad, ENV), bad).toThrow(/40-character/);
    }
  });

  it('stays under GitHub\'s 512-character cache key limit with room to spare', () => {
    expect(balanceCacheKey(SHA, ENV).length).toBeLessThan(200);
  });
});
