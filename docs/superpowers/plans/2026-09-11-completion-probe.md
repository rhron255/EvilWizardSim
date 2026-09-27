# Adaptive Full-Completion Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `completionProbe` to `scripts/simulate.ts` that measures how many
runs a single adaptive, meta-progressing player needs to discover every ending
and every artifact, and print/gate a "runs to full completion" target — the
prerequisite instrument issue #33 asks for before #32's Ashen Covenant fix can
be judged.

**Architecture:** Mirror `collectionCurve`'s existing shape (persistent
per-player state carried across a capped sequence of runs) but track two
collections — a discovered-artifact-id set (reuse the exact mechanic) and a
discovered-ending-id set (new) — and pick the run's policy adaptively: while
any ending is missing, target the rarest missing one's existing dedicated
seeker policy (`redeemed` forced-Long for `arch_lich`, `pariah_<faction>` for
the five reprisals that need one, `courtier_<faction>` for the five
leaderships, `lich` for `lichdom`, `saint` for `good_wizard`, the general
population mix for the ordinary endings nothing needs to target on purpose);
once every ending has been seen, switch fully to the population mix to finish
the artifact grid, exactly as `collectionCurve` already does.

**Tech Stack:** TypeScript, `tsx`, the existing `scripts/simulate.ts` harness
(`mulberry32` PRNG, `playRun`, `pickPolicy`, `pickEraCount`).

