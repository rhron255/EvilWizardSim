/**
 * `attributionLabelFor` in isolation from `attributionFor`.
 *
 * `EndingScreen.test.tsx` exercises both together, through the rendered card
 * — which is the right test for what the PLAYER sees, but it cannot catch a
 * defect in `attributionLabelFor` alone: for `lichdom`, `attributionFor`
 * returns `null` first, so the screen never renders a label at all and never
 * calls `attributionLabelFor('lichdom')` to find out what it would have said.
 * A caller that skips that null-check — a future screen, a share card, a
 * debug view — would call it directly and get the wrong answer. This file
 * pins the function's own contract, independent of who happens to guard it.
 */
import { describe, expect, it } from 'vitest';
import { ATTRIBUTION_LABEL, attributionLabelFor } from './attribution';

describe('attributionLabelFor', () => {
  it('reads "At the head of" for a standing-earned crown', () => {
    expect(attributionLabelFor('archmage')).toBe('At the head of');
    expect(attributionLabelFor('grand_arbiter')).toBe('At the head of');
    expect(attributionLabelFor('archdruid')).toBe('At the head of');
    expect(attributionLabelFor('contract_writer')).toBe('At the head of');
    expect(attributionLabelFor('overthrown_the_kingdom')).toBe('At the head of');
  });

  it('reads the ordinary label for an ending something did TO the wizard', () => {
    expect(attributionLabelFor('sealed_in_gem')).toBe(ATTRIBUTION_LABEL);
    expect(attributionLabelFor('betrayed_by_apprentice')).toBe(ATTRIBUTION_LABEL);
  });

  /**
   * `lichdom` is `LEADERSHIP_BY_FACTION.worm_below`, but it is earned by the
   * rite — a card the wizard accepted — not crowned onto them by an
   * institution the way the other five leaderships are; `attributionFor`
   * returns `null` for it for exactly this reason. A wholesale inversion of
   * `LEADERSHIP_BY_FACTION` into `LEADERSHIP_AGENT` would map
   * `lichdom -> worm_below` anyway and answer "At the head of" here — wrong,
   * for a transformation nobody crowned.
   */
  it('does not read "At the head of" for lichdom, a self-determined ending', () => {
    expect(attributionLabelFor('lichdom')).toBe(ATTRIBUTION_LABEL);
  });
});
