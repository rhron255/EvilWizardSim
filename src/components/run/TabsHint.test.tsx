/**
 * The one-time swipe hint: what it says, that the dismiss button and the
 * unattended timeout both actually fire `onDismiss`, and that an unmount
 * before the timeout elapses does not fire it late.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabsHint } from './TabsHint';

describe('TabsHint', () => {
  it('names the gesture it is teaching', () => {
    render(<TabsHint onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Swipe sideways to switch between Decision and Career.',
    );
  });

  it('dismisses on tap without waiting for the timeout', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<TabsHint onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: /dismiss hint/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('lets a tap on its own body pass through to whatever is underneath', () => {
    // The toast overlaps the bottom option card at 393px (accepted — see the
    // doc comment on TabsHint.tsx) but must not eat a tap meant for that
    // card for up to six seconds (Codex review, PR #28). Only the dismiss
    // button below opts back in.
    render(<TabsHint onDismiss={vi.fn()} />);
    expect(getComputedStyle(screen.getByRole('status')).pointerEvents).toBe('none');
    expect(
      getComputedStyle(screen.getByRole('button', { name: /dismiss hint/i })).pointerEvents,
    ).toBe('auto');
  });

  describe('the unattended timeout', () => {
    afterEach(() => vi.useRealTimers());

    it('dismisses itself if left unattended long enough to have been read', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(<TabsHint onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(6000);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not fire early', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(<TabsHint onDismiss={onDismiss} />);
      vi.advanceTimersByTime(5999);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('does not fire after the caller has already unmounted it', () => {
      // The caller unmounts this the instant `showTabsHint` goes false — via
      // the dismiss button, or via RunScreen's own tab-switch handler. A
      // leaked timer firing after that would call `onDismiss` on a component
      // that believes it already has, which is harmless here only because
      // the reducer is idempotent; the timer should still be gone.
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      const { unmount } = render(<TabsHint onDismiss={onDismiss} />);
      unmount();
      vi.advanceTimersByTime(6000);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
