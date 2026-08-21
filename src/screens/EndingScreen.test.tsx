/**
 * The summary must name who ended you — and must not invent one when nobody did.
 *
 * The card named the ending and stopped, which wasted the fixed recurring cast:
 * `wiki/06_reference_analysis.md` buys recognition by reusing the same hero
 * bloodlines every run, and recognition cannot accrue from a name the payoff
 * screen never prints. The prophecy said it once, fifteen eras earlier.
 *
 * The half of this that is easy to regress is the OTHER half. Lichdom, the
 * swamp and Ascension are self-determined, and a future refactor that reaches
 * for a default — "Unknown", an em dash, the last faction to move — turns a
 * biography into a defeat, which `wiki/06` principle 8 forbids. So the absence
 * is asserted as hard as the presence: no node, no label, no placeholder.
 *
 * These render the real screen rather than calling `attributionFor` alone. A
 * mapping that is correct and never mounted is this repo's second-most-repeated
 * failure (CLAUDE.md § 2, "written but never wired"), and only a render catches
 * it.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EndingId, Faction, RunState } from '../types';
import { endings } from '../content/endings';
import { factions } from '../content/factions';
import { heroNameFor } from '../content/heroes';
import { ATTRIBUTION_LABEL, attributionFor } from '../components/meta';
import {
  demoArtifacts,
  demoLairs,
  demoRun,
} from '../components/meta/__fixtures__/demo';
import { EndingScreen } from './EndingScreen';

/**
 * jsdom ships no `matchMedia`, so the screen's reduced-motion probe returns
 * false and the reveal runs on timers outside `act`. Reporting `reduce` makes
 * the card mount whole and synchronous — the staged entrance is not what is
 * under test here, and a half-revealed card would test the timers instead.
 */
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

const ENDING_IDS: EndingId[] = [
  'slain_by_chosen_one',
  'sealed_in_gem',
  'betrayed_by_apprentice',
  'lichdom',
  'retired_to_swamp',
  'consumed_by_pact',
  'ascension',
];

/** Every id in the frozen union is covered — no ending gets to go unchecked. */
const SELF_DETERMINED: EndingId[] = ['lichdom', 'retired_to_swamp', 'ascension'];
const ATTRIBUTED: EndingId[] = [
  'slain_by_chosen_one',
  'sealed_in_gem',
  'betrayed_by_apprentice',
  'consumed_by_pact',
];

function show(endingId: EndingId, over: Partial<RunState> = {}, cast: Faction[] = factions) {
  const ending = endings.find((e) => e.id === endingId);
  if (!ending) throw new Error(`no such ending: ${endingId}`);
  const run: RunState = { ...demoRun, ending: endingId, ...over };
  return render(
    <EndingScreen
      run={run}
      ending={ending}
      lairs={demoLairs}
      artifacts={demoArtifacts}
      factions={cast}
      onPlayAgain={() => {}}
      onViewCollection={() => {}}
      onShare={() => {}}
    />,
  );
}

/** The rendered attribution, or null when the card shows none. */
function attributionOnScreen(container: HTMLElement): string | null {
  const node = container.querySelector('[data-attribution]');
  if (!node) return null;
  // The label is chrome; the agent is the payload.
  return (node.textContent ?? '').replace(ATTRIBUTION_LABEL, '').trim();
}

