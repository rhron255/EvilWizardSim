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
  PACT_INTEREST,
  PACT_INTEREST_MIN_DEBT,
  PACT_LIMIT,
} from '../../engine';
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
    caption: 'spent as coin — they do not fight for you',
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
 * Pact debt, with its interest disclosed.
 *
 * Reported from play: "I've been consumed by the pact while at 6 out of 7."
 * That is not a miscount. Debt at or above `PACT_INTEREST_MIN_DEBT` accrues
 * `PACT_INTEREST` every decline era on its own (see run.ts), so a wizard
 * sitting at 6/7 had ZERO eras of headroom while the caption implied one.
 *
 * The old caption — "collected in full at 7" — was true and still misled,
 * which is precisely the surprise wiki/04's odds rule exists to prevent. The
 * ceiling was never the whole rule; the clock was.
 *
 * This is not the doom meter wiki/04 forbids. That prohibition is about
 * announcing the decline's notoriety erosion, which is gradual and survivable.
 * This counter is lethal, countable, and player-controllable — the only reason
 * not to state it plainly would be to keep a death untelegraphed.
 */
function pactStake(run: RunState): Stake {
  const left = PACT_LIMIT - run.pactDebt;
  const accruing = run.phase === 'decline' && run.pactDebt >= PACT_INTEREST_MIN_DEBT;

  if (run.pactDebt === 0) {
    return { label: 'Pact Debt', value: `0 / ${PACT_LIMIT}`, caption: 'owed to the Covenant' };
  }

  // Eras until collection, counting the interest that lands each era.
  const erasLeft = accruing ? Math.max(0, Math.ceil(left / PACT_INTEREST)) : Infinity;

  let caption: string;
  if (!accruing) {
    caption =
      run.pactDebt >= PACT_INTEREST_MIN_DEBT
        ? `starts growing +${PACT_INTEREST} an era after the prophecy`
        : `collected in full at ${PACT_LIMIT}`;
  } else if (erasLeft <= 1) {
    caption = 'the Covenant collects this era unless you pay';
  } else {
    caption = `+${PACT_INTEREST} an era on its own · ${erasLeft} eras left`;
  }

  return {
    label: 'Pact Debt',
    value: `${run.pactDebt} / ${PACT_LIMIT}`,
    caption,
    tone: erasLeft <= 1 ? 'danger' : erasLeft <= 3 || left <= 2 ? 'warn' : undefined,
  };
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
export type Siege = { wards: number; threat: number; tone: 'calm' | 'warn' | 'danger' };

export function siegeFor(run: RunState, defense: number): Siege | null {
  if (run.phase !== 'decline') return null;
  const ratio = defense > 0 ? run.heroThreat / defense : 0;
  return {
    wards: Math.round(defense),
    threat: Math.round(run.heroThreat),
    tone: ratio >= 0.85 ? 'danger' : ratio >= 0.6 ? 'warn' : 'calm',
  };
}
