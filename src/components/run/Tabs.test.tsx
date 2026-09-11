/**
 * The tabs primitive is generic, but three things about it are load-bearing
 * for the callers issue #18 hands it: the inactive panel's content must not
 * merely be hidden but actually unmounted (a caller's panel is expected to
 * carry its own keydown listeners and effects that must not run offscreen),
 * roving tabindex must land Tab-key navigation on the active tab first, and
 * arrow keys must both move focus and select in the same action (automatic
 * activation).
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';
import type { TabItem } from './Tabs';

const tabs: TabItem[] = [
  { id: 'decision', label: 'Decision', panel: <p>Decision panel content</p> },
  { id: 'career', label: 'Career', panel: <p>Career panel content</p> },
];

const show = (selected = 'decision') => {
  const onSelect = vi.fn();
  const { container } = render(
    <Tabs tabs={tabs} selected={selected} onSelect={onSelect} label="Run screen" />,
  );
  return { onSelect, user: userEvent.setup(), wrap: container.firstElementChild! };
};

/** A single-finger drag from (startX, startY) to (endX, endY), lifted. */
const swipe = (
  el: Element,
  start: { x: number; y: number },
  end: { x: number; y: number },
  fingersStillDown = 0,
) => {
  fireEvent.touchStart(el, { touches: [{ clientX: start.x, clientY: start.y }] });
  fireEvent.touchEnd(el, {
    changedTouches: [{ clientX: end.x, clientY: end.y }],
    touches: Array.from({ length: fingersStillDown }, () => ({ clientX: end.x, clientY: end.y })),
  });
};

describe('Tabs · structure', () => {
  it('renders a tablist with the given label, and one tab per item', () => {
    show();
    expect(screen.getByRole('tablist', { name: 'Run screen' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Decision' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Career' })).toBeInTheDocument();
  });

  it('marks the selected tab and only the selected tab as aria-selected', () => {
    show('decision');
    expect(screen.getByRole('tab', { name: 'Decision' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveAttribute('aria-selected', 'false');
  });

  it('uses roving tabindex: 0 on the selected tab, -1 on the rest', () => {
    show('decision');
    expect(screen.getByRole('tab', { name: 'Decision' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveAttribute('tabIndex', '-1');
  });
});

describe('Tabs · panel mounting', () => {
  it('mounts only the selected panel content — the other is absent, not just hidden', () => {
    show('decision');
    expect(screen.getByText('Decision panel content')).toBeInTheDocument();
    expect(screen.queryByText('Career panel content')).not.toBeInTheDocument();
  });

  it('flips which panel is mounted when the selected tab changes', () => {
    const { rerender } = render(
      <Tabs tabs={tabs} selected="decision" onSelect={vi.fn()} label="Run screen" />,
    );
    expect(screen.queryByText('Career panel content')).not.toBeInTheDocument();

    rerender(<Tabs tabs={tabs} selected="career" onSelect={vi.fn()} label="Run screen" />);
    expect(screen.getByText('Career panel content')).toBeInTheDocument();
    expect(screen.queryByText('Decision panel content')).not.toBeInTheDocument();
  });
});

describe('Tabs · interaction', () => {
  it('clicking the non-selected tab calls onSelect with its id', async () => {
    const { onSelect, user } = show('decision');
    await user.click(screen.getByRole('tab', { name: 'Career' }));
    expect(onSelect).toHaveBeenCalledWith('career');
  });

  it('ArrowRight from the first tab moves focus to and selects the second', async () => {
    const { onSelect } = show('decision');
    screen.getByRole('tab', { name: 'Decision' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith('career');
  });

  it('ArrowLeft from the first tab wraps around to the last', async () => {
    const { onSelect } = show('decision');
    screen.getByRole('tab', { name: 'Decision' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith('career');
  });
});

describe('Tabs · direction-aware transition', () => {
  it('marks the wrapper forward when moving to a later tab', () => {
    const { container, rerender } = render(
      <Tabs tabs={tabs} selected="decision" onSelect={vi.fn()} label="Run screen" />,
    );
    rerender(<Tabs tabs={tabs} selected="career" onSelect={vi.fn()} label="Run screen" />);
    expect(container.firstElementChild).toHaveAttribute('data-direction', 'forward');
  });

  it('marks the wrapper backward when moving to an earlier tab', () => {
    const { container, rerender } = render(
      <Tabs tabs={tabs} selected="career" onSelect={vi.fn()} label="Run screen" />,
    );
    rerender(<Tabs tabs={tabs} selected="decision" onSelect={vi.fn()} label="Run screen" />);
    expect(container.firstElementChild).toHaveAttribute('data-direction', 'backward');
  });

  it('keeps the direction from the last actual move across an unrelated re-render', () => {
    // `tabs` is a fresh array literal below, the way RunScreen passes one on
    // every render — this must not read as a "backward" move just because
    // `selected` is technically unchanged from the caller's own identity churn.
    const { container, rerender } = render(
      <Tabs tabs={tabs} selected="decision" onSelect={vi.fn()} label="Run screen" />,
    );
    rerender(<Tabs tabs={tabs} selected="career" onSelect={vi.fn()} label="Run screen" />);
    rerender(<Tabs tabs={[...tabs]} selected="career" onSelect={vi.fn()} label="Run screen" />);
    expect(container.firstElementChild).toHaveAttribute('data-direction', 'forward');
  });
});

describe('Tabs · swipe', () => {
  it('a leftward swipe selects the next tab', () => {
    const { onSelect, wrap } = show('decision');
    swipe(wrap, { x: 300, y: 400 }, { x: 200, y: 400 });
    expect(onSelect).toHaveBeenCalledWith('career');
  });

  it('a rightward swipe selects the previous tab', () => {
    const { onSelect, wrap } = show('career');
    swipe(wrap, { x: 100, y: 400 }, { x: 200, y: 400 });
    expect(onSelect).toHaveBeenCalledWith('decision');
  });

  it('does not fire on a short drag — a tap must not be read as a swipe', () => {
    const { onSelect, wrap } = show('decision');
    swipe(wrap, { x: 300, y: 400 }, { x: 280, y: 400 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not fire on a mostly-vertical drag — a scroll must not be read as a swipe', () => {
    const { onSelect, wrap } = show('decision');
    // Horizontal distance alone clears the swipe threshold, but the vertical
    // drift is larger still — this is a scroll that wandered sideways, not a
    // swipe that wandered vertically.
    swipe(wrap, { x: 300, y: 200 }, { x: 200, y: 500 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not fire when the drag is not horizontally dominant, even inside both absolute thresholds', () => {
    // 50px sideways clears SWIPE_MIN_DISTANCE and 59px vertically clears
    // SWIPE_MAX_OFF_AXIS on their own, but the vertical leg is still the
    // larger of the two — closer to a scroll than a swipe (Codex review,
    // PR #28).
    const { onSelect, wrap } = show('decision');
    swipe(wrap, { x: 300, y: 200 }, { x: 250, y: 259 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not fire past the last tab — swiping left on Career does not wrap', () => {
    const { onSelect, wrap } = show('career');
    swipe(wrap, { x: 300, y: 400 }, { x: 200, y: 400 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not fire while a second finger is still down', () => {
    const { onSelect, wrap } = show('decision');
    swipe(wrap, { x: 300, y: 400 }, { x: 200, y: 400 }, 1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
