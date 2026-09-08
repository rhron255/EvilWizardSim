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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';
import type { TabItem } from './Tabs';

const tabs: TabItem[] = [
  { id: 'decision', label: 'Decision', panel: <p>Decision panel content</p> },
  { id: 'career', label: 'Career', panel: <p>Career panel content</p> },
];

const show = (selected = 'decision') => {
  const onSelect = vi.fn();
  render(<Tabs tabs={tabs} selected={selected} onSelect={onSelect} label="Run screen" />);
  return { onSelect, user: userEvent.setup() };
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
