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
import type { Effect } from '../../types';
import { EffectList } from './EffectList';

const show = (effects: Effect[]) =>
  render(<EffectList effects={effects} artifacts={artifacts} factions={factions} />);

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

  it('leaves distinct factions distinct', () => {
    show([
      { t: 'standing', factionId: 'pale_academy', v: -15 },
      { t: 'standing', factionId: 'crownlands', v: -15 },
    ]);
    expect(screen.getAllByText(/Pale Academy/)).toHaveLength(1);
    expect(screen.getAllByText(/Crownlands/)).toHaveLength(1);
  });
});
