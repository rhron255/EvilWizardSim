/**
 * The guide is shown once, so every way out of it has to work the first time.
 *
 * It is also the one piece of UI in the game whose whole job is to be
 * dismissed: a Skip that does not persist, or a last card whose button still
 * says "Next", strands a new player on a modal over the game they came to
 * play.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstRunGuide } from './FirstRunGuide';

const open = () => {
  const onDismiss = vi.fn();
  render(<FirstRunGuide onDismiss={onDismiss} />);
  return { onDismiss, user: userEvent.setup() };
};

const next = () => screen.getByRole('button', { name: /next|begin/i });

describe('FirstRunGuide', () => {
  it('opens on the loop, and on the rule the loop rests on', () => {
    open();
    expect(screen.getByRole('heading', { name: 'One era at a time' })).toBeInTheDocument();
    expect(screen.getByText(/prints its odds and both outcomes/)).toBeInTheDocument();
  });

  it('walks all three cards and then dismisses', async () => {
    const { onDismiss, user } = open();

    await user.click(next());
    expect(screen.getByRole('heading', { name: 'The same six, every run' })).toBeInTheDocument();

    await user.click(next());
    expect(screen.getByRole('heading', { name: 'Each one says what it does' })).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    await user.click(next());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('says Begin on the last card, not Next', async () => {
    const { user } = open();
    // The ↵ hint is aria-hidden, so the accessible name is the word alone.
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    await user.click(next());
    await user.click(next());
    expect(screen.getByRole('button', { name: 'Begin' })).toBeInTheDocument();
  });

  it('lets a player out at the first card', async () => {
    const { onDismiss, user } = open();
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('drops Skip on the last card, where it would mean the same as Begin', async () => {
    const { user } = open();
    await user.click(next());
    await user.click(next());
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('dismisses on Escape from anywhere', async () => {
    const { onDismiss, user } = open();
    await user.click(next());
    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not teach the prophecy, which is a reveal and not a mechanic', () => {
    // wiki/04 forbids announcing the decline. A tutorial card is still an
    // announcement, and the interstitial is the moment that teaches this.
    open();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/prophecy|decline|chosen one/i);
  });
});
