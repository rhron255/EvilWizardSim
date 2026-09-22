import { describe, expect, it } from 'vitest';
import { formatChangelogVersion } from './changelogFormat';

describe('formatChangelogVersion', () => {
  it('drops the time-of-day, keeping only the date a player should read', () => {
    expect(formatChangelogVersion('2026-09-22T09:15:00Z')).toBe('2026-09-22');
  });

  it('formats two same-day versions identically, since that is the point of the key', () => {
    expect(formatChangelogVersion('2026-09-22T09:15:00Z')).toBe(
      formatChangelogVersion('2026-09-22T18:40:00Z'),
    );
  });

  it('falls back to the raw string for anything without a time component', () => {
    expect(formatChangelogVersion('2026-09-22')).toBe('2026-09-22');
  });
});
