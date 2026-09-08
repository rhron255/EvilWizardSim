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
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { artifacts } from '../content/artifacts';
import { factions } from '../content/factions';
import { lairs } from '../content/lairs';
import { demoRun, demoOffer, demoResolutionSuccess } from '../components/run/__fixtures__/demo';
import type { Resolution } from '../components/run/resolution';
import type { RunState, ThemeId } from '../types';
import { RunScreen } from './RunScreen';

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
 * Issue #18's tab state — where the disclosure guarantees `WizardHeader` used
 * to carry unconditionally now depend on the SCREEN choosing the right
 * default and putting it back after every era, since Career (the tab holding
 * the six-faction detail and the complete ledger) is not visible by default.
 */
describe('RunScreen · tab state', () => {
  it('opens on Decision, where the offer actually is', () => {
    show(demoRun);
    expect(screen.getByRole('tab', { name: 'Decision' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveAttribute('aria-selected', 'false');
  });

  it('lets the player switch to Career mid-era', async () => {
    show(demoRun);
    await userEvent.click(screen.getByRole('tab', { name: 'Career' }));
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('list', { name: 'Faction standing' })).toBeInTheDocument();
  });

  it('puts the player back on Decision after continuing an era, even from Career', async () => {
    const onContinue = vi.fn();
    const { rerender } = show(demoRun, 'default', demoResolutionSuccess, onContinue);
    await userEvent.click(screen.getByRole('tab', { name: 'Career' }));
    expect(screen.getByRole('tab', { name: 'Career' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);

    // The resolution overlay dismisses on the caller's own state change, not
    // here — simulate the next era's props the way `App`'s reducer would.
    rerender(
      <RunScreen
        run={demoRun}
        offer={demoOffer}
        resolution={null}
        lairs={lairs}
        artifacts={artifacts}
        factions={factions}
        onChoose={() => {}}
        onContinue={onContinue}
        defense={null}
        themeId="default"
      />,
    );
    expect(screen.getByRole('tab', { name: 'Decision' })).toHaveAttribute('aria-selected', 'true');
  });
});

/**
 * The regression a code review caught before this shipped: `Tabs` only ever
 * mounts the SELECTED panel's content, so `Ledger`'s old internal
 * `useState(false)` for "show every era" was silently discarded the instant
 * a player switched to Decision and back — an explicit tap undone with no
 * signal. `RunScreen` now owns that boolean so it survives the switch.
 */
describe('RunScreen · the ledger stays expanded across a tab switch', () => {
  it('remembers "show every era" after leaving Career and coming back', async () => {
    show(demoRun);
    await userEvent.click(screen.getByRole('tab', { name: 'Career' }));
    await userEvent.click(screen.getByRole('button', { name: /eras/i }));
    expect(screen.getByRole('button', { name: /eras/i })).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('tab', { name: 'Decision' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Career' }));
    expect(screen.getByRole('button', { name: /eras/i })).toHaveAttribute('aria-expanded', 'true');
  });
});
