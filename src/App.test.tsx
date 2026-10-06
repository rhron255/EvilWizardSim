/**
 * The composition root's own behaviour — the little it has.
 *
 * `App` holds no game state (wiki/03 § Ownership rules), so almost everything
 * that matters about it is pinned where the state lives. What is left is what
 * only the router can do: it is the one place that knows a screen CHANGED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { emptyCollection, saveChangelogAck, saveCollection, saveInProgressRun } from './engine';
import { gameReducer } from './engine/useGame';
import { REAL_CONTENT as content } from './testing/realContent';
import { BUILD_VERSION } from './version';
import type { RunState } from './types';

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('App · scroll position across screens', () => {
  // The document is the scroll container for every screen, so its position
  // outlives the screen that set it. Measured in a real browser at 320px: the
  // prophecy set piece opened 189px down the page, because the run screen
  // before it had been scrolled to reach the lower choice cards.
  it('returns to the top when the screen changes', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<App />);
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /begin a career/i }));

    expect(screen.getByRole('textbox')).toBeInTheDocument(); // the creation screen
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not touch the scroll position when nothing changed screen', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const { rerender } = render(<App />);
    scrollTo.mockClear();

    rerender(<App />);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});

type State = Parameters<typeof gameReducer>[0];

/**
 * A real career, played by the real reducer on the real catalog, stopped with
 * one era left — so the test below reaches an ending in one choice, through
 * the same screens a player does, without knowing in advance which ending.
 */
function careerWithOneEraLeft(): RunState {
  for (let seed = 1; seed <= 60; seed++) {
    let s: State = gameReducer(
      {
        screen: 'title',
        run: null,
        offer: null,
        resolution: null,
        collection: emptyCollection(''),
        prophecyPending: false,
        resumable: null,
        unlockedTheme: null,
      },
      {
        type: 'create',
        name: 'Malvorn Ashgrave',
        epithet: '',
        originId: content.origins[0].id,
        eraCount: 4,
        seed,
        content,
      },
    );
    for (let step = 0; step < 40 && s.run && !s.run.ending; step++) {
      if (s.screen === 'prophecy') s = gameReducer(s, { type: 'acknowledgeProphecy', content });
      else if (s.resolution) s = gameReducer(s, { type: 'continue', content });
      else if (s.run.eraIndex === s.run.eraCount - 1) return s.run;
      else {
        const before = s;
        for (let i = 0; i < 4 && s === before; i++) {
          s = gameReducer(s, { type: 'choose', optionIndex: i, content });
        }
        if (s === before) break;
      }
    }
  }
  throw new Error('no seed gave a four-era career that survived to its last era');
}

/** A returning player: guide seen, this build's changelog read. */
function returningPlayer(run?: RunState): void {
  saveCollection({ ...emptyCollection(''), tutorialSeen: true });
  saveChangelogAck(BUILD_VERSION);
  if (run) saveInProgressRun(run);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('App · the Necrolexicon marks the ending just reached', () => {
  it('opens on the ending card\'s own ending, marked in words and brought into view', async () => {
    returningPlayer(careerWithOneEraLeft());
    const intoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { container } = render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /resume run/i }));
    const option = container.querySelector<HTMLButtonElement>(
      'button[data-option-index]:not([disabled])',
    );
    expect(option, 'the last era offers nothing to choose').not.toBeNull();
    await userEvent.click(option!);
    await userEvent.click(screen.getByRole('button', { name: /^continue/i }));

    // The ending card is the anchor: whatever this career concluded as, the
    // card names it, and the Necrolexicon must mark that one — not a name the
    // test or the Necrolexicon supplied.
    const reached = screen.getByRole('heading', { level: 2 }).textContent ?? '';
    expect(reached).not.toBe('');
    await userEvent.click(screen.getByRole('button', { name: /view necrolexicon/i }));

    expect(screen.getByRole('tab', { name: /^endings$/i })).toHaveAttribute('aria-selected', 'true');
    const slot = screen.getByRole('article', {
      name: new RegExp(`^Just reached: ${escape(reached)} — `),
    });
    // In words on the card, not only in the tier colour — and on one card.
    expect(within(slot).getByText(/^just reached$/i)).toBeVisible();
    expect(screen.getAllByText(/^just reached$/i)).toHaveLength(1);
    await waitFor(() => expect(intoView.mock.contexts).toContain(slot));
  });

  it('marks nothing once the player has gone back to the title', async () => {
    returningPlayer(careerWithOneEraLeft());
    const { container } = render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /resume run/i }));
    await userEvent.click(
      container.querySelector<HTMLButtonElement>('button[data-option-index]:not([disabled])')!,
    );
    await userEvent.click(screen.getByRole('button', { name: /^continue/i }));
    await userEvent.click(screen.getByRole('button', { name: /view necrolexicon/i }));
    expect(screen.getAllByText(/^just reached$/i)).toHaveLength(1);

    // Back to the title drops the finished run, so the next visit is a plain
    // one: it opens where it always does, and no slot claims to be new.
    await userEvent.click(screen.getByRole('button', { name: /back to the title/i }));
    await userEvent.click(screen.getByRole('button', { name: /^necrolexicon/i }));
    expect(screen.getByRole('tab', { name: /^factions$/i })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: /^endings$/i }));
    expect(screen.queryByText(/^just reached$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /^just reached/i })).not.toBeInTheDocument();
  });
});
