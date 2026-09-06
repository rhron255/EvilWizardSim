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
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EndingId, Faction, RunState } from '../types';
import { endings } from '../content/endings';
import { factions } from '../content/factions';
import { heroNameFor } from '../content/heroes';
import { ATTRIBUTION_LABEL, attributionFor } from '../components/meta';
import { LEADERSHIP_BY_FACTION, REPRISAL_BY_FACTION } from '../engine';
import {
  demoArtifacts,
  demoLairs,
  demoRun,
} from '../components/meta/__fixtures__/demo';
import { EndingScreen } from './EndingScreen';
import type { EndingScreenProps } from './EndingScreen';

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
  'eternally_repurposed',
  'liquidated',
  'turned_to_fertilizer',
  'exiled_and_overrun',
  'consumed',
  'contract_writer',
  'grand_arbiter',
  'archmage',
  'archdruid',
  'overthrown_the_kingdom',
  'good_wizard',
  'arch_lich',
];

/** Every id in the frozen union is covered — no ending gets to go unchecked. */
const SELF_DETERMINED: EndingId[] = [
  'lichdom',
  'retired_to_swamp',
  'ascension',
  'good_wizard',
  // Both of the routes it is made of are self-determined, so it is doubly
  // one of these: the rite is a card the wizard accepted and so is the vow.
  'arch_lich',
];
const ATTRIBUTED: EndingId[] = [
  'slain_by_chosen_one',
  'sealed_in_gem',
  'betrayed_by_apprentice',
  'consumed_by_pact',
  // The five faction reprisals. A reprisal with no agent would be the one
  // case where "nobody ended you" is flatly untrue — the faction is the
  // ending.
  'eternally_repurposed',
  'liquidated',
  'turned_to_fertilizer',
  'exiled_and_overrun',
  'consumed',
  // The five faction leadership endings. The agent is the faction the wizard
  // led rather than one that acted on them, but `attributionFor` still owes
  // it a name — see `attributionLabelFor`, which is what keeps the caption
  // from reading as "at the hands of" a faction the wizard was running.
  'contract_writer',
  'grand_arbiter',
  'archmage',
  'archdruid',
  'overthrown_the_kingdom',
];

