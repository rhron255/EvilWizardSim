/**
 * The composition root's own behaviour — the little it has.
 *
 * `App` holds no game state (wiki/03 § Ownership rules), so almost everything
 * that matters about it is pinned where the state lives. What is left is what
 * only the router can do: it is the one place that knows a screen CHANGED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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
