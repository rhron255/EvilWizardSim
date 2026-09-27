/**
 * The changelog-acknowledgement half of `persistence.ts` (issue #67), tested
 * on its own because nothing else in the reducer touches it — see `App.tsx`'s
 * changelog-popup wiring for the only caller.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { loadChangelogAck, saveChangelogAck } from './persistence';

beforeEach(() => localStorage.clear());

describe('changelog acknowledgement', () => {
  it('is null before anything has ever been saved', () => {
    expect(loadChangelogAck()).toBeNull();
  });

  it('round-trips whatever version was last acknowledged', () => {
    saveChangelogAck('2026-09-22');
    expect(loadChangelogAck()).toBe('2026-09-22');
  });

  it('overwrites an older acknowledgement with a newer one', () => {
    saveChangelogAck('2026-01-01');
    saveChangelogAck('2026-09-22');
    expect(loadChangelogAck()).toBe('2026-09-22');
  });
});
