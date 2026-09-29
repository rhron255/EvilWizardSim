/**
 * The resolution card must be readable, not merely accurate.
 *
 * Contagion means one option can move the same faction twice — directly and
 * along `hostileTo` — and both landed as separate entries. A card that reads
 * "-15 Pale Academy" and "-12 Pale Academy" is true and useless.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { factions } from '../../content/factions';
import { artifacts } from '../../content/artifacts';
import { endings } from '../../content/endings';
import type { Effect, Ending } from '../../types';
import { EffectList } from './EffectList';

const show = (effects: Effect[], withEndings: Ending[] = []) =>
  render(<EffectList effects={effects} artifacts={artifacts} factions={factions} endings={withEndings} />);

describe('EffectList', () => {
  it('merges repeat hits on the same faction into one net line', () => {
    show([
      { t: 'standing', factionId: 'pale_academy', v: -15 },
      { t: 'standing', factionId: 'ashen_covenant', v: 30 },
      { t: 'standing', factionId: 'pale_academy', v: -12 },
    ]);
    expect(screen.getAllByText(/Pale Academy/)).toHaveLength(1);
    expect(screen.getByText('−27')).toBeInTheDocument();
  });

  it('merges repeat hits on the same stat', () => {
    show([
      { t: 'notoriety', v: 10 },
      { t: 'notoriety', v: -3 },
    ]);
    expect(screen.getAllByText(/Notoriety/)).toHaveLength(1);
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('drops a pair that cancels exactly', () => {
    show([
      { t: 'followers', v: 12 },
      { t: 'followers', v: -12 },
    ]);
    expect(screen.getByText(/no change/i)).toBeInTheDocument();
  });

  it('keeps separate relic losses separate', () => {
    // Losing three relics is three losses, not a "-3".
    show([{ t: 'loseArtifact' }, { t: 'loseArtifact' }, { t: 'loseArtifact' }]);
    expect(screen.getAllByText(/relic/i).length).toBeGreaterThanOrEqual(3);
  });

  it('names every faction that moved, once each', () => {
    show([
      { t: 'standing', factionId: 'pale_academy', v: -15 },
      { t: 'standing', factionId: 'crownlands', v: -15 },
    ]);
    expect(screen.getAllByText(/Pale Academy/)).toHaveLength(1);
    expect(screen.getAllByText(/Crownlands/)).toHaveLength(1);
  });

  it('puts equal-magnitude standing moves on one row, naming each faction', () => {
    // Contagion along `hostileTo` turns one authored move into up to four. The
    // number is identical on every spilled line, so a row apiece was the same
    // fact three times. Disclosure is unchanged: every faction is still named.
    show([
      { t: 'standing', factionId: 'verdant_choir', v: -20 },
      { t: 'standing', factionId: 'gilded_hand', v: 5 },
      { t: 'standing', factionId: 'pale_academy', v: 5 },
      { t: 'standing', factionId: 'crownlands', v: 5 },
    ]);

    // One "+5" row, not three.
    expect(screen.getAllByText('+5')).toHaveLength(1);
    // The article is dropped inside a list — see `describeStandingGroup`.
    expect(screen.getByText('Standing · Gilded Hand, Pale Academy, Crownlands')).toBeInTheDocument();
    // The odd one out keeps its own row.
    expect(screen.getByText('−20')).toBeInTheDocument();
    expect(screen.getAllByText(/Verdant Choir/)).toHaveLength(1);
  });

  it('does not merge standing moves of different magnitudes', () => {
    show([
      { t: 'standing', factionId: 'gilded_hand', v: 5 },
      { t: 'standing', factionId: 'crownlands', v: 6 },
    ]);
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('+6')).toBeInTheDocument();
  });

  it('names the uncertainty on an un-raritied relic draw', () => {
    // The rarity is drawn at resolution, so the card must not imply a common.
    show([{ t: 'artifactFrom', factionId: 'gilded_hand' }]);
    expect(screen.getByText(/random rarity/i)).toBeInTheDocument();
  });

  it('prints the rarity on a specified draw and does not call it random', () => {
    show([{ t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' }]);
    expect(screen.getByText(/rare .*relic/i)).toBeInTheDocument();
    expect(screen.queryByText(/random rarity/i)).not.toBeInTheDocument();
  });

  it('discloses a double-edged relic’s power on a named grant, before commit', () => {
    // Issue #82, rule 1 ("no undisclosed downside"): Tenure Ring and Weather
    // Leash are reachable ONLY through a named `artifact` grant, and their
    // power is a real cost, not a pure bonus. "Gain The Tenure Ring" alone
    // would hide the standing cap until after the player has already
    // committed to the choice.
    show([{ t: 'artifact', artifactId: 'tenure_ring' }]);
    expect(screen.getByText(/Gain The Tenure Ring/)).toBeInTheDocument();
    expect(screen.getByText(/standing.*held between/i)).toBeInTheDocument();
  });

  it('does not append power text to an ordinary named grant', () => {
    // A named grant that is NOT double-edged (the origin relics, and this
    // issue's own common-rarity grants) is a plain bonus — the name is
    // already the whole disclosure, same as it was before double-edged
    // relics existed.
    show([{ t: 'artifact', artifactId: 'mantle_of_slow_moss' }]);
    expect(screen.getByText('Gain Mantle of Slow Moss')).toBeInTheDocument();
  });

  it('names a scripted ending effect with the catalog’s own name, not a bare id guess', () => {
    // `slain_by_chosen_one`'s authored name has "the" in it; the id does
    // not, so `endingName`'s bare derivation used to drop it on the pre-
    // commit card too — the same bug the lifeline probe found in
    // `ResolutionOverlay`, reachable through `scripted.ts`'s own
    // `{t: 'ending'}` effects (e.g. `scripted_the_reckoning`'s gamble).
    show([{ t: 'ending', endingId: 'slain_by_chosen_one' }], endings);
    expect(screen.getByText('The run ends · Slain by the Chosen One')).toBeInTheDocument();
  });

  it('falls back to the bare id derivation when no endings list is supplied', () => {
    show([{ t: 'ending', endingId: 'slain_by_chosen_one' }]);
    expect(screen.getByText('The run ends · Slain by Chosen One')).toBeInTheDocument();
  });
});
