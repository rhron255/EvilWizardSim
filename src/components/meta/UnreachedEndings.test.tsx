import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endings } from '../../content/endings';
import type { EndingId } from '../../types';
import { UnreachedEndings } from './UnreachedEndings';
import { unreachedEndings } from './unreachedEndings';

const ids = (seen: EndingId[]) => unreachedEndings(endings, seen).map((e) => e.id);

describe('unreachedEndings', () => {
  it('lists at most three, common before rare before legendary, then content order', () => {
    const list = unreachedEndings(endings, []);
    expect(list).toHaveLength(3);
    expect(list.map((e) => e.id)).toEqual(['slain_by_chosen_one', 'retired_to_swamp', 'sealed_in_gem']);
  });

  it('skips reached endings and puts good_wizard and arch_lich last', () => {
    const rest = endings.map((e) => e.id).filter((id) => id !== 'good_wizard' && id !== 'arch_lich');
    expect(ids(rest)).toEqual(['good_wizard', 'arch_lich']);
    expect(ids(endings.filter((e) => e.id !== 'ascension').map((e) => e.id))).toEqual(['ascension']);
  });

  it('is empty once every ending is reached', () => {
    expect(ids(endings.map((e) => e.id))).toEqual([]);
  });

  it('does not know about the hidden good/ill counters', () => {
    const src = readFileSync('src/components/meta/unreachedEndings.ts', 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/goodActs|illActs|RunState/);
  });
});

describe('<UnreachedEndings>', () => {
  it('prints only each ending’s hint and reports the tapped id', async () => {
    const onSelect = vi.fn();
    const rest = endings.map((e) => e.id).filter((id) => id !== 'good_wizard' && id !== 'arch_lich');
    const { container } = render(
      <UnreachedEndings endings={endings} endingsSeen={rest} onSelect={onSelect} />,
    );
    const gw = endings.find((e) => e.id === 'good_wizard')!;
    const al = endings.find((e) => e.id === 'arch_lich')!;
    expect(container.textContent).toBe(`Still unwritten${gw.hint}›${al.hint}›`);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(gw.hint) }));
    expect(onSelect).toHaveBeenCalledWith('good_wizard');
  });

  it('is activated from the keyboard', async () => {
    const onSelect = vi.fn();
    render(<UnreachedEndings endings={endings} endingsSeen={[]} onSelect={onSelect} />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('slain_by_chosen_one');
  });

  it('renders nothing when all are reached', () => {
    const { container } = render(
      <UnreachedEndings endings={endings} endingsSeen={endings.map((e) => e.id)} onSelect={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
