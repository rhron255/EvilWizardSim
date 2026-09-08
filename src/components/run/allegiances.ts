/**
 * Faction standing, and the two things it can silently do to you.
 *
 * Playtest: "I've been locked up in a gem twice now without understanding why?
 * this should be made clear why the game ends abruptly."
 *
 * `sealed_in_gem` is the SECOND most common ending — 18.5% of runs — and it
 * fires the moment Pale Academy standing falls to `SEAL_MAX_STANDING` while
 * notoriety is at or above `SEAL_MIN_NOTORIETY`. Until now the run screen did
 * not show faction standing at all, so the entire condition was invisible.
 *
 * It is worse than merely hidden, because standing mostly moves by CONTAGION:
 * courting the Ashen Covenant costs Academy standing automatically (they are
 * `hostileTo` each other), so a player can be driven into the seal by choices
 * whose cards never mentioned the Academy. That is an undisclosed downside in
 * the exact sense wiki/04 forbids, arrived at by a route the player cannot see.
 *
 * ALL SIX FACTIONS NOW CARRY THAT CONDITION (issue #14). Everything below used
 * to read `SEAL_FACTION` and nothing else, which was correct while the Academy
 * owned the only lethal end of standing. Leaving it that way would have shipped
 * five reprisals with no tick, no tone and no warning — the same "a ceiling with
 * no visible distance" bug the file was written to fix, five times over. The
 * disclosure generalises with the mechanic, in the same commit.
 *
 * The other silent effect is the artifact lockout: at or below
 * `ARTIFACT_LOCKOUT_STANDING` a faction's relics stop being grantable, so an
 * offer promising one quietly does nothing.
 */

import {
  ARTIFACT_LOCKOUT_STANDING,
  DEVOTION_STANDING,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
  nearestReprisalFaction,
  patronFaction,
  reprisalLiveFor,
} from '../../engine';
import type { Faction, FactionId, RunState } from '../../types';

export type Allegiance = {
  id: FactionId;
  name: string;
  /** Short name for the compact strip. */
  short: string;
  standing: number;
  /** −1..1, for the bar. */
  ratio: number;
  /**
   * Where this faction's reprisal sits on its bar, as −1..1.
   *
   * The header used to carry the seal as a permanent sentence. That sentence
   * is now taught once in the first-run guide and printed again only when the
   * reprisal is genuinely close, so the LIVE distance has to live somewhere
   * that costs no vertical space: a tick on the faction's own bar, which the
   * player is already scanning. A threshold you can see the bar approaching is
   * the same disclosure in a band that was already on screen.
   *
   * Never `null` any more, and the type keeps saying `| null` on purpose: a
   * content pack may hand `allegiancesFor` a cast this build has no reprisal
   * for, and a missing tick is the honest rendering of "this bar cannot end
   * your run" — which is what the other five bars were, before it could.
   */
  sealAt: number | null;
  tone: 'devoted' | 'warm' | 'neutral' | 'cold' | 'locked' | 'lethal';
  /** One line naming what this standing is currently doing. */
  note: string;
};

/**
 * Six labels that fit a third of a phone.
 *
 * Ellipsising the full names produced "ASHEN CO...", "VERDANT CH..." and
 * "CROWNLAN..." — unreadable, and worse, ambiguous at a glance in a strip whose
 * whole job is quick scanning. Each of these is the word players actually use.
 */
const SHORT_NAME: Record<FactionId, string> = {
  ashen_covenant: 'Covenant',
  gilded_hand: 'Gilded',
  pale_academy: 'Academy',
  verdant_choir: 'Choir',
  crownlands: 'Crown',
  worm_below: 'Worm',
};

/**
 * What each faction DOES about you, in six words or fewer.
 *
 * One vocabulary, three consumers: the bar's note, the header sentence, and
 * the ending each of them is warning about. Written once so the warning and
 * the ending it precedes use the same imagery — a header that says "the gem"
 * above a card that says "the loam" is two disclosures of two different
 * things.
 */
const REPRISAL_ACT: Record<FactionId, string> = {
  ashen_covenant: 'puts you in the inventory',
  gilded_hand: 'sells you off in lots',
  pale_academy: 'seals you in a gem',
  verdant_choir: 'takes the ground back',
  crownlands: 'has you escorted over the border',
  worm_below: 'keeps the appointment',
};

/** The short noun the DISTANCE is measured to. Kept short: it has to fit a line. */
const REPRISAL_NOUN: Record<FactionId, string> = {
  ashen_covenant: 'the ash',
  gilded_hand: 'the auction',
  pale_academy: 'the gem',
  verdant_choir: 'the loam',
  crownlands: 'the writ',
  worm_below: 'the schedule',
};

/** How each faction reads once standing is already past the line. */
const REPRISAL_PAST: Record<FactionId, string> = {
  ashen_covenant: 'has a use for you',
  gilded_hand: 'has called the account',
  pale_academy: 'is done deliberating',
  verdant_choir: 'wants the ground back',
  crownlands: 'has drawn up the writ',
  worm_below: 'has set your date',
};

