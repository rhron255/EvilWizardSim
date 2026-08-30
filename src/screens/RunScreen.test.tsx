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
import { render } from '@testing-library/react';
import { artifacts } from '../content/artifacts';
import { factions } from '../content/factions';
import { lairs } from '../content/lairs';
import { demoRun, demoOffer } from '../components/run/__fixtures__/demo';
import type { RunState, ThemeId } from '../types';
import { RunScreen } from './RunScreen';

const show = (run: RunState, themeId: ThemeId = 'default') =>
  render(
    <RunScreen
      run={run}
      offer={demoOffer}
      resolution={null}
      lairs={lairs}
      artifacts={artifacts}
      factions={factions}
      onChoose={() => {}}
      onContinue={() => {}}
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
