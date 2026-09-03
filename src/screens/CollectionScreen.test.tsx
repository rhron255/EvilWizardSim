/**
 * The visible gap is the point.
 *
 * wiki/02: all thirty relic slots show from run one, undiscovered ones as
 * silhouettes with the name hidden. CLAUDE.md rule 6 says the same for the
 * seven endings. Both are promises that only hold if nothing is collapsed,
 * paginated, or filtered away — and the one that is easy to break silently is
 * a locked card LEAKING the name it is supposed to be withholding.
 *
 * Anchors here are `aria-label`s that `ArtifactCard` and `EndingSlot` build
 * themselves, so the assertions are not reading back values the test supplied.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { artifacts } from '../content/artifacts';
import { factions } from '../content/factions';
import { endings } from '../content/endings';
import { demoCollection, demoEmptyCollection } from '../components/meta/__fixtures__/demo';
import type { Collection } from '../types';
import { CollectionScreen } from './CollectionScreen';

const show = (collection: Collection) => {
  const onBack = vi.fn();
  const view = render(
    <CollectionScreen
      collection={collection}
      artifacts={artifacts}
      factions={factions}
      endings={endings}
      onBack={onBack}
      onViewThemes={vi.fn()}
    />,
  );
  return { onBack, container: view.container };
};

const filters = () => screen.getByRole('navigation', { name: /filter relics/i });

describe('CollectionScreen · the grid shows everything from run one', () => {
  it('renders all thirty slots for a player who has found nothing', () => {
    show(demoEmptyCollection);
    const locked = screen.getAllByLabelText(/^Undiscovered relic of /);
    expect(locked).toHaveLength(artifacts.length);
    expect(artifacts.length).toBe(30);
  });

  it('does not leak the name of a relic it is withholding', () => {
    // The redaction is the whole mechanic. A locked card that still renders its
    // name in a hidden node hands the grid away to anyone who selects the page.
    const { container } = show(demoEmptyCollection);
    const text = container.textContent ?? '';
    for (const a of artifacts) {
      expect(text, `leaked ${a.id}`).not.toContain(a.name);
    }
  });

  it('names a relic once it has been found', () => {
    show(demoCollection);
    const found = artifacts.find((a) => demoCollection.discoveredArtifactIds.includes(a.id))!;
    expect(screen.getByText(found.name)).toBeInTheDocument();
  });

  it('keeps all six faction groups even when a player has found nothing', () => {
    show(demoEmptyCollection);
    for (const f of factions) {
      expect(screen.getByRole('heading', { name: f.name })).toBeInTheDocument();
    }
  });
});

describe('CollectionScreen · the seven endings', () => {
  it('shows every ending slot from run one, unopened', () => {
    show(demoEmptyCollection);
    const doors = screen.getAllByLabelText(/^An ending you have not reached/);
    expect(doors).toHaveLength(endings.length);
    // A floor, not the count. Pinning the exact number made this fail on the
    // day content was ADDED, which is the one day the grid is most worth
    // checking — while `toHaveLength(endings.length)` above already fails if a
    // slot goes missing. Seventeen is the seven of wiki/01 § 7, the five
    // faction reprisals of issue #14 slice 1, and the five faction leadership
    // endings of slice 2 (`lichdom` already counted among the original seven).
    expect(endings.length).toBeGreaterThanOrEqual(17);
  });

  it('withholds the name of an ending not yet reached', () => {
    const { container } = show(demoEmptyCollection);
    const text = container.textContent ?? '';
    for (const e of endings) {
      expect(text, `leaked ${e.id}`).not.toContain(e.name);
    }
  });

  it('counts distinct endings, so a repeat does not inflate the total', () => {
    const doubled: Collection = {
      ...demoEmptyCollection,
      endingsSeen: ['lichdom', 'lichdom', 'lichdom'],
    };
    show(doubled);
    expect(screen.getAllByLabelText(/^An ending you have not reached/)).toHaveLength(
      endings.length - 1,
    );
  });
});

describe('CollectionScreen · the filter', () => {
  it('narrows the relics to one faction', async () => {
    show(demoEmptyCollection);
    const covenant = factions[0];
    await userEvent.click(within(filters()).getByRole('button', { name: new RegExp(covenant.name.replace(/^The /, ''), 'i') }));
    expect(screen.getAllByLabelText(/^Undiscovered relic of /).length).toBeLessThan(artifacts.length);
    expect(screen.queryByRole('heading', { name: factions[1].name })).toBeNull();
  });

  it('leaves the endings section alone when relics are filtered', async () => {
    // The filter is scoped to the relic sections. If it ever starts filtering
    // the whole page, rule 6's "seven slots, always" quietly stops being true.
    show(demoEmptyCollection);
    await userEvent.click(within(filters()).getByRole('button', { name: new RegExp(factions[0].name.replace(/^The /, ''), 'i') }));
    expect(screen.getAllByLabelText(/^An ending you have not reached/)).toHaveLength(endings.length);
  });

  it('tracks which filter is active with aria-pressed', async () => {
    show(demoEmptyCollection);
    const all = within(filters()).getByRole('button', { name: /^all/i });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(filters()).getByRole('button', { name: new RegExp(factions[0].name.replace(/^The /, ''), 'i') }));
    expect(all).toHaveAttribute('aria-pressed', 'false');
  });
});
