/**
 * The card that reports a death must show what caused it.
 *
 * Reported from play: "I died being consumed by the pact, even though the last
 * action I took had nothing to do with pacts." A tick applied by the era-end
 * systems crossed a lethal threshold, and the card renders the OPTION's
 * consequences, so the two never met.
 *
 * The pact tick itself is gone — debt only moves on a card the player picked —
 * but apprentice loyalty drift still fires here and still ends runs, so the
 * separation this file pins is unchanged.
 *
 * This renders the real overlay rather than calling `describeSystemic` alone.
 * A correct mapping that is never mounted is this repo's most repeated failure
 * (CLAUDE.md § 2), and the previous instance of it — the roll rail — survived a
 * whole build because nothing rendered the component with real engine output.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { artifacts } from '../../content/artifacts';
import { factions } from '../../content/factions';
import { endings, lairs, offers } from '../../content';
import { BETRAYAL_MAX_LOYALTY } from '../../engine';
import type { Resolution, SystemicChange } from './resolution';
import { ResolutionOverlay } from './ResolutionOverlay';
import { endingDisplayName } from './effectText';
import { BEATS } from '../meta';
import { tierFor } from '../../theme/tokens';

// A real long-shot gamble paying off with a relic: the card, its odds, its
// success narration, and the notoriety it prints all come from the catalog.
const won = (() => {
  for (const offer of offers)
    for (const option of offer.options)
      if (
        option.kind === 'gamble' &&
        option.onSuccess.some((e) => e.t === 'artifactFrom') &&
        option.onSuccess.some((e) => e.t === 'notoriety' && e.v > 0)
      )
        return { offer, option };
  throw new Error('no real gamble wins a relic and fame together');
})();
const fame = won.option.onSuccess.reduce((sum, e) => (e.t === 'notoriety' ? sum + e.v : sum), 0);
const draw = won.option.onSuccess.find((e) => e.t === 'artifactFrom')!;
if (draw.t !== 'artifactFrom') throw new Error('unreachable');
/** A relic that draw could actually have handed over. */
const prize = artifacts.find(
  (a) => a.factionId === draw.factionId && (!draw.rarity || a.rarity === draw.rarity),
)!;

const demoResolutionSuccess: Resolution = {
  outcome: 'success',
  odds: won.option.odds,
  roll: won.option.odds / 2,
  appliedEffects: [
    { t: 'notoriety', v: fame },
    { t: 'artifact', artifactId: prize.id },
  ],
  text: won.option.successText,
  artifactsGained: [prize],
  newToCollection: [prize],
  artifactsLost: [],
  relicEvents: [],
  notorietyDelta: fame,
  systemic: [],
  eraRecord: {
    eraIndex: 11,
    age: 75,
    lairId: lairs[lairs.length - 1].id,
    notoriety: 93,
    notorietyDelta: fame,
    followers: 1284,
    artifactsGained: [prize.id],
    deedSummary: won.option.successText,
    offerId: won.offer.id,
    optionLabel: won.option.label,
    outcome: 'success',
    phase: 'decline',
  },
};

const show = (systemic: SystemicChange[], over: Partial<Resolution> = {}) =>
  render(
    <ResolutionOverlay
      resolution={{ ...demoResolutionSuccess, systemic, ...over }}
      artifacts={artifacts}
      factions={factions}
      endings={endings}
      onContinue={() => {}}
    />,
  );

const section = () => screen.getByText('While you were elsewhere').closest('div')!;

