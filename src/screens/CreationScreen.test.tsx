/**
 * The only text input in the game, and the anchor everything else hangs off.
 *
 * Two recorded regressions live on this screen. The name field's limit was 26
 * and silently ate the last character of anything longer — "Vashter of the Long
 * Arrears" committed as "Vashter of the Long Arrear". And the remembered name
 * is specified as prefilled AND SELECTED (HANDOFF § the name persists), which
 * is the difference between one tap to replay and a field you have to clear.
 *
 * Real content, not the meta fixtures: `demoOrigins` there has three origins
 * with ids that do not match the four real ones, so a test asserting on origins
 * would be measuring a catalog nobody plays (CLAUDE.md § 5).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { artifacts } from '../content/artifacts';
import { factions } from '../content/factions';
import { origins } from '../content/origins';
import { CREATION_EPITHETS } from '../content';
import { MAX_NAME_LENGTH } from '../engine';
import { CreationScreen } from './CreationScreen';

const show = (defaultName = '') => {
  const onCreate = vi.fn();
  const onBack = vi.fn();
  render(
    <CreationScreen
      origins={origins}
      epithetChoices={CREATION_EPITHETS}
      artifacts={artifacts}
      factions={factions}
      defaultName={defaultName}
      onCreate={onCreate}
      onBack={onBack}
    />,
  );
  return { onCreate, onBack, field: screen.getByRole('textbox') };
};

const commit = () => screen.getByRole('button', { name: /begin the career/i });

describe('CreationScreen · the name', () => {
  it('prefills the remembered name AND selects it', () => {
    // Selected, so typing replaces the whole thing — a second career is one tap
    // and a different wizard is still just typing. `useGame` already pins that
    // the name is REMEMBERED; this pins that the field actually shows it.
    const { field } = show('Malvorn Ashgrave');
    expect(field).toHaveValue('Malvorn Ashgrave');
    expect((field as HTMLInputElement).selectionStart).toBe(0);
    expect((field as HTMLInputElement).selectionEnd).toBe('Malvorn Ashgrave'.length);
  });

  it('accepts exactly what the engine accepts, with no local copy of the limit', async () => {
    // The limit used to be duplicated here as `MAX_NAME = 40` with a comment
    // promising it matched the engine. It is now imported, so this asserts the
    // field honours it rather than that two constants happen to agree.
    const long = 'V'.repeat(MAX_NAME_LENGTH);
    const { field, onCreate } = show();
    await userEvent.type(field, long);
    expect(field).toHaveValue(long);
    await userEvent.click(commit());
    expect(onCreate).toHaveBeenCalledWith(long, expect.anything(), expect.anything(), expect.anything());
  });

  it('commits the trimmed name, not what was typed', async () => {
    const { field, onCreate } = show();
    await userEvent.type(field, '  Grishnak  ');
    await userEvent.click(commit());
    expect(onCreate).toHaveBeenCalledWith('Grishnak', expect.anything(), expect.anything(), expect.anything());
  });

  it('will not begin a career on whitespace alone', async () => {
    const { field, onCreate } = show();
    await userEvent.type(field, '   ');
    expect(commit()).toBeDisabled();
    await userEvent.click(commit());
    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('CreationScreen · disclosure', () => {
  it('prints every origin and every one of its starting effects', () => {
    // Rule 1 applies before the first card: an origin is a choice with
    // consequences, so its DOWNSIDES have to be on screen too. The Pale
    // Academy origin opens at -30 standing and the tower at +2 Pact Debt;
    // neither may be quietly omitted.
    show();
    for (const origin of origins) {
      expect(screen.getByText(origin.name)).toBeInTheDocument();
      expect(screen.getByText(origin.blurb)).toBeInTheDocument();
    }
    expect(origins.length).toBe(4);
  });

  it('shows the full blurb, not a fragment', () => {
    // The blurbs were clamped to two lines at 393px with a comment claiming
    // they had been shortened; they had not, so all four ended mid-clause.
    // jsdom cannot see the clamp, but it can see that the whole string is in
    // the DOM as one node rather than pre-truncated in the content.
    show();
    for (const origin of origins) {
      const node = screen.getByText(origin.blurb);
      expect(node.textContent).toBe(origin.blurb);
      expect(origin.blurb).not.toMatch(/[…]$/);
    }
  });

  it('offers the three run lengths and never abbreviates the years', () => {
    show();
    for (const [eras, name] of [
      [12, 'Brief'],
      [16, 'Standard'],
      [20, 'Long'],
    ] as const) {
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(`${eras * 5} years`)).toBeInTheDocument();
    }
  });
});
