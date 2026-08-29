/**
 * What each number in the header actually DOES.
 *
 * Playtest note that produced this file: "the implications of followers, pact
 * debt, loyalty, apprentices, lair level and such are not clear."
 *
 * That is not a polish complaint, it is a disclosure bug. wiki/04's odds rule
 * — "no option may have undisclosed downside", "the single most important rule
 * in the codebase" — is satisfied at the moment of choice (an offer prints
 * `+1 Pact Debt`) and then quietly broken afterwards, because nothing tells the
 * player that pact debt has a ceiling, what the ceiling is, or what happens at
 * it. A player who loses a run to a counter they were never given a denominator
 * for has been surprised by an unlisted consequence just as surely as if the
 * card had hidden it.
 *
 * So every stat gets a caption naming its consequence, and every stat that
 * counts toward a terminal state names the threshold and the distance to it.
 *
 * This is NOT the doom meter wiki/04 forbids. That prohibition is about the
 * decline phase's notoriety erosion — a number quietly going the wrong way,
 * unannounced, so loss aversion does the work. Explaining what a mechanic does
 * is the opposite of that: it converts a surprise into a decision, which is the
 * effect printed odds are there to produce.
 */

import {
  BETRAYAL_MAX_LOYALTY,
  BETRAYAL_MIN_APPRENTICES,
  DEF_LAIR,
  DEF_LICH,
  heroBand,
  PACT_LIMIT,
  threatGainFor,
} from '../../engine';
import type { DefenseReadout, DefenseTerm } from '../../engine';
import type { RunState } from '../../types';

export type Stake = {
  label: string;
  value: string;
  /** One line, lower case, naming the consequence. */
  caption: string;
  /**
   * `warn` when this stat is close enough to a terminal threshold that the
   * player should feel it. Styling only — never a countdown bar.
   */
  tone?: 'warn' | 'danger';
};

/**
 * Followers deliberately contribute nothing to defense — wiki/02 gives each
 * currency a distinct job and calls followers "ledger filler". The caption has
 * to say so, or a player will reasonably assume a bigger household is safer
 * and be wrong at the worst possible moment.
 */
function followersStake(run: RunState): Stake {
  return {
    label: 'Followers',
    value: run.followers.toLocaleString('en-US'),
    caption: 'spent as coin · they do not fight for you',
  };
}

function relicsStake(run: RunState): Stake {
  const n = run.heldArtifactIds.length;
  return {
    label: 'Relics',
    value: String(n),
    caption: n === 0 ? 'each one is defence against the hero' : 'your defence against the hero',
  };
}

function apprenticesStake(run: RunState): Stake {
  const { count } = run.apprentices;
  return {
    label: 'Apprentices',
    value: String(count),
    caption:
      count >= BETRAYAL_MIN_APPRENTICES
        ? `${BETRAYAL_MIN_APPRENTICES}+ can move against you`
        : 'hands, and eventually opinions',
  };
}

function loyaltyStake(run: RunState): Stake {
  const { count, loyalty } = run.apprentices;
  const exposed = count >= BETRAYAL_MIN_APPRENTICES;
  const margin = loyalty - BETRAYAL_MAX_LOYALTY;
  return {
    label: 'Loyalty',
    value: `${loyalty}%`,
    caption: exposed
      ? `they turn at ${BETRAYAL_MAX_LOYALTY}%`
      : 'matters once you have a school',
    tone: exposed && margin <= 0 ? 'danger' : exposed && margin <= 15 ? 'warn' : undefined,
  };
}

/**
 * Pact debt, against its ceiling.
 *
 * Reported from play: "I've been consumed by the pact while at 6 out of 7."
 * That was not a miscount — debt used to accrue `+1` every decline era on its
 * own, so a wizard sitting at 6/7 had ZERO eras of headroom while the caption
 * implied one. The fix at the time was to print the clock: `+1 an era on its
 * own · 1 era left`.
 *
 * There is no clock any more. Debt moves only when the player picks a card
 * that moves it, so the ceiling IS the whole rule and the caption says only
 * that. Restoring a rate clause here would be the same lie the old one was,
 * pointing the other way: a player told a number grows on its own, watching it
 * sit still.
 *
 * What replaced the tick — the offer pool leaning toward the Covenant as the
 * balance climbs — is deliberately NOT stated here. It changes which cards are
 * drawn, never a number behind the player's back, and it is disclosed in the
 * cards' own prose. Every point of debt is still printed on a card before it
 * is taken, which is the disclosure rule this file exists to keep.
 *
 * The distance is still shown, and still drives `tone`: `left` is a real
 * measure of how much more the player can sign for.
 */
function pactStake(run: RunState): Stake {
  const left = PACT_LIMIT - run.pactDebt;

  if (run.pactDebt === 0) {
    return { label: 'Pact Debt', value: `0 / ${PACT_LIMIT}`, caption: 'owed to the Covenant' };
  }

  return {
    label: 'Pact Debt',
    value: `${run.pactDebt} / ${PACT_LIMIT}`,
    caption: `collected in full at ${PACT_LIMIT}`,
    tone: left <= 1 ? 'danger' : left <= 2 ? 'warn' : undefined,
  };
}

/**
 * What being a lich is, stated once, for as long as you are one.
 *
 * `run.isLich` was mechanically enormous and visually SILENT: decay stops, the
 * largest defence term in the game switches on, and Ascension closes — and
 * nothing on screen changed. A player took the rite and the run looked
 * identical, which is why the lichdom ending was reported as arriving from
 * nowhere "a few turns after".
 *
 * `null` when not a lich, so the line costs nothing to a run that never took
 * the rite. Held to one line at 393px, the same budget `sealSentence` is held
 * to — a second line here pushes the first choice card further down the one
 * screen this game is built for.
 *
 * Shape is the header's `<clause> · <clause>`, but both clauses are GAINS
 * rather than the usual state-then-trigger: the lich state has no pending
 * trigger, it has already fired. Inventing one would be a lie in the direction
 * rule 5 cares about.
 */
