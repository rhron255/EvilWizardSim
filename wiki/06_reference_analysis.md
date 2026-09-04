---
name: Reference Analysis
description: Analysis of ליגיונר (legionnaire.xyz), the ten design principles derived from it, and what does not transfer.
---

# Reference Analysis

## Why This Page Exists

Several constraints elsewhere in this wiki look arbitrary. They are not.
They come from analysis of a game that worked at scale, and this page
records the reasoning so future maintainers can tell a load-bearing rule
from a preference.

## The Source

**ליגיונר** (legionnaire.xyz) — a Hebrew football-career simulator built
in about a week by Gal Bartov using Claude, with no prior coding
experience. It reached roughly 150,000 users playing close to 750,000
careers in 72 hours, and passed 2,000,000 careers shortly after.

A run: you name a player, pick a youth club, and advance season by season
through Israeli football, occasionally getting offers with printed odds,
until you retire. Two to three minutes.

## Observed Run

One recorded playthrough, for concreteness: started age 16 at Hapoel
Be'er Sheva youth, moved through Hapoel Azor, Hapoel Umm al-Fahm, Maccabi
Netanya, Hapoel Tel Aviv, Corinthians, and Hapoel Jerusalem. Retired
around 38. Peak rating 81. 623 appearances, 23 goals, 17 assists.
**Zero titles.**

That last figure is the design working as intended.

## The Ten Principles

1. **Name it after them first.** Identity capture before any mechanic
   exists. Everything after happens to something labeled with the player.
2. **Short enough to repeat.** 2–3 minutes per full arc. "One more" must
   cost less than the curiosity.
3. **2–4 tappable choices, never typing.** Setup is the only input-heavy
   moment.
4. **Show the odds before the commit.** The load-bearing agency
   mechanism. Randomness with printed probabilities feels like a
   decision.
   *Amended (issue #14 slice 5 / issue #23).* The Good Wizard route's two
   hidden counters (`goodActs`/`illActs`) are the one deliberate exception,
   narrower than principle 6's theme exception below: never disclosed
   anywhere, on the ground that the route they gate can only ever ADD an
   ending and can never end a run early, close a door, or move any other
   threshold. See CLAUDE.md's amendment to failure mode 1 for what enforces
   that ground rather than merely asserting it.
5. **Append, never reset.** A slot machine resets each pull; this appends.
   By the late run the player is looking at a table with fifteen seasons
   in it, and *that* is what makes quitting expensive — not any single
   outcome.
6. **One scarce color.** The reference palette is near-monochrome dark.
   The only real visual reward is the rating badge going grey → gold.
   Rationed, so it means something.
   *Amended (issue #15).* We diverge from the reference here, knowingly:
   endings unlock cosmetic themes. The rationing survives because the
   scarcity was never about "one hue in the build" — it was about the
   badge being the thing the run pays you. A theme is not paid out by a
   run, it is chosen between them, and it is forbidden from touching
   `--ew-tier`. What would break the pillar is a *second rationed reward
   inside a career*; a wardrobe is not that.
7. **Flip the motivation late.** Early: chase upside. Late: a stat starts
   eroding and the player is defending what they built. Loss aversion
   outlasts hope, and the reference game delivers both inside three
   minutes.
8. **No fail state.** Retiring at a mid-table club with 623 games is
   still a biography. Nothing the player does produces "you lost." The
   game does not grade the run, it narrates it.
9. **Engineer near-misses.** Reaching a high rating and finishing with
   zero titles is the textbook near-miss — close enough that the trophy
   felt owed.
10. **The ending is a shareable object.** The final club grid reads like
    a trophy case and was the most-shared element.

**4 + 5 are the load-bearing pair.** Printed odds create the illusion of
authorship; the accumulating ledger creates sunk cost. Randomness alone
gives you a slot machine. Those two together give you a biography.

## The Sandbox Signal

Reporting on the reference game noted that players invented their own
constraints — one club only, one league only, loyalty to a single agent.
That behavior is diagnostic: **a gambler does not handicap themselves;
someone playing in a sandbox does.** Design decisions that support
self-imposed constraints (faction hostility, artifact-to-faction binding)
are protecting the thing that produced hundred-run players.

## What Does Not Transfer

**The crests.** An Israeli football fan seeing Hapoel Jerusalem receives
forty years of accumulated feeling at zero cost to the developer. That
was free emotional labor, and invented wizard factions have none of it on
run one.

Two compensations, both adopted in this design:

1. **A fixed recurring cast.** The same six factions and the same
   named rival wizards and hero bloodlines in every run, so recognition
   accrues by run five instead of run one.
2. **Comedy as the art budget.** An evil wizard premise lets one good
   line of flavor text do the work a real club badge did. This is why
   the tone rule exists — and why it is quarantined to flavor text, since
   jokey *numbers* would undercut principles 5 and 8.

Accept that runs 1–3 will be weaker than the reference game's. The
recovery is at run 5+, and only if the cast is genuinely fixed.

## Attribution

The reference game is someone else's work and this project should not
copy its content, visual identity, or naming. What is being reproduced is
a reward *structure*, which is not the part that belongs to anyone.
