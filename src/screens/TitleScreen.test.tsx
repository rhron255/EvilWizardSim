/**
 * The first screen, and the only one a player sees before they know anything.
 *
 * Everything worth pinning here is CONDITIONAL — a control that must be absent
 * for a new player and present for a returning one, a rank that must read as
 * "—" rather than "Unknown", a denominator that must come from the catalog
 * rather than from the player's own progress. Conditional rendering is where
 * this repo's bugs live: five things have shipped correct and never mounted
 * (CLAUDE.md § 2), and the mirror of that is a thing that mounts when it
 * should not.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { artifacts } from '../content/artifacts';
import { demoCollection, demoEmptyCollection } from '../components/meta/__fixtures__/demo';
import type { Collection } from '../types';
import { TitleScreen } from './TitleScreen';

const show = (collection: Collection, hasResumableRun = false) => {
  const handlers = {
    onBegin: vi.fn(),
    onResume: vi.fn(),
    onViewCollection: vi.fn(),
  };
  render(
    <TitleScreen
      collection={collection}
      artifactCount={artifacts.length}
      hasResumableRun={hasResumableRun}
      {...handlers}
    />,
  );
  return handlers;
};

/** The menu, so the two Sigils and the ledger below cannot match by accident. */
const menu = () => screen.getByRole('navigation', { name: 'Main menu' });

describe('TitleScreen · resuming', () => {
  it('offers no way to resume when there is nothing to resume', () => {
    show(demoCollection, false);
    expect(within(menu()).queryByRole('button', { name: /resume/i })).toBeNull();
    // The screen still works — this is an absent control, not an absent menu.
    expect(within(menu()).getByRole('button', { name: /begin a career/i })).toBeInTheDocument();
  });

  it('offers it when a run is waiting, and calls back exactly once', async () => {
    const { onResume, onBegin } = show(demoCollection, true);
    await userEvent.click(within(menu()).getByRole('button', { name: /resume/i }));
    expect(onResume).toHaveBeenCalledTimes(1);
    // Resuming is not beginning. Conflating them would silently discard a run.
    expect(onBegin).not.toHaveBeenCalled();
  });
});

describe('TitleScreen · a first-time player', () => {
  it('shows no rank at all rather than the bottom rank', () => {
    // `veteran` keys off runsCompleted, NOT bestNotoriety. A player who has
    // never finished a career has not earned "Unknown" — they have earned
    // nothing, and the em dash is the difference.
    show(demoEmptyCollection);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).toBeNull();
  });

  it('greets them differently from a veteran', () => {
    show(demoEmptyCollection);
    expect(screen.getByText(/Nobody has heard of you yet/i)).toBeInTheDocument();
  });

  it('shows a veteran their best rank', () => {
    show(demoCollection);
    expect(screen.queryByText('—')).toBeNull();
    expect(screen.queryByText(/Nobody has heard of you yet/i)).toBeNull();
  });
});

describe('TitleScreen · the collection door', () => {
  it('counts against the catalog, not against the player', () => {
    // The denominator is the `artifactCount` prop. Deriving it from the
    // collection would make the door read "16/16 relics" and the grid look
    // complete when it is half empty — the same class of bug as taking faction
    // names from a literal instead of the prop (EndingScreen.test.tsx).
    show(demoCollection);
    const door = within(menu()).getByRole('button', { name: /collection/i });
    expect(door.textContent).toContain(String(artifacts.length));
    expect(door.textContent).toContain(String(demoCollection.discoveredArtifactIds.length));
  });

  it('reads 0 of the full catalog for a new player', () => {
    show(demoEmptyCollection);
    const door = within(menu()).getByRole('button', { name: /collection/i });
    // Split across sibling spans, so match on the container's text.
    expect(door.textContent?.replace(/\s+/g, '')).toContain(`0/${artifacts.length}`);
  });
});