**Spec:** GitHub issue #33 (`Add an adaptive full-completion probe to the
balance harness`) — https://github.com/rhron255/EvilWizardSim/issues/33 (fetched
verbatim via `gh issue view 33` and reproduced in this session's transcript).

## Global Constraints

- Pure instrument addition — no balance, content, or constant changes bundled
  with it (issue's own scope line).
- Reuse `collectionCurve`'s persistent-state-across-runs pattern; do not
  reinvent artifact-set tracking.
- Reuse the existing dedicated-seeker policy mapping (`redeemed`, `pariah_*`,
  `courtier_*`, `lich`, `saint`) rather than inventing new policies.
- Report median, mean, and p90 the same way `collectionCurve.medianRunsToFull`
  is reported today (capped-at-N notation for players who don't finish).
- New target-check row must carry an explicit `PROVENANCE` comment naming this
  design conversation (per CLAUDE.md failure mode 6 — invented targets need
  provenance), not a bare literal.
- `npm run typecheck && npm run test && npm run lint && npm run validate:content`
  must all pass; `npm run sim` must run to completion and print the new rows.

---

### Task 1: `completionProbe` function + report integration

**Files:**
- Modify: `scripts/simulate.ts`

**Interfaces:**
- Consumes: `content` (module-level `ContentBundle`), `playRun`, `pickPolicy`,
  `pickEraCount`, `mulberry32`, `median`, `mean`, `RUN_LENGTHS`, `ALL_ENDING_IDS`,
  `PariahTarget`/`isPariah`-style policy strings already defined in the file,
  `Policy`, `EndingId`, `FactionId`, `REPRISAL_BY_FACTION`, `LEADERSHIP_BY_FACTION`
  (already imported).
- Produces: `type CompletionCurve`, `function completionProbe(baseSeed: number,
  players: number, cap: number): CompletionCurve`, and a `percentile(xs:
  number[], p: number): number` helper alongside the existing `median`/`mean`.
  `main()` calls `completionProbe(...)`, prints a new report section, and adds
  one row to the `checks` array.

- [ ] **Step 1: Add the ending-chase priority table**

  Directly below `COURTIER_TARGETS`'s block (after `courtierTarget`, before
  `type Policy`), nothing needed yet — this table needs `Policy`, so place it
  after the `type Policy = ...` declaration (around line 165), before
  `POPULATION`:

  ```ts
  /**
   * Priority order for "which ending should a completionist chase next" —
   * rarest known ending first, using the SAME dedicated-seeker mapping the
   * probes above already rely on (`reprisalProbe`, `leadershipProbe`,
   * `saintProbe`, `lichProbe`, `redeemedProbe`). An ending with `undefined`
   * here has no dedicated seeker because ordinary play already reaches it
   * often enough that no cohort in this file has ever needed one (the three
   * generic age/threat/loyalty outcomes, and the Pale Academy's reprisal —
   * see `PARIAH_TARGETS`'s own doc comment for why the Academy is excluded
   * from that list). `completionProbe` below falls back to the population
   * mix for those.
   */
  const ENDING_CHASE_ORDER: ReadonlyArray<readonly [EndingId, Policy | undefined]> = [
    ['arch_lich', 'redeemed'],
    ['lichdom', 'lich'],
    ['consumed', 'pariah_worm_below'],
    ['exiled_and_overrun', 'pariah_crownlands'],
    ['turned_to_fertilizer', 'pariah_verdant_choir'],
    ['liquidated', 'pariah_gilded_hand'],
    ['eternally_repurposed', 'pariah_ashen_covenant'],
    ['good_wizard', 'saint'],
    ['overthrown_the_kingdom', 'courtier_crownlands'],
    ['archdruid', 'courtier_verdant_choir'],
    ['archmage', 'courtier_pale_academy'],
    ['grand_arbiter', 'courtier_gilded_hand'],
    ['contract_writer', 'courtier_ashen_covenant'],
    ['ascension', 'ascendant'],
    ['consumed_by_pact', 'reckless'],
    ['sealed_in_gem', undefined],
    ['slain_by_chosen_one', undefined],
    ['betrayed_by_apprentice', undefined],
    ['retired_to_swamp', undefined],
  ];
  ```

- [ ] **Step 2: Add a `percentile` helper next to `median`**

  Right after the `median` function (around line 1431):

  ```ts
  /**
   * `p` in [0, 1]. Nearest-rank, not interpolated — this file's other
   * distribution readouts (`median`) don't interpolate either, and a tail
   * stat only needs to say roughly where the slow players land.
   */
  function percentile(xs: number[], p: number): number {
    if (xs.length === 0) return 0;
    const sorted = xs.slice().sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return sorted[idx];
  }
  ```

- [ ] **Step 3: Write `completionProbe`, right after `collectionCurve`**

  ```ts
  type CompletionCurve = {
    players: number;
    cap: number;
    endingsTotal: number;
    slots: number;
    /** Runs until BOTH checklists are empty, one entry per simulated player. `cap + 1` means "not within cap". */
    runsToComplete: number[];
    medianRunsToComplete: number;
    meanRunsToComplete: number;
    p90RunsToComplete: number;
  };

  /**
   * One continuous meta-progression per simulated player (issue #33): the
   * player is free to re-target strategy after each acquisition, chasing
   * whatever's still missing from BOTH the 19-ending and `content.artifacts`
   * checklists, until both are empty. `collectionCurve` answers the artifact
   * half of this in isolation; this reuses its exact "fold each run into a
   * persistent set" mechanic and adds the ending half plus the adaptive
   * policy switch, because the two checklists are not independent — most
   * endings and artifacts arrive as SIDE EFFECTS of whichever policy the
   * player is currently running for the other reason, so summing each item's
   * isolated expected-wait overstates the true total.
   */
  function completionProbe(baseSeed: number, players: number, cap: number): CompletionCurve {
    const allEndingIds = new Set(ALL_ENDING_IDS);
    const slots = content.artifacts.length;
    const runsToComplete: number[] = [];

    for (let p = 0; p < players; p++) {
      const rng = mulberry32((baseSeed + p * 104729) ^ 0xc0de5eed);
      const ownedArtifacts = new Set<string>();
      const seenEndings = new Set<EndingId>();
      let doneAt = cap + 1;

      for (let n = 1; n <= cap; n++) {
        const target = ENDING_CHASE_ORDER.find(
          ([id]) => allEndingIds.has(id) && !seenEndings.has(id),
        );
        const policy: Policy = target ? (target[1] ?? pickPolicy(rng())) : pickPolicy(rng());
        // `redeemed`'s own probe forces Long for the same reason (arch_lich
        // needs two decline-only scripted cards on the same career, and era
        // length costs a real seeker nothing to maximise) — see
        // `redeemedProbe`'s doc comment.
        const eraCount =
          policy === 'redeemed' ? RUN_LENGTHS[RUN_LENGTHS.length - 1] : pickEraCount(rng());
        const result = playRun(
          baseSeed + p * 104729 + n * 7919,
          eraCount,
          policy,
          Array.from(ownedArtifacts),
        );

        seenEndings.add(result.ending);
        for (const id of result.discoveredIds) ownedArtifacts.add(id);

        if (seenEndings.size >= allEndingIds.size && ownedArtifacts.size >= slots) {
          doneAt = n;
          break;
        }
      }

      runsToComplete.push(doneAt);
    }

    return {
      players,
      cap,
      endingsTotal: allEndingIds.size,
      slots,
      runsToComplete,
      medianRunsToComplete: median(runsToComplete),
      meanRunsToComplete: mean(runsToComplete),
      p90RunsToComplete: percentile(runsToComplete, 0.9),
    };
  }

  /**
   * Cohort size for `completionProbe`. Each "player" is up to `COMPLETION_CAP`
   * whole runs, so this is far more expensive per player than
   * `collectionCurve`'s — sized down accordingly, the same tradeoff
   * `collectionCurve` itself makes (120 players, not 2000). Override via env
   * for local tuning, the same convention as `LICH_DEVOTION` etc.
   */
  const COMPLETION_PLAYERS = Number(process.env.COMPLETION_PLAYERS ?? 150);
  /** Twice the target band's ceiling, so a miss still reports a real number instead of every player reading `>cap`. */
  const COMPLETION_CAP = Number(process.env.COMPLETION_CAP ?? 2000);
  ```

  Place `COMPLETION_PLAYERS`/`COMPLETION_CAP` as module-level constants near
  `PROBE_RUNS`/`SAINT_PROBE_RUNS` (around line 1142), and the `completionProbe`
  function + `CompletionCurve` type immediately after `collectionCurve` (after
  line 1350).

- [ ] **Step 4: Run it once, standalone, to sanity-check timing and output shape**

  ```bash
  npx tsx -e "
  import('./scripts/simulate.ts');
  " 2>&1 | head -5
  ```

  This actually runs the whole CLI (there's no exported entry point), so
  instead just run the real command once now, before wiring the report
  section, to see how long the file takes with the new function DEFINED but
  not yet CALLED — confirm no syntax/type errors:

  ```bash
  npx tsc -b --noEmit
  ```

  Expected: no new errors. (The function is unused at this point, which is
  fine — Step 5 wires it in immediately after.)

- [ ] **Step 5: Call `completionProbe` in `main()` and print a report section**

  In `main()`, right after the existing `collectionCurve` call (around line
  1504):

  ```ts
  const curve = collectionCurve(baseSeed ^ 0x51ede5, 120, 60);
  const completion = completionProbe(baseSeed ^ 0xc0111ec7, COMPLETION_PLAYERS, COMPLETION_CAP);
  ```

  After the existing `THE COLLECTION` block (after the `row('runs that add
  nothing new', ...)` line, around line 2233), add:

  ```ts
  console.log('');
  console.log(
    `FULL COMPLETION  (${completion.players} players, ${completion.endingsTotal} endings + ${completion.slots} artifacts, cap ${completion.cap} runs)`,
  );
  console.log(rule());
  const completionCapped = (v: number) => (v > completion.cap ? `>${completion.cap}` : String(v));
  row('median runs to full completion', completionCapped(completion.medianRunsToComplete));
  row('mean runs to full completion', completion.meanRunsToComplete.toFixed(1));
  row('p90 runs to full completion', completionCapped(completion.p90RunsToComplete));
  ```

  Guard this block (and the `completionProbe` call itself) so `--json` mode
  doesn't pay for it: `completionProbe` must be called AFTER the existing
  `if (hasFlag('json')) { ...; return; }` early-return, the same place
  `reprisalProbe`/`leadershipProbe`/etc. are called (around line 1529) — move
  the `completion = completionProbe(...)` line there, not next to
  `collectionCurve` (which already runs before the JSON early-return today —
  leave that one where it is, but do not add the new expensive call beside
  it).

- [ ] **Step 6: Add the target-check row**

  In the `checks` array (after the `arch_lich` check, before the trophy-case
  check, i.e. after line ~2199 in the original numbering — find it by content,
  not line number, since Steps 1-5 shifted lines):

  ```ts
  [
    /*
     * PROVENANCE: not the wiki — a design conversation confirmed with the
     * user (issue #33's own text, quoting it verbatim): "for each ending &
     * artifact, while changing strategy after acquiring each ending, the
     * game takes less than a thousand runs to finish." That is: one
     * continuous meta-progression across all 19 endings and all
     * `content.artifacts.length` artifacts, free to re-target after each
     * acquisition — measured by `completionProbe`, not summed from the
     * isolated per-ending probes above (their isolated expected-waits are
     * not additive; see `completionProbe`'s own doc comment).
     */
    'Full completion (every ending + every artifact) in under 1000 runs (median)',
    completion.medianRunsToComplete < 1000,
    completionCapped(completion.medianRunsToComplete),
  ],
  ```

- [ ] **Step 7: Run the full gate**

  ```bash
  npm run typecheck && npm run test && npm run lint && npm run validate:content
  ```

  Expected: all four pass (read the actual output, not just the exit code —
  CLAUDE.md failure mode 9).

- [ ] **Step 8: Run the simulator and read the new section**

  ```bash
  npm run sim
  ```

  Expected: a `FULL COMPLETION` section prints with three numeric rows, and a
  `TARGET CHECKS` row for "Full completion ... under 1000 runs (median)" with
  either `[PASS]` or `[FAIL]` and a real (non-`NaN`, non-`>2000`-if-avoidable)
  value. Note the actual median. If it comes back `[FAIL]` or pinned at
  `>2000`, that is real information about the game (matches CLAUDE.md's "when
  a metric looks impossible, suspect the harness first, then report what it
  actually says" — this issue's job is to BUILD the instrument, not to force
  a green light). Report the number to the user either way; do not adjust
  `COMPLETION_CAP` or the chase order to manufacture a pass.

  Also time it:

  ```bash
  time npm run sim
  ```

  If wall time is unreasonable (multiple minutes), reduce `COMPLETION_PLAYERS`
  (not `COMPLETION_CAP` — the cap only matters for players who are still
  running; reducing player count is the cheap lever) and re-run Step 7-8.

- [ ] **Step 9: Commit**

  ```bash
  git add scripts/simulate.ts
  git commit -m "$(cat <<'EOF'
  Add an adaptive full-completion probe to the balance harness (#33)

  completionProbe extends collectionCurve's persistent-state pattern to also
  track the 19-ending checklist, switching each simulated player's policy to
  target whichever ending is rarest and still missing (reusing the existing
  dedicated-seeker policies) until every ending has been seen, then falling
  back to the population mix to finish the artifact grid. This is the
  instrument issue #33 asks for before #32's Ashen Covenant fix can be judged
  against the original "under 1000 runs to 100%" ask.

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WCrkjZE5NXGVSuvM2UGGE5
  EOF
  )"
  ```

## Self-Review Notes

- Spec coverage: cohort/player state (artifact set + ending set) ✓, adaptive
  per-run policy targeting the rarest missing ending via the existing
  dedicated mapping ✓, switch to population-mix artifact hunting once all
  endings seen ✓, median/mean/p90 output ✓, target-check row with provenance
  comment ✓, cohort size large enough not to flicker (150 players, sized down
  from `collectionCurve`'s 120 for the reason given — actually reads as a
  reasonable size given each "player" costs up to 2000 whole runs; revisit at
  Step 8 if the timing forces a change) ✓, no balance/content changes bundled ✓.
- Placeholder scan: none — every step has real code.
- Type consistency: `Policy`, `EndingId`, `ALL_ENDING_IDS`, `RUN_LENGTHS`,
  `mulberry32`, `playRun`, `pickPolicy`, `pickEraCount`, `median`, `mean` are
  all pre-existing names already used with these exact signatures elsewhere in
  `scripts/simulate.ts`; `percentile` and `completionProbe`/`CompletionCurve`
  are the only new names, defined once and used consistently.