describe('EndingScreen attribution', () => {
  it('covers every ending in the frozen union', () => {
    // Guards the two lists below from drifting out of sync with types.ts.
    expect([...SELF_DETERMINED, ...ATTRIBUTED].sort()).toEqual([...ENDING_IDS].sort());
    expect(ENDING_IDS).toHaveLength(endings.length);
  });

  it('names the seed-determined hero for slain_by_chosen_one', () => {
    // 741_853_902 % 8 === 6 → the seventh bloodline. A rematch on a seed shows
    // the same killer, which is the entire point of the fixed cast.
    const { container } = show('slain_by_chosen_one', { seed: 741_853_902 });
    expect(attributionOnScreen(container)).toBe('Perrin of the Late Harvest');
    expect(screen.getByText('Perrin of the Late Harvest')).toBeInTheDocument();
  });

  it('follows the seed rather than a fixed string', () => {
    const a = show('slain_by_chosen_one', { seed: 1 });
    expect(attributionOnScreen(a.container)).toBe(heroNameFor(1));
    a.unmount();

    const b = show('slain_by_chosen_one', { seed: 2 });
    expect(attributionOnScreen(b.container)).toBe(heroNameFor(2));

    expect(heroNameFor(1)).not.toBe(heroNameFor(2));
  });

  it('credits the Pale Academy for sealed_in_gem', () => {
    const { container } = show('sealed_in_gem');
    expect(attributionOnScreen(container)).toBe('The Pale Academy');
  });

  it('credits the Ashen Covenant for consumed_by_pact', () => {
    const { container } = show('consumed_by_pact');
    expect(attributionOnScreen(container)).toBe('The Ashen Covenant');
  });

  it('credits an unnamed apprentice for betrayed_by_apprentice', () => {
    const { container } = show('betrayed_by_apprentice');
    expect(attributionOnScreen(container)).toBe('An apprentice');
  });

  it('takes faction names from the prop, never from a literal', () => {
    // The engine takes a ContentBundle; a content pack may rename the six.
    const renamed = factions.map((f) =>
      f.id === 'pale_academy' ? { ...f, name: 'The Chalk Collegium' } : f,
    );
    const { container } = show('sealed_in_gem', {}, renamed);
    expect(attributionOnScreen(container)).toBe('The Chalk Collegium');
    expect(screen.queryByText('The Pale Academy')).not.toBeInTheDocument();
  });

  // ---- the half that matters most -----------------------------------------

  it.each(SELF_DETERMINED)('renders NO attribution for %s', (endingId) => {
    const { container } = show(endingId);

    // No node at all — not an empty one, not a placeholder.
    expect(container.querySelector('[data-attribution]')).toBeNull();
    expect(attributionOnScreen(container)).toBeNull();

    // And no orphaned caption left behind.
    expect(screen.queryByText(ATTRIBUTION_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(/at the hands of/i)).not.toBeInTheDocument();

    // The ending itself still renders, so this is an absent agent rather than
    // an absent section.
    const ending = endings.find((e) => e.id === endingId)!;
    expect(screen.getByRole('heading', { name: ending.name })).toBeInTheDocument();
  });

  it.each(SELF_DETERMINED)('names no hero and no faction for %s', (endingId) => {
    const { container } = show(endingId, { seed: 741_853_902 });
    const text = container.textContent ?? '';

    // Not merely "no attribution element" — the killer's name is nowhere on the
    // card. This is what fails if someone folds the agent into another line.
    expect(text).not.toContain(heroNameFor(741_853_902));
    expect(text).not.toContain('An apprentice');
  });
});

describe('attributionFor', () => {
  const ctx = { heroName: 'Wren Ambermoor', factions };

  it.each(ATTRIBUTED)('returns an agent for %s', (endingId) => {
    expect(attributionFor(endingId, ctx)).toBeTruthy();
  });

  it.each(SELF_DETERMINED)('returns null for %s', (endingId) => {
    expect(attributionFor(endingId, ctx)).toBeNull();
  });

  it('returns null rather than a broken half-sentence for an absent faction', () => {
    const withoutAcademy = factions.filter((f) => f.id !== 'pale_academy');
    expect(attributionFor('sealed_in_gem', { ...ctx, factions: withoutAcademy })).toBeNull();
  });

  it('returns null rather than a bare label for an empty hero name', () => {
    expect(attributionFor('slain_by_chosen_one', { ...ctx, heroName: '   ' })).toBeNull();
  });
});