export function lichSentence(run: RunState): string | null {
  if (!run.isLich) return null;
  return `Undeath adds ${DEF_LICH} Wards · Notoriety no longer decays`;
}

export function stakesFor(run: RunState): Stake[] {
  return [
    followersStake(run),
    relicsStake(run),
    apprenticesStake(run),
    loyaltyStake(run),
    pactStake(run),
  ];
}

/**
 * The decline phase's one honest readout.
 *
 * Hero threat kills roughly half of all runs, and offers print `+9 Hero Threat`
 * without ever supplying the denominator that makes the number mean anything.
 * Showing wards against threat is the same disclosure an offer already makes —
 * it is a comparison, not a countdown, and it appears only once a hero exists,
 * so the ascent stays clean.
 */
export type Siege = {
  wards: number;
  threat: number;
  /** How far the hero still has to climb. Negative once he is through. */
  margin: number;
  /** Threat the hero gains at the end of THIS era. The clock on the ceiling. */
  rate: number;
  /**
   * Where the wards come from, largest first, zero terms dropped.
   * `terms[0]` drives the caption's third clause — see `siegeSentence`.
   */
  terms: DefenseTerm[];
  /** The consequence and the rate, in the shape of the seal sentence. */
  sentence: string;
  /**
   * How far the hero has come, 0..1, for the rail. Clamped at both ends.
   *
   * Asserted at the EXTREMES in `stakes.test.ts`, not at a typical value: the
   * faction standing bar shipped mapping its range across half its track and
   * saturated at ±50, so every value past that drew an identical bar — on the
   * one bar where the difference decided whether a run ended (CLAUDE.md
   * failure mode 13).
   */
  ratio: number;
  /**
   * `calm | warn | danger` from `heroBand`, minus `through` — once the hero is
   * through, `checkEndings` has already ended the run, so the header never
   * renders that band.
   */
  tone: 'calm' | 'warn' | 'danger';
};

/**
 * The caption the readout was missing.
 *
 * Two bare numbers with "against" between them disclosed nothing: not what
 * happens at the crossing, not that the gap closes on its own, and not where
 * the wards came from. The seal warning one line above has said all of that
 * for months (`allegiances.ts` → `sealSentence`), so the header was holding
 * its two lethal counters to two different standards — and this is the one
 * that takes the larger share of careers.
 *
 * Three facts, in the order a player can act on them:
 *
 *   1. `he kills you above {wards}` — "above", not "at": `endings.ts` compares
 *      with `>`, so "at" would be wrong by one.
 *   2. `+{rate} an era` — the clock. A ceiling without one is the exact defect
 *      CLAUDE.md's failure mode 1 describes, and the pact caption already says
 *      `+1 an era on its own` in this same header.
 *   3. What is actually holding him off. Calm names the LARGEST EARNED term —
 *      whatever is currently carrying the player, not always the lair. Measured,
 *      lair tier is 30.2% of the mean defence and 16.6% of runs flip from
 *      surviving to slain without it, and the only place the UI ever said so was
 *      a `title` attribute, i.e. nowhere on a phone. But a lich's `Undeath` is
 *      60 — larger than the entire ten-rung lair ladder — and hardcoding "your
 *      lair" would have gone on crediting the lair for it.
 *
 *      `Standing ground` is excluded by `earned`: it is the floor everybody
 *      starts with, so naming it would be advice nobody can act on.
 *
 *      Warn and danger switch to what one more RUNG buys, because in trouble
 *      the marginal number is the actionable one. `DEF_LAIR` is 8 and rungs are
 *      one tier apart, so "the next lair adds 8" is exact.
 *
 * Not the forbidden doom meter: wiki/04 bans ANNOUNCING the losing phase, and
 * the notoriety erosion stays unnarrated. Naming the trigger of an ending is
 * the disclosure rule, not a violation of the tone rule.
 */
function siegeSentence(
  wards: number,
  rate: number,
  carrying: DefenseTerm | undefined,
  tone: Siege['tone'],
): string {
  const clause =
    tone === 'calm' && carrying
      ? `${carrying.label.toLowerCase()} adds ${carrying.value}`
      : `the next lair adds ${DEF_LAIR}`;
  return `he kills you above ${wards} · +${rate} an era · ${clause}`;
}

export function siegeFor(run: RunState, defense: DefenseReadout): Siege | null {
  if (run.phase !== 'decline') return null;
  const raw = defense.total > 0 ? run.heroThreat / defense.total : 0;
  const ratio = Math.max(0, Math.min(1, raw));
  // The SAME band function the era-end beat uses, so the bar and the fiction
  // can never disagree about how close he is.
  const band = heroBand(run.heroThreat, defense.total);
  const tone: Siege['tone'] = band === 'calm' ? 'calm' : band === 'warn' ? 'warn' : 'danger';
  const wards = Math.round(defense.total);
  const rate = Math.round(threatGainFor(run));
  // Largest first, so `terms[0]` is what is keeping the player alive. This is
  // the field's only consumer and the reason it exists — it was computed and
  // rendered nowhere for a while, which is failure mode 2 in miniature.
  const terms = [...defense.terms]
    .filter((t) => t.value !== 0)
    .sort((a, b) => b.value - a.value);
  const carrying = terms.find((t) => t.earned);
  return {
    wards,
    threat: Math.round(run.heroThreat),
    margin: Math.round(defense.total - run.heroThreat),
    rate,
    terms,
    sentence: siegeSentence(wards, rate, carrying, tone),
    ratio,
    tone,
  };
}