describe('ResolutionOverlay · the verdict', () => {
  it('names a win and a loss with different words', () => {
    // "the failure / success indication is not clear enough" — the two cases
    // used to differ by one shade of grey on a six-point word.
    show([], { outcome: 'success' });
    expect(screen.getByText('Success')).toBeInTheDocument();
    cleanup();
    show([], { outcome: 'failure' });
    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  it('carries the verdict on the card itself, not only in the word', () => {
    show([], { outcome: 'failure' });
    expect(document.querySelector('[data-outcome="failure"]')).toBeInTheDocument();
  });

  it('says so when a long shot comes off', () => {
    show([], { outcome: 'success', odds: 0.18, roll: 0.05 });
    expect(screen.getByText(/Against the odds/)).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
  });

  it('keeps quiet about a win that was always likely', () => {
    show([], { outcome: 'success', odds: 0.85, roll: 0.1 });
    expect(screen.queryByText(/Against the odds/)).toBeNull();
  });

  it('never congratulates a loss at long odds', () => {
    show([], { outcome: 'failure', odds: 0.18, roll: 0.9 });
    expect(screen.queryByText(/Against the odds/)).toBeNull();
  });

  it('says nothing about odds on a certain choice', () => {
    show([], { outcome: 'deterministic', odds: undefined, roll: undefined });
    expect(screen.queryByText(/Against the odds/)).toBeNull();
  });
});

describe('ResolutionOverlay · a relic the collection has never held', () => {
  it('marks a first-ever find', () => {
    show([], { artifactsGained: [artifacts[0]], newToCollection: [artifacts[0]] });
    expect(screen.getByText('Never seen before')).toBeInTheDocument();
  });

  it('says nothing for a relic the player has found before', () => {
    // Same relic, same card — only the collection differs.
    show([], { artifactsGained: [artifacts[0]], newToCollection: [] });
    expect(screen.getByText(artifacts[0].name)).toBeInTheDocument();
    expect(screen.queryByText('Never seen before')).toBeNull();
  });

  it('marks only the new one when a card grants two', () => {
    show([], { artifactsGained: [artifacts[0], artifacts[1]], newToCollection: [artifacts[1]] });
    expect(screen.getAllByText('Never seen before')).toHaveLength(1);
  });
});

describe('ResolutionOverlay · a relic the era took', () => {
  /**
   * `Resolution.artifactsLost` used to land here unread — the card said only
   * the generic pre-commit "Lose a held relic," even though the roll had
   * already named exactly which one (issue #80 review). This pins that the
   * name actually reaches the screen.
   */
  it('names the relic the roll actually took', () => {
    show([], { artifactsGained: [], artifactsLost: [artifacts[0]] });
    expect(screen.getByText('Lost this era')).toBeInTheDocument();
    expect(screen.getByText(artifacts[0].name)).toBeInTheDocument();
  });

  it('says nothing when nothing was lost', () => {
    show([], { artifactsLost: [] });
    expect(screen.queryByText('Lost this era')).toBeNull();
  });

  it('shows a gain and a loss on the same card without conflating them', () => {
    show([], { artifactsGained: [artifacts[1]], artifactsLost: [artifacts[0]] });
    expect(screen.getByText(artifacts[1].name)).toBeInTheDocument();
    expect(screen.getByText(artifacts[0].name)).toBeInTheDocument();
    expect(screen.getByText('Lost this era')).toBeInTheDocument();
  });
});

describe('ResolutionOverlay · naming an ending', () => {
  /**
   * `endingName` (`effectText.ts`) is a bare id-derived FALLBACK — its own
   * doc comment says the authored `Ending.name` should win wherever content
   * is in hand. This card used the fallback unconditionally, which happened
   * to be invisible for most endings but not `slain_by_chosen_one`: the id
   * has no "the" in it to derive, so the run-ends line read "Slain by Chosen
   * One" instead of the catalog's own "Slain by the Chosen One" — found via
   * `qa/probe-relics.mjs`'s lifeline probe, not by inspection.
   */
  it('prints the catalog’s own ending name, not a bare id-derived guess', () => {
    show([], { ending: 'slain_by_chosen_one' });
    expect(screen.getByText('The run ends · Slain by the Chosen One')).toBeInTheDocument();
    expect(screen.queryByText(/Slain by Chosen One[^,]/)).toBeNull();
  });

  it('endingDisplayName itself still degrades gracefully for an id absent from the list', () => {
    // `endings` is a REQUIRED prop on the component now (code review: an
    // optional prop with a silent fallback was the exact shape of the bug
    // this whole describe block exists to catch) — so there is no longer a
    // way to render the overlay without one. The underlying function still
    // has a legitimate degrade-gracefully path for a partial `endings` list
    // (a content pack, a future test fixture) that just doesn't happen to
    // carry a given id; that path is tested directly instead.
    expect(endingDisplayName('slain_by_chosen_one', [])).toBe('Slain by Chosen One');
  });

  it('names the relic AND the real ending it averted in the lifeline block', () => {
    show([], {
      ending: undefined,
      lifeline: {
        artifactId: 'portcullis_tooth',
        endingAverted: 'slain_by_chosen_one',
        recovery: { t: 'threatToWardsFraction', fraction: 0.8 },
        applied: [{ t: 'heroThreat', v: -120 }],
      },
    });
    expect(screen.getByText('Lifeline')).toBeInTheDocument();
    expect(
      screen.getByText('The Portcullis Tooth spends itself: Slain by the Chosen One does not happen.'),
    ).toBeInTheDocument();
    // The whole point of a lifeline: no ending line alongside it.
    expect(screen.queryByText(/^The run ends/)).toBeNull();
  });
});

describe('ResolutionOverlay · while you were elsewhere', () => {
  it('prints the loyalty drift against the threshold it is walking toward', () => {
    show([{ t: 'loyaltyDrift', v: -5, loyalty: 22 }]);
    const block = within(section());
    expect(block.getByText('\u22125')).toBeInTheDocument();
    expect(block.getByText('Loyalty')).toBeInTheDocument();
    expect(block.getByText(new RegExp(`${BETRAYAL_MAX_LOYALTY}%`))).toBeInTheDocument();
  });

  it('names the hero when he closes a band, so the era is not blamed on the card', () => {
    show([{ t: 'heroApproach', band: 'danger', threat: 40, wards: 44 }]);
    const block = within(section());
    expect(block.getByText(/40/)).toBeInTheDocument();
    expect(block.getByText(/44/)).toBeInTheDocument();
  });

  it('shows nothing at all when no tick fired', () => {
    // The ascent must stay clean: an empty block every era would be the doom
    // meter wiki/04 forbids, dressed as disclosure.
    show([]);
    expect(screen.queryByText('While you were elsewhere')).not.toBeInTheDocument();
  });

  it('keeps the systemic ticks out of the option consequence list', () => {
    // The separation this whole file exists for. The option's own effects are
    // a notoriety gain and a relic; the tick must not have joined them.
    show([{ t: 'loyaltyDrift', v: -5, loyalty: 22 }]);
    expect(screen.getAllByText('Loyalty')).toHaveLength(1);
  });

  /**
   * The regression pin for the tick's removal, at the UI seam.
   *
   * `SystemicChange` no longer has a member that can carry pact debt, so this
   * is enforced by the compiler too — but the compiler cannot see a future
   * author reaching for `appliedEffects` to fake one. Debt reaching this card
   * at all must mean the player's own option put it there.
   */
  it('never reports pact debt as something that happened on its own', () => {
    show([{ t: 'loyaltyDrift', v: -5, loyalty: 22 }]);
    expect(within(section()).queryByText(/Pact Debt/)).not.toBeInTheDocument();
  });
});

/**
 * "Your relics" (issue #80) — a relic's own consequence this era, kept
 * separate from `appliedEffects` for the exact reason "while you were
 * elsewhere" is: attributing it to the option the player just picked would
 * misname its cause. Same pattern this file already holds `systemic` to.
 */
describe('ResolutionOverlay · your relics', () => {
  const relicsSection = () => screen.getByText('Your relics').closest('div')!;

  it('shows nothing at all when no relic fired', () => {
    show([], { relicEvents: [] });
    expect(screen.queryByText('Your relics')).not.toBeInTheDocument();
  });

  it('names the relic and what it did', () => {
    show([], {
      relicEvents: [{ artifactId: artifacts[0].id, applied: [{ t: 'notoriety', v: 2 }] }],
    });
    const block = within(relicsSection());
    expect(block.getByText(artifacts[0].name)).toBeInTheDocument();
    expect(block.getByText('+2')).toBeInTheDocument();
    expect(block.getByText('Notoriety')).toBeInTheDocument();
  });

  it('keeps a relic event out of the option consequence list', () => {
    // The option's own ledger already carries a notoriety gain
    // (`demoResolutionSuccess.appliedEffects`); the relic's own is a SECOND,
    // separately attributed one and must not fold into that count.
    show([], {
      relicEvents: [{ artifactId: artifacts[0].id, applied: [{ t: 'notoriety', v: 2 }] }],
    });
    expect(screen.getAllByText('Notoriety').length).toBeGreaterThan(1);
  });

  it('lists one row per relic that reacted', () => {
    show([], {
      relicEvents: [
        { artifactId: artifacts[0].id, applied: [{ t: 'notoriety', v: 2 }] },
        { artifactId: artifacts[1].id, applied: [{ t: 'followers', v: 10 }] },
      ],
    });
    const block = within(relicsSection());
    expect(block.getByText(artifacts[0].name)).toBeInTheDocument();
    expect(block.getByText(artifacts[1].name)).toBeInTheDocument();
  });
});

/**
 * The roll has to decide the verdict, not follow it.
 *
 * The pieces were always right — a rail, a threshold tick, and a needle that
 * genuinely travels to the roll. The ORDER was wrong: the verdict word
 * finished its reveal at 320ms while the needle did not land until 720ms, so
 * the card announced Success or Failure and then invited the player to watch a
 * marker slide to a position whose meaning had already been spent.
 *
 * The schedule itself is CSS and cannot be asserted in jsdom. What can be
 * pinned is the switch the schedule hangs off, and the one thing the reordering
 * must never do: withhold the verdict from the accessibility tree.
 */
describe('ResolutionOverlay · the roll decides the verdict', () => {
  const card = () => screen.getByRole('dialog').querySelector('[data-outcome]')!;

  it('marks a gamble as rolling, so the reveal waits for the needle', () => {
    show([], { outcome: 'success', roll: 0.2, odds: 0.6 });
    expect(card()).toHaveAttribute('data-rolling', 'true');
  });

  it('does NOT mark a certain choice as rolling — there is nothing to watch', () => {
    // A deterministic era has no roll and must keep the fast reveal. If this
    // ever flips, every certain choice gains a second of dead air.
    show([], { outcome: 'deterministic', roll: undefined, odds: undefined });
    expect(card()).not.toHaveAttribute('data-rolling');
  });

  it('does not mark a gamble as rolling when the engine supplied no roll', () => {
    // The roll rail shipped broken for an entire build because the engine
    // never set `roll`/`odds` (CLAUDE.md § 2). If that regresses, the card must
    // fall back to the fast reveal rather than waiting for a needle that will
    // never move.
    show([], { outcome: 'success', roll: undefined, odds: undefined });
    expect(card()).not.toHaveAttribute('data-rolling');
  });

  it('keeps the verdict in the accessibility tree from the first frame', () => {
    // The delay is presentational ONLY. The dialog is `aria-labelledby` the
    // verdict, so withholding the element — rather than its opacity — would
    // strip the dialog's accessible name for the whole sweep.
    show([], { outcome: 'failure', roll: 0.9, odds: 0.4 });
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const label = document.getElementById(labelledBy!);
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Failure');
    expect(dialog).toHaveAccessibleName('Failure');
  });
});

describe('ResolutionOverlay · dismissing exactly once', () => {
  /**
   * The scrim dismisses on click ("dismiss anywhere") and the Continue button
   * sits inside it. Without `stopPropagation` on the button, one tap called
   * `onContinue` TWICE — which was invisible for fifteen eras, because the
   * reducer's second pass hit a cleared resolution and returned early.
   *
   * On the SIXTEENTH it was not invisible: the ending arm was the one arm that
   * did not clear `resolution`, so the second call re-ran `recordRun`. Every
   * finished career was counted twice, and the theme-unlock check on that
   * second pass found its own ending already recorded and reported "not new",
   * so the unlock banner never rendered once in a real browser while every
   * unit test passed.
   */
  it('calls onContinue once per click of the Continue button', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <ResolutionOverlay
        resolution={demoResolutionSuccess}
        artifacts={artifacts}
        factions={factions}
        endings={endings}
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('still dismisses when the scrim itself is clicked', async () => {
    // The stopPropagation must not cost the scrim's dismiss affordance.
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <ResolutionOverlay
        resolution={demoResolutionSuccess}
        artifacts={artifacts}
        factions={factions}
        endings={endings}
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByRole('dialog'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression for issue #47. The ledger's removal (#36) left this overlay as
   * the only place an era's systemic ticks are ever shown, and a tap anywhere
   * on the card — including mid-read of "While you were elsewhere" — used to
   * bubble to the scrim and dismiss it, with nothing recovering the tick
   * afterward.
   */
  it('does not dismiss on a tap inside the card body', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <ResolutionOverlay
        resolution={{
          ...demoResolutionSuccess,
          systemic: [{ t: 'loyaltyDrift', v: -5, loyalty: 22 }],
        }}
        artifacts={artifacts}
        factions={factions}
        endings={endings}
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByText(demoResolutionSuccess.text));
    await user.click(screen.getByText('While you were elsewhere'));
    expect(onContinue).not.toHaveBeenCalled();
  });
});

describe('ResolutionOverlay · haptics', () => {
  // A buzz is only worth having if it lands WITH the thing it is about: the
  // verdict word starts its own animation at the roll's settle, so that event
  // is the cue — not a second copy of the timing in a setTimeout that could
  // drift from the stylesheet.
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('stays silent through the roll and buzzes when the verdict lands', () => {
    show([], { outcome: 'success' });
    expect(vibrate).not.toHaveBeenCalled();

    fireEvent.animationStart(screen.getByText('Success'));

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(BEATS.success);
  });

  it('gives a failure its own pattern', () => {
    show([], { outcome: 'failure' });
    fireEvent.animationStart(screen.getByText('Failure'));
    expect(vibrate).toHaveBeenCalledWith(BEATS.failure);
  });

  it('gives a certain choice nothing — the quiet case stays quiet', () => {
    show([], { outcome: 'deterministic', odds: undefined, roll: undefined });
    expect(vibrate).not.toHaveBeenCalled();
    // Even a stray animation event on the word cannot buzz a choice with no roll.
    fireEvent.animationStart(screen.getByText('Resolved'));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('marks a celebrated tier crossing on the verdict of the gamble that earned it', () => {
    show([], { outcome: 'success', tierCrossed: tierFor(80) });
    expect(vibrate).not.toHaveBeenCalled();

    fireEvent.animationStart(screen.getByText('Success'));

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(BEATS.crossing);
  });

  it('marks a crossing straight away when a certain choice earned it, since nothing rolls', () => {
    show([], { outcome: 'deterministic', odds: undefined, roll: undefined, tierCrossed: tierFor(80) });
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(BEATS.crossing);
  });

  it('does not buzz for a player who asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      addEventListener() {},
      removeEventListener() {},
    }));
    show([], { outcome: 'success' });
    fireEvent.animationStart(screen.getByText('Success'));
    expect(vibrate).not.toHaveBeenCalled();
  });
});