function show(
  endingId: EndingId,
  over: Partial<RunState> = {},
  cast: Faction[] = factions,
  extra: Partial<EndingScreenProps> = {},
) {
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
      themeId="default"
      unlockedTheme={null}
      onApplyTheme={() => {}}
      {...extra}
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

  /**
   * Each reprisal credits the faction that carried it out — and specifically
   * NOT the faction next door.
   *
   * The pairs are read from the engine's own `REPRISAL_BY_FACTION`, which is
   * what `attributionFor` inverts. A hand-written table here would agree with
   * a hand-written table there and both could be wrong together; this fails
   * the moment the card names a faction the engine did not use.
   */
  it.each(Object.entries(REPRISAL_BY_FACTION))(
    'credits %s for its own reprisal',
    (factionId, endingId) => {
      const { container } = show(endingId);
      const expected = factions.find((f) => f.id === factionId)!.name;
      expect(attributionOnScreen(container)).toBe(expected);
    },
  );

  /**
   * The mirror of the reprisal loop above: each leadership ending credits the
   * faction the wizard led. `lichdom` is excluded — it is `LEADERSHIP_BY_FACTION`'s
   * entry for the Worm Below, but it is self-determined (see `SELF_DETERMINED`
   * above) and covered by its own tests.
   */
  it.each(
    Object.entries(LEADERSHIP_BY_FACTION).filter(([, endingId]) => endingId !== 'lichdom'),
  )('credits %s for its own leadership ending, "at the head of" it', (factionId, endingId) => {
    const { container } = show(endingId);
    const expected = factions.find((f) => f.id === factionId)!.name;
    const node = container.querySelector('[data-attribution]');
    expect((node?.textContent ?? '').replace('At the head of', '').trim()).toBe(expected);
    expect(screen.getByText('At the head of')).toBeInTheDocument();
    expect(screen.queryByText(ATTRIBUTION_LABEL)).not.toBeInTheDocument();
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

/**
 * What this career added to the collection.
 *
 * The collection is thirty silhouettes filled across many careers, and the sim
 * says 80% of careers add nothing to it. So the career that DOES fill a slot is
 * the rare event — and the ending card, the one screen that tots the career up,
 * was the only place that never mentioned it.
 *
 * The trap this pins: the pre-run collection is `run.knownArtifactIds`, frozen
 * at `createRun`. `recordRun` is folded into the SAME reducer return that flips
 * the screen to `ending`, so reaching for the live collection here would report
 * zero new relics forever — and it would typecheck.
 */
describe('EndingScreen · what the career added', () => {
  /**
   * Everything the career recovered, derived the way the screen derives it —
   * held at the end UNION granted in any era, which is also `recordRun`'s
   * definition of discovered. Computed rather than hard-coded: the fixture
   * recovers seven relics but only holds five, and a test that assumed those
   * were the same set passed for the wrong reason.
   */
  const recovered = [
    ...new Set([...demoRun.eras.flatMap((e) => e.artifactsGained), ...demoRun.heldArtifactIds]),
  ].filter((id) => demoArtifacts.some((a) => a.id === id));

  const withKnown = (knownArtifactIds: string[]) =>
    render(
      <EndingScreen
        run={{ ...demoRun, knownArtifactIds }}
        ending={endings.find((e) => e.id === 'slain_by_chosen_one')!}
        lairs={demoLairs}
        artifacts={demoArtifacts}
        factions={factions}
        themeId="default"
        unlockedTheme={null}
        onApplyTheme={() => {}}
        onPlayAgain={() => {}}
        onViewCollection={() => {}}
        onShare={() => {}}
      />,
    );

  it('marks every relic this player has never held before', () => {
    withKnown([]);
    expect(screen.getAllByText('Never seen before')).toHaveLength(recovered.length);
  });

  it('says nothing when the career added nothing — the common case', () => {
    withKnown(recovered);
    expect(screen.queryByText('Never seen before')).toBeNull();
    expect(screen.queryByText(/new to the collection/)).toBeNull();
  });

  it('counts the new ones beside the total, not instead of it', () => {
    // Known everything except one, so exactly one slot was filled this career.
    withKnown(recovered.slice(1));
    expect(screen.getAllByText('Never seen before')).toHaveLength(1);
    expect(screen.getByText(/1 new to the collection/)).toBeInTheDocument();
    // The full recovered count is still reported next to it.
    expect(screen.getByText(String(recovered.length))).toBeInTheDocument();
  });

  it('reads the pre-run snapshot, not the run itself', () => {
    // Derive "new" from the run's own finds and everything looks new forever;
    // derive it from the post-run collection and nothing ever does. One
    // identical run under two collections must give two different answers.
    const { unmount } = withKnown([]);
    const allNew = screen.queryAllByText('Never seen before').length;
    unmount();
    withKnown(recovered);
    const noneNew = screen.queryAllByText('Never seen before').length;
    expect(allNew).toBe(recovered.length);
    expect(noneNew).toBe(0);
  });
});

describe('EndingScreen · the theme this run unlocked', () => {
  it('says nothing at all for a repeat ending', () => {
    // The common case by a mile. A banner that fired every run would be a
    // reward that means nothing.
    show('slain_by_chosen_one', {}, factions, { unlockedTheme: null });
    expect(screen.queryByText(/new visual theme/i)).not.toBeInTheDocument();
  });

  it('names the theme on a first discovery', () => {
    show('lichdom', {}, factions, { unlockedTheme: 'lichdom' });
    expect(screen.getByText(/new visual theme unlocked/i)).toBeInTheDocument();
    expect(screen.getByText('Cold Room')).toBeInTheDocument();
  });

  it('hands the id back when the player taps to wear it', async () => {
    const user = userEvent.setup();
    const onApplyTheme = vi.fn();
    show('lichdom', {}, factions, { unlockedTheme: 'lichdom', onApplyTheme });

    await user.click(screen.getByRole('button', { name: /wear it/i }));
    expect(onApplyTheme).toHaveBeenCalledWith('lichdom');
  });

  it('previews the theme on the card once worn', async () => {
    const user = userEvent.setup();
    const { container } = show('ascension', {}, factions, {
      unlockedTheme: 'ascension',
      onApplyTheme: () => {},
    });

    // Before: the card wears whatever the player already had.
    expect(container.firstElementChild).not.toHaveAttribute('data-theme');

    await user.click(screen.getByRole('button', { name: /wear it/i }));
    // After: the card itself changes, which is the only preview on offer.
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'ascension');
    expect(screen.getByRole('button', { name: /wearing it/i })).toBeDisabled();
  });

  it('keeps the banner outside the card, so it is not in the screenshot', () => {
    const { container } = show('lichdom', {}, factions, { unlockedTheme: 'lichdom' });
    const card = container.querySelector('article');
    expect(card).not.toBeNull();
    expect(card!.textContent).not.toMatch(/new visual theme/i);
  });
});