/**
 * The subject of the header sentence.
 *
 * Not `SHORT_NAME`, for one faction: the strip's "Gilded" is a column label
 * and reads as a fragment in a sentence ("The Gilded is 20 from the auction").
 * Every entry here is still short enough to hold the one-line budget the
 * sentence is measured against.
 */
const REPRISAL_SUBJECT: Record<FactionId, string> = {
  ashen_covenant: 'The Covenant',
  gilded_hand: 'The Hand',
  pale_academy: 'The Academy',
  verdant_choir: 'The Choir',
  crownlands: 'The Crown',
  worm_below: 'The Worm',
};

/**
 * How close a faction has to be before its bar reads as lethal.
 *
 * Phase-gated through the engine's own `reprisalLiveFor`, not a copy of it:
 * five of the six reprisals cannot fire during the ascent, and a red bar for a
 * condition that structurally cannot fire is a false alarm — the inverse of
 * the bug this file exists to fix, and just as dishonest.
 */
function toneFor(run: RunState, id: FactionId, standing: number): Allegiance['tone'] {
  if (reprisalLiveFor(id, run) && standing <= SEAL_MAX_STANDING + 12) return 'lethal';
  if (standing <= ARTIFACT_LOCKOUT_STANDING) return 'locked';
  if (standing >= DEVOTION_STANDING) return 'devoted';
  if (standing >= 20) return 'warm';
  if (standing <= -20) return 'cold';
  return 'neutral';
}

function noteFor(run: RunState, id: FactionId, standing: number, tone: Allegiance['tone']): string {
  if (tone === 'lethal') {
    const act = REPRISAL_ACT[id];
    if (standing <= SEAL_MAX_STANDING) {
      return run.notoriety >= SEAL_MIN_NOTORIETY
        ? `${act} now`
        : `${act} once you pass ${SEAL_MIN_NOTORIETY} Notoriety`;
    }
    return run.notoriety >= SEAL_MIN_NOTORIETY
      ? `${act} at ${SEAL_MAX_STANDING}`
      : `${act} at ${SEAL_MAX_STANDING}, once you pass ${SEAL_MIN_NOTORIETY} Notoriety`;
  }
  if (tone === 'locked') return 'their relics are locked to you';
  if (tone === 'devoted') return 'their reliquary is open';
  if (tone === 'warm') return 'their offers surface more often';
  if (tone === 'cold') return 'their offers are turning to threats';
  return 'indifferent';
}

export function allegiancesFor(run: RunState, factions: Faction[]): Allegiance[] {
  return factions.map((f) => {
    const standing = run.factionStanding[f.id] ?? 0;
    const tone = toneFor(run, f.id, standing);
    return {
      id: f.id,
      name: f.name,
      short: SHORT_NAME[f.id],
      standing,
      ratio: Math.max(-1, Math.min(1, standing / 100)),
      // Every faction can end a run now, so every bar carries the tick. The
      // threshold does not vary by faction, only what happens when you cross
      // it does.
      sealAt: REPRISAL_NOUN[f.id] ? Math.max(-1, Math.min(1, SEAL_MAX_STANDING / 100)) : null,
      tone,
      note: noteFor(run, f.id, standing, tone),
    };
  });
}

/**
 * The standing condition closest to ending this run, surfaced separately so
 * the header can warn about it without the player having to read six rows.
 * `null` when no reprisal is a live threat.
 *
 * ONE warning, never six. The header has room for a line, not a table, and a
 * player two points from the Choir does not need to be told about the Crown as
 * well — so the sentence names the faction that would actually fire, picked by
 * the ENGINE's own rule (`nearestReprisalFaction`) rather than by a second
 * implementation of it. A warning that pointed at a different faction than the
 * one about to act would be worse than silence.
 */
export type ReprisalWarning = {
  factionId: FactionId;
  standing: number;
  margin: number;
  armed: boolean;
};

/**
 * How close the fame half has to be before the sentence is worth a line.
 *
 * A reprisal needs BOTH halves. A wizard at 11 Notoriety with the Academy 20
 * from the gem cannot be sealed by anything, yet the header printed the
 * sentence anyway from era one — a permanent line about a threat that was not
 * live, directly above the choice cards on a screen where the first card
 * already starts ~630px down.
 *
 * Provenance: this number is a screen-budget judgement, not a wiki figure.
 * What the wiki fixes is the trigger (`SEAL_MAX_STANDING`, `SEAL_MIN_NOTORIETY`);
 * what is disclosed continuously is the standing half, now drawn as a tick on
 * each faction's own bar. The sentence is the ARMED warning, and the first-run
 * guide teaches what a reprisal is.
 */
const SEAL_FAME_LEAD = 12;

