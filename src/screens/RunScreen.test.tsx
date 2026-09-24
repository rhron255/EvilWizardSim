/**
 * Undeath cools the room.
 *
 * `isLich` was mechanically enormous and visually silent — that is why the
 * lichdom ending was reported as arriving from nowhere. The header now says
 * what you are; this is the other half, and it is the half you feel before you
 * read anything: every surface token shifts cold, so the whole screen goes
 * violet the moment the rite resolves.
 *
 * Pinned here rather than left to the eye because it is a `data-` attribute
 * driving a stylesheet — jsdom cannot see the colour, but it can see whether
 * the switch is thrown, and a switch that stops being thrown is exactly the
 * kind of silent regression this repo keeps producing.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentBundle } from '../engine';
import { artifacts, endings, epithets, factions, lairs, offers, origins } from '../content';
import { demoRun, demoOffer } from '../components/run/__fixtures__/demo';
import type { Resolution } from '../components/run/resolution';
import type { RunState, ThemeId } from '../types';
import { RunScreen } from './RunScreen';

// Mirrors `App.tsx`'s own `CONTENT` — the real catalog, frozen once here
// rather than rebuilt per test.
const content: ContentBundle = { factions, artifacts, lairs, origins, endings, offers, epithets };

const show = (
  run: RunState,
  themeId: ThemeId = 'default',
  resolution: Resolution | null = null,
  onContinue: () => void = () => {},
) =>
  render(
    <RunScreen
      run={run}
      offer={demoOffer}
      resolution={resolution}
      lairs={lairs}
      artifacts={artifacts}
      factions={factions}
      content={content}
      onChoose={() => {}}
      onContinue={onContinue}
      defense={null}
      themeId={themeId}
    />,
  );

describe('RunScreen · the lich tint', () => {
  it('leaves a living wizard warm', () => {
    const { container } = show({ ...demoRun, isLich: false } as RunState);
    expect(container.querySelector('[data-theme]')).toBeNull();
  });

  it('cools the whole screen once the rite is paid for', () => {
    const { container } = show({ ...demoRun, isLich: true } as RunState);
    expect(container.querySelector('[data-theme="lichdom"]')).not.toBeNull();
  });

  it('puts the switch on the screen root, so everything inside inherits it', () => {
    // The override is a block of surface custom properties. If it ever moves
    // off the root the resolution overlay stops inheriting and the card that
    // performs the transformation is the one card that does not show it.
    const { container } = show({ ...demoRun, isLich: true } as RunState);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('data-theme', 'lichdom');
  });
});

describe('RunScreen · the chosen theme', () => {
  it('wears what the player selected', () => {
    const { container } = show({ ...demoRun, isLich: false } as RunState, 'ascension');
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'ascension');
  });

  it('sets no attribute at all for the default, so :root stands', () => {
    // An empty `data-theme=""` would match no block and read as a thrown
    // switch that does nothing. Absence is the off state.
    const { container } = show({ ...demoRun, isLich: false } as RunState, 'default');
    expect(container.firstElementChild).not.toHaveAttribute('data-theme');
  });

  it('lets undeath outrank the wardrobe', () => {
    // The cold IS the report that the rite landed. A player wearing Peat who
    // becomes a lich must still see the room change, or the state that was
    // "mechanically enormous and visually silent" is silent again.
    const { container } = show({ ...demoRun, isLich: true } as RunState, 'retired_to_swamp');
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'lichdom');
  });
});

/**
 * Issue #36 collapsed the Decision/Career tab split into one screen: the six
 * faction standings and the decision content are both always on screen now,
 * with no tab control and nothing to switch between.
 */
describe('RunScreen · a single continuous screen', () => {
  it('shows faction standings and the offer with no tabs at all', () => {
    show(demoRun);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    // Collapsed to the two most extreme rows by default — see
    // FactionStandings.test.tsx for the full expand/collapse behavior.
    const strip = screen.getByRole('list', { name: 'Faction standing' });
    expect(within(strip).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: demoOffer.title })).toBeInTheDocument();
  });

  it('never renders a ledger', () => {
    show(demoRun);
    expect(screen.queryByText('The Ledger')).toBeNull();
  });
});

/**
 * The relic page (issue #78) is an optional view swapped in for the decision
 * content, reached from the Relics stat and never persisted.
 */
describe('RunScreen · the relic page', () => {
  it('opens the relic page from the Relics stat and returns via Back', async () => {
    show(demoRun);
    const openButton = screen.getByRole('button', { name: /Relics · 5/ });
    await userEvent.click(openButton);

    expect(screen.getByRole('heading', { name: 'Your relics' })).toBeInTheDocument();
    // The decision content is gone while the relic page is open.
    expect(screen.queryByRole('heading', { name: demoOffer.title })).toBeNull();

    const backButton = screen.getAllByRole('button', { name: /Back to the decision/ })[0];
    await userEvent.click(backButton);

    expect(screen.queryByRole('heading', { name: 'Your relics' })).toBeNull();
    expect(screen.getByRole('heading', { name: demoOffer.title })).toBeInTheDocument();
  });

  it('keeps the faction standings on screen while the relic page is open', async () => {
    show(demoRun);
    await userEvent.click(screen.getByRole('button', { name: /Relics · 5/ }));
    expect(screen.getByRole('list', { name: 'Faction standing' })).toBeInTheDocument();
  });

  it('moves focus to the relic page heading on open, and back to the Relics button on close', async () => {
    show(demoRun);
    const openButton = screen.getByRole('button', { name: /Relics · 5/ });
    await userEvent.click(openButton);

    expect(screen.getByRole('heading', { name: 'Your relics' })).toHaveFocus();

    const backButton = screen.getAllByRole('button', { name: /Back to the decision/ })[0];
    await userEvent.click(backButton);

    expect(screen.getByRole('button', { name: /Relics · 5/ })).toHaveFocus();
  });

  it('opens with the keyboard (Enter) and returns with the keyboard too', async () => {
    show(demoRun);
    const openButton = screen.getByRole('button', { name: /Relics · 5/ });
    openButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('heading', { name: 'Your relics' })).toHaveFocus();

    const backButton = screen.getAllByRole('button', { name: /Back to the decision/ })[0];
    backButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: /Relics · 5/ })).toHaveFocus();
  });
});
