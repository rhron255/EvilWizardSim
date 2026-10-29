/**
 * The pasteable summary of a finished career (issue #128).
 *
 * The image share fails on desktop and in in-app browsers; this is what travels
 * in a group chat. Plain-words lines first, the glyph row last, because a
 * screen reader reads block glyphs aloud as noise.
 *
 * Decisions that are easy to undo by accident:
 * - The row has one glyph per era for HOW IT RESOLVED (`·` a certain choice,
 *   `+` a gamble won, `×` a gamble lost). It is deliberately not a Notoriety
 *   sparkline: that would draw the decline curve the game never announces
 *   (rule 5) to a recipient who has not yet played.
 * - No colour emoji (rule 3). The tier is a word.
 * - Spoilers: the ending name is included (the PNG already prints it).
 *   Narration, coda, offer titles, option labels, deed summaries, relic names
 *   and which gamble fell which way are not.
 * - The attribution line is omitted for the self-determined endings exactly as
 *   the card omits it (failure mode 17): `attributionFor` returns null there.
 */
import { heroNameFor } from '../../content/heroes';
import type { Ending, EraRecord, Faction, Outcome, RunState } from '../../types';
import { attributionFor, attributionLabelFor } from './attribution';
import { peakNotoriety, tierOf } from './tierVars';

/** Where a pasted result points. One constant, so the domain decision in #118 is a one-line change. */
export const SHARE_URL = 'rhron255.github.io/EvilWizardSim/';

const GLYPH: Record<Outcome, string> = {
  deterministic: '·',
  success: '+',
  failure: '×',
};

/** One glyph per era, space separated. Exported so the mapping can be pinned at its extremes. */
export function resolutionRow(eras: Pick<EraRecord, 'outcome'>[]): string {
  return eras.map((e) => GLYPH[e.outcome]).join(' ');
}

export type ShareTextInput = {
  run: RunState;
  ending: Ending;
  factions: Faction[];
  url?: string;
};

/** "Morgath the Second Draft" / "Morgath, Who Ended the Argument". */
function titledName(run: RunState): string {
  const epithet = run.epithet.trim();
  if (!epithet) return run.wizardName;
  // Lower-case epithets ("the Second Draft", "of the Long Winter") continue the
  // name; capitalised ones ("Who Ended the Argument") need a comma.
  return /^[a-z]/.test(epithet) ? `${run.wizardName} ${epithet}` : `${run.wizardName}, ${epithet}`;
}

export function shareTextFor({ run, ending, factions, url = SHARE_URL }: ShareTextInput): string {
  const tier = tierOf(peakNotoriety(run.eras, run.notoriety));
  const startAge = run.eras[0]?.age ?? run.age;
  const attribution = attributionFor(ending.id, { heroName: heroNameFor(run.seed), factions });

  const lines = [`${titledName(run)} — ${ending.name}`];
  const span = `Aged ${startAge} to ${run.age}, ${tier.name}.`;
  lines.push(
    attribution ? `${attributionLabelFor(ending.id)} ${attribution}. ${span}` : span,
  );
  if (run.eras.length > 0) lines.push(resolutionRow(run.eras));
  lines.push(url);
  return lines.join('\n');
}