/**
 * The reprisal nearest to firing, unconditionally — issue #18's Decision-tab
 * "next-threat line". Ascent or decline, close or distant, this always names
 * the faction `nearestReprisalFaction` would act through first (the Academy is
 * live in every phase, so this is `null` only for a cast that omits it
 * entirely). It is deliberately NOT gated the way `reprisalWarningFor` below
 * is: the Decision tab has room for an ambient status line every era, not
 * just an alarm, and a player planning a career benefits from knowing who is
 * closest even while that faction is in good health.
 *
 * `reprisalWarningFor` is this same computation with the Career tab's
 * proximity gates layered on top, so the two can never name different
 * factions or disagree about the distance.
 */
export function nextThreatFor(run: RunState): ReprisalWarning | null {
  const factionId = nearestReprisalFaction(run, 'live');
  if (factionId === undefined) return null;
  const standing = run.factionStanding[factionId] ?? 0;
  return {
    factionId,
    standing,
    margin: standing - SEAL_MAX_STANDING,
    armed: run.notoriety >= SEAL_MIN_NOTORIETY,
  };
}

export function reprisalWarningFor(run: RunState): ReprisalWarning | null {
  const status = nextThreatFor(run);
  if (status === null) return null;
  // Only warn once it is genuinely close; a faction in good health is not news.
  if (status.margin > 25) return null;
  // ...and, while standing still has room, only once the OTHER half of the
  // trigger is within reach. Both conditions have to be live before this is a
  // warning rather than trivia.
  //
  // The exception is not optional: once standing is already at or past the
  // threshold, the ONLY thing keeping the run alive is a notoriety number that
  // the whole game pushes upward. That is precisely when the fame half has to
  // be named, and it is the case `WizardHeader.test.tsx` pins.
  if (status.margin > 0 && run.notoriety < SEAL_MIN_NOTORIETY - SEAL_FAME_LEAD) return null;
  return status;
}

/**
 * The reprisal, written out with BOTH of its conditions.
 *
 * It takes two numbers to end a run this way — standing at or under
 * `SEAL_MAX_STANDING` *and* notoriety at or over `SEAL_MIN_NOTORIETY` — and the
 * header used to name only the first. A wizard already past the standing
 * threshold read "The Pale Academy is done deliberating." and then died to a
 * card that granted Notoriety and never mentioned the Academy: the fame half of
 * the trigger was never disclosed, so the choice that armed it looked safe.
 *
 * Same rule as the pact caption. A threshold without the thing that trips it
 * is half a disclosure.
 *
 * Every variant is held to ONE LINE at 393px — measured, not estimated
 * (`qa/probe-seal-fit.mjs`, which carries a candidate per faction). The
 * header sits above the choice cards, so a second line here pushes the first
 * card 19px further down the reference device; the sentence this replaced
 * wrapped whenever the seal was armed, which is exactly when the player most
 * needs the card they are about to tap. That is why the nouns above are
 * short, and why the not-yet-armed trigger below reads "acts at", not "it
 * acts at": the six-faction generalization (issue #14) widened the Academy's
 * own subject and noun (`REPRISAL_SUBJECT`/`REPRISAL_NOUN`) into the six the
 * budget was never re-measured against, and three of them — the Academy,
 * the Covenant, the Worm — wrapped at 393px until the probe was fixed to
 * measure the shipped line's own height instead of the shortest candidate in
 * its own set (which, once most of them wrapped, was itself a wrapped
 * height). Dropping "it " is the one uniform trim that clears all three with
 * room to spare, without reaching for a faction-specific shortening that
 * would make the six read unevenly.
 */
export function reprisalSentence(warning: ReprisalWarning): string {
  const distance =
    warning.margin <= 0
      ? REPRISAL_PAST[warning.factionId]
      : `is ${warning.margin} from ${REPRISAL_NOUN[warning.factionId]}`;
  const trigger = warning.armed ? 'your fame qualifies' : `acts at ${SEAL_MIN_NOTORIETY} Notoriety`;
  return `${REPRISAL_SUBJECT[warning.factionId]} ${distance} · ${trigger}.`;
}

/**
 * The Decision tab's other status line — who this career is currently
 * courting, by the engine's own rule rather than a second walk of
 * `factionStanding`.
 *
 * `patronFaction` already backs the ending screen's "who remembers you"
 * passage (`src/components/meta/standing.ts`); this is the same function, on
 * the run screen, while the outcome is still live. `null` is a real, common
 * state — most careers never clear `PATRON_MARGIN` over a runner-up — and the
 * issue's acceptance check calls it out explicitly ("with a no-patron
 * state"), so callers must render *something* for it rather than omitting the
 * line, or the Decision tab silently loses the distinction between "no patron
 * yet" and "this UI forgot to ask".
 */
export type Patron = {
  factionId: FactionId;
  name: string;
  standing: number;
};

export function patronFor(run: RunState, factions: Faction[]): Patron | null {
  const factionId = patronFaction(run);
  if (factionId === undefined) return null;
  const faction = factions.find((f) => f.id === factionId);
  // A cast that does not contain the faction yields nothing rather than a
  // half-sentence with an id in it — same rule `standing.ts`'s `bond` follows.
  if (!faction) return null;
  return { factionId, name: faction.name, standing: run.factionStanding[factionId] ?? 0 };
}
