/**
 * The selector.
 *
 * The rules it has to keep are the collection's rules: every theme visible
 * from run one, the unearned ones withholding their name but showing the
 * pressure that leads to them, and the default never locked. Those are
 * assertions about what a player can SEE and TAP, which is why they are tested
 * against rendered output rather than against the theme table.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Collection } from '../types';
import { endings } from '../content/endings';
import { THEMES } from '../theme/themes';
import { emptyCollection } from '../engine/persistence';
import { ThemeScreen } from './ThemeScreen';

function show(over: Partial<Collection> = {}) {
  const onSelect = vi.fn();
  const onBack = vi.fn();
  const collection: Collection = { ...emptyCollection(), ...over };
  const view = render(
    <ThemeScreen
      collection={collection}
      endings={endings}
      onSelect={onSelect}
      onBack={onBack}
    />,
  );
  return { ...view, onSelect, onBack };
}

describe('ThemeScreen · what is on the page', () => {
  it('shows every theme from run one, locked or not', () => {
    show();
    // Eight swatches plus Back and the footer button. The count that matters
    // is that no theme is absent — the visible gap is the point.
    const locked = screen.getAllByRole('button', { name: /have not unlocked/i });
    expect(locked).toHaveLength(THEMES.length - 1);
    expect(screen.getByRole('button', { name: /^The Tower/ })).toBeInTheDocument();
  });

  it('never locks the default, on a collection with nothing in it', () => {
    show();
    const tower = screen.getByRole('button', { name: /^The Tower/ });
    expect(tower).not.toBeDisabled();
  });

  it('withholds a locked theme name and shows its ending hint instead', () => {
    show();
    // The Cold Room name must not be on the page for a player who has never
    // been a lich — that is the reveal the collection slot also withholds.
    expect(screen.queryByText('Cold Room')).not.toBeInTheDocument();

    const lichHint = endings.find((e) => e.id === 'lichdom')!.hint;
    expect(screen.getByText(lichHint)).toBeInTheDocument();
  });

  it('names a theme once its ending has been reached', () => {
    show({ endingsSeen: ['lichdom'] });
    expect(screen.getByText('Cold Room')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cold Room/ })).not.toBeDisabled();
  });

  it('counts what is unlocked against the whole set', () => {
    show({ endingsSeen: ['lichdom', 'ascension'] });
    // Default + two earned.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(String(THEMES.length))).toBeInTheDocument();
  });
});

describe('ThemeScreen · choosing', () => {
  it('reports the id when an unlocked swatch is tapped', async () => {
    const user = userEvent.setup();
    const { onSelect } = show({ endingsSeen: ['lichdom'] });

    await user.click(screen.getByRole('button', { name: /^Cold Room/ }));
    expect(onSelect).toHaveBeenCalledWith('lichdom');
  });

  it('cannot be tapped while locked', async () => {
    const user = userEvent.setup();
    const { onSelect } = show();

    const locked = screen.getAllByRole('button', { name: /have not unlocked/i })[0];
    expect(locked).toBeDisabled();
    await user.click(locked);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('marks the one being worn, and only that one', () => {
    show({ endingsSeen: ['lichdom'], selectedThemeId: 'lichdom' });
    expect(screen.getByText('Worn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cold Room, currently worn/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^The Tower$/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('applies the worn theme to its own root, so the page previews itself', () => {
    const { container } = show({ endingsSeen: ['ascension'], selectedThemeId: 'ascension' });
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'ascension');
  });

  it('leaves the root unthemed for the default', () => {
    const { container } = show();
    expect(container.firstElementChild).not.toHaveAttribute('data-theme');
  });
});

describe('ThemeScreen · getting out', () => {
  it('has two ways back, and both work', async () => {
    const user = userEvent.setup();
    const { onBack } = show();

    await user.click(screen.getByRole('button', { name: /← Back/ }));
    await user.click(screen.getByRole('button', { name: /Back to the title/ }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});

describe('ThemeScreen · the swatch preview', () => {
  it('draws a locked theme’s palette without naming it', () => {
    // Colours are not a spoiler; the NAME and the ending are. A locked swatch
    // that drew nothing would make seven identical grey cards, which is the
    // defect the ending slots already learned from.
    const { container } = show();
    const locked = screen.getAllByRole('button', { name: /have not unlocked/i })[0];
    const bands = locked.querySelectorAll('span[style*="background"]');
    expect(bands.length).toBe(4);
    expect(container.querySelectorAll('span[style*="background"]').length).toBe(
      THEMES.length * 4,
    );
  });
});
