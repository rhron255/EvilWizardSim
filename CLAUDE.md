# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `README.md` — currently just the project name. Not yet fleshed out.
- `wiki/` — the design & planning wiki. **This is the authoritative source for what this game is and how it should work**, until code exists to supersede it. Start at `wiki/index-1.md`.
- Nothing else exists yet — no `src/`, no build files, no CI, no `.claude/`. When implementation starts, code will most likely live under `src/` per the proposed architecture in `wiki/03_systems_architecture-1.md`.

## Current phase: pre-implementation

Nothing is built. Every wiki page describes *proposed* behavior — **do not treat anything in `wiki/` as documenting existing code**, and don't assume any interface, component, or function named there actually exists in the repo. `wiki/index-1.md`'s status table (Core loop / Data models / Content catalogs / Technical architecture / Balance formulas / Art & audio) is the single source of truth for what's Planned vs. Missing vs. Blocked.

Near-term work on this repo is mostly **wiki/design work**: resolving the P0 blocking decisions in `wiki/00_tasks-1.md`, filling in `Missing` content catalogs (factions, artifacts, offers, endings), and tightening the specs in `01_core_loop.md` / `02_data_models_and_content-1.md` / `04_operational_behaviors-1.md` ahead of the Phase 1 vertical slice in `05_implementation_blueprint-1.md`. Treat wiki edits with the same care as code changes — see "Wiki editing conventions" below.

## What this project is

A 2–4 minute browser game in which the player builds an evil wizard's career across "eras," producing a permanent, shareable end-of-run record. Meant to be replayed dozens of times. The reward structure is deliberately modeled on **ליגיונר** (legionnaire.xyz), an Israeli football-career game that reached ~750,000 careers played in its first 72 hours.

**Read `wiki/06_reference_analysis.md` and `wiki/01_core_loop.md` before changing anything about rewards, pacing, or ending conditions.** The non-obvious constraints in this design — printed odds before every gamble, an append-only ledger, no fail state, comedy quarantined to flavor text (never the numbers), one scarce UI color — are load-bearing and derived from analysis of a game that demonstrably worked at scale. They will look like arbitrary restrictions without that context.

## Proposed stack (working plan)

Not formally signed off — `wiki/03_systems_architecture-1.md` flags this `Blocked`, pending owner sign-off — but treat it as the working assumption until someone overrides it:

- **React + TypeScript**, single-page, client-side only, no backend for v1.
- **No game engine.** This is a state machine and a table; a canvas framework would be overhead.
- **Static hosting** (Vercel/Netlify-equivalent).
- **`localStorage`** for cross-run persistence (the artifact collection).
- Content (offers, artifacts, factions, lairs, endings) authored as **typed const arrays in `src/content/`**, not a CMS — volume (~120 offers) is too low to justify one.

Other open decisions still block real content work (`wiki/index-1.md` § Open Decisions): target language (comedy doesn't translate cheaply — decide before authoring) and monetization/hosting are unresolved. Flag these rather than guessing if a task depends on them.

## Commands

None yet — no `package.json`, no build tooling, no CI. This section gets filled in for real once the stack is confirmed and scaffolded. Two pieces of tooling the wiki calls out as needing to exist early:

- A **content validation script**, written *before* content authoring starts — checks every artifact references a valid faction, every offer has 2–4 options, every probabilistic option declares both success and failure effects.
- A **headless simulation harness** that plays N runs and reports ending distribution, Notoriety spread, and Ascension rate — required before any balance tuning; balancing without it is guesswork.

Check `wiki/00_tasks-1.md` (P0–P1) for what's currently blocking the first line of code.

## Wiki editing conventions

- Each page carries YAML frontmatter (`name`, `description`) — keep it accurate when a page's scope changes.
- Status legend used throughout: `Planned` · `Partial` · `Complete` · `Blocked` · `Missing`. Update a page's status table when you change what it covers.
- `wiki/index-1.md`'s Page Map and status table is the index for the whole wiki — update it when a page's scope or status changes.
- Cross-references matter: a change to `02_data_models_and_content-1.md`'s schemas can invalidate examples in `03_systems_architecture-1.md` or task assumptions in `00_tasks-1.md`. Grep the wiki for the old term before calling a wiki edit done — the same discipline as keeping prose in sync with behavior in a real codebase.

## Multi-agent workflow — future, once implementation begins

This does not apply yet. There's no multi-part codebase to split across agents, and right now this is single-agent wiki work. Once the Phase 1 vertical slice (`wiki/05_implementation_blueprint-1.md`) starts, the following applies:

### Ship in reviewable slices

Land the vertical slice as its own small, reviewable unit before touching Phase 2. Within a phase, prefer one slice per PR (e.g. "RunState reducer" separate from "Ledger component") over one PR per phase. Never base a PR on `init` — each PR starts from the previous merged state.

### The data model is the contract

`wiki/02_data_models_and_content-1.md`'s schemas (`RunState`, `EraRecord`, `Faction`, `Artifact`, `Offer`, `Collection`) are this project's equivalent of a frozen API contract — the seam between the engine (reducer/systems), the UI (components), and content (typed data files). Change those shapes deliberately, and don't let an engine-focused agent and a content-focused agent invent divergent shapes for the same entity in parallel.

### Likely agent boundaries once code exists

There's no frontend/backend split here — no backend. The natural split instead:

| Agent | Owns |
|---|---|
| Engine agent | `RunState` reducer, event flow, persistence (`src/` state/logic) |
| UI agent | Presentational components (`<Ledger>`, `<OfferPanel>`, `<WizardHeader>`, etc.) |
| Content agent | Typed data files in `src/content/` (factions, artifacts, offers, endings) — blocked until the language decision lands |
| Orchestrator | `wiki/`, cross-boundary fixes, the data-model contract |

State the boundary explicitly in each agent's brief, including what it must *not* touch. An agent that wants a change outside its boundary reports it instead of making it.

### Isolated QA review still applies

Same principle as any codebase: a reviewer who's been told the plan will tell you the plan is fine. Once there's a PR, review it from minimal context — the diff only, no rationale, no design discussion — before merging. A low-tier model is enough for that pass, since it just has to run every time without being expensive; escalate an individual finding, not the whole review, if one needs deeper judgement.

## Verification discipline

There's no build to gate on yet, so today the equivalent of "run the tests" is: re-read the wiki pages a change touches and the pages that reference them, and check the status tables still match reality. Once code exists, follow whatever `## Commands` says at that time — this file should get a real gate (typecheck/build/test) as soon as `package.json` exists.
