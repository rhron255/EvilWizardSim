/**
 * The visible gap is the point.
 *
 * wiki/02: all thirty relic slots show from run one, undiscovered ones as
 * silhouettes with the name hidden. CLAUDE.md rule 6 says the same for the
 * seven endings. Both are promises that only hold if nothing is collapsed,
 * paginated, or filtered away — and the one that is easy to break silently is
 * a locked card LEAKING the name it is supposed to be withholding. The
 * Factions and Mechanics tabs added for issue #66 carry the same spoiler
 * discipline for a different reason: they are static reference prose, but
 * prose that so much as hints at an ending name or a locked threshold would
 * leak exactly what the redacted slots below are withholding.
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
import { mechanics } from '../content/mechanics';
import { emptyCollection } from '../engine';
import type { Collection } from '../types';
import { NecrolexiconScreen } from './NecrolexiconScreen';

/** A veteran's collection: some relics found, three endings seen. */
const demoCollection: Collection = {
  ...emptyCollection(),
  discoveredArtifactIds: [
    artifacts[0].id,
    artifacts[1].id,
    artifacts[2].id,
  ],
  endingsSeen: ['slain_by_chosen_one', 'retired_to_swamp', 'betrayed_by_apprentice'],
  runsCompleted: 23,
  tutorialSeen: true,
  lastWizardName: 'Malvorn Ashgrave',
  bestNotoriety: 88,
  selectedThemeId: 'retired_to_swamp',
};

/** Run one: nothing found yet. The gap is the point. */
const demoEmptyCollection: Collection = emptyCollection();

const show = (collection: Collection) => {
  const onBack = vi.fn();
  const view = render(
    <NecrolexiconScreen
      collection={collection}
      artifacts={artifacts}
      factions={factions}
      endings={endings}
      mechanics={mechanics}
      onBack={onBack}
      onViewThemes={vi.fn()}
    />,
  );
  return { onBack, container: view.container };
};

const tabs = () => screen.getByRole('tablist', { name: /necrolexicon sections/i });
const goTo = (name: RegExp) => userEvent.click(within(tabs()).getByRole('tab', { name }));
const filters = () => screen.getByRole('navigation', { name: /filter relics/i });

describe('NecrolexiconScreen · the tabs', () => {
  it('opens on Factions, and switches on click', async () => {
    show(demoEmptyCollection);
    expect(within(tabs()).getByRole('tab', { name: /factions/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await goTo(/mechanics/i);
    expect(within(tabs()).getByRole('tab', { name: /mechanics/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tabs()).getByRole('tab', { name: /factions/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});

describe('NecrolexiconScreen · factions', () => {
  it('introduces every faction with its own name and demands', () => {
    show(demoEmptyCollection);
    for (const f of factions) {
      expect(screen.getByRole('heading', { name: f.name })).toBeInTheDocument();
      expect(screen.getByText(f.demands)).toBeInTheDocument();
    }
  });
});

describe('NecrolexiconScreen · mechanics', () => {
  it('explains every mechanic entry without requiring discovery', async () => {
    show(demoEmptyCollection);
    await goTo(/^mechanics$/i);
    for (const m of mechanics) {
      expect(screen.getByRole('heading', { name: m.name })).toBeInTheDocument();
      expect(screen.getByText(m.blurb)).toBeInTheDocument();
    }
  });

  it('never names an ending or a relic the player has not found', async () => {
    // Mechanics prose is reference material, not a walkthrough — it must not
    // smuggle a spoiler in through the one tab that has no discovery gate.
    const { container } = show(demoEmptyCollection);
    await goTo(/^mechanics$/i);
    const text = container.textContent ?? '';
    for (const e of endings) {
      expect(text, `leaked ${e.id}`).not.toContain(e.name);
    }
    for (const a of artifacts) {
      expect(text, `leaked ${a.id}`).not.toContain(a.name);
    }
  });
});

describe('NecrolexiconScreen · the grid shows everything from run one', () => {
  it('renders all thirty-two slots for a player who has found nothing', async () => {
    show(demoEmptyCollection);
    await goTo(/^relics$/i);
    const locked = screen.getAllByLabelText(/^Undiscovered relic of /);
    expect(locked).toHaveLength(artifacts.length);
    expect(artifacts.length).toBe(32);
  });

  it('does not leak the name of a relic it is withholding', async () => {
    // The redaction is the whole mechanic. A locked card that still renders its
    // name in a hidden node hands the grid away to anyone who selects the page.
    const { container } = show(demoEmptyCollection);
    await goTo(/^relics$/i);
    const text = container.textContent ?? '';
    for (const a of artifacts) {
      expect(text, `leaked ${a.id}`).not.toContain(a.name);
    }
  });

  it('names a relic once it has been found', async () => {
    show(demoCollection);
    await goTo(/^relics$/i);
    const found = artifacts.find((a) => demoCollection.discoveredArtifactIds.includes(a.id))!;
    expect(screen.getByText(found.name)).toBeInTheDocument();
  });

  it('keeps all six faction groups even when a player has found nothing', async () => {
    show(demoEmptyCollection);
    await goTo(/^relics$/i);
    for (const f of factions) {
      expect(screen.getAllByRole('heading', { name: f.name }).length).toBeGreaterThan(0);
    }
  });
});

describe('NecrolexiconScreen · the seven endings', () => {
  it('shows every ending slot from run one, unopened', async () => {
    show(demoEmptyCollection);
    await goTo(/^endings$/i);
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

  it('withholds the name of an ending not yet reached', async () => {
    const { container } = show(demoEmptyCollection);
    await goTo(/^endings$/i);
    const text = container.textContent ?? '';
    for (const e of endings) {
      expect(text, `leaked ${e.id}`).not.toContain(e.name);
    }
  });

  it('counts distinct endings, so a repeat does not inflate the total', async () => {
    const doubled: Collection = {
      ...demoEmptyCollection,
      endingsSeen: ['lichdom', 'lichdom', 'lichdom'],
    };
    show(doubled);
    await goTo(/^endings$/i);
    expect(screen.getAllByLabelText(/^An ending you have not reached/)).toHaveLength(
      endings.length - 1,
    );
  });
});

describe('NecrolexiconScreen · the relic filter', () => {
  it('narrows the relics to one faction', async () => {
    show(demoEmptyCollection);
    await goTo(/^relics$/i);
    const covenant = factions[0];
    await userEvent.click(
      within(filters()).getByRole('button', {
        name: new RegExp(covenant.name.replace(/^The /, ''), 'i'),
      }),
    );
    expect(screen.getAllByLabelText(/^Undiscovered relic of /).length).toBeLessThan(
      artifacts.length,
    );
    expect(screen.queryByRole('heading', { name: factions[1].name })).toBeNull();
  });

  it('tracks which filter is active with aria-pressed', async () => {
    show(demoEmptyCollection);
    await goTo(/^relics$/i);
    const all = within(filters()).getByRole('button', { name: /^all/i });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(
      within(filters()).getByRole('button', {
        name: new RegExp(factions[0].name.replace(/^The /, ''), 'i'),
      }),
    );
    expect(all).toHaveAttribute('aria-pressed', 'false');
  });
});
