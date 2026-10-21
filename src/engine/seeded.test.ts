/**
 * Seeded creation (issue #123): a career can start from a fixed opening
 * (seed + origin + length), and a saved career is never discarded for one.
 */
import { describe, expect, it } from "vitest";
import { REAL_CONTENT as content } from "../testing/realContent";
import type { SeedPreset } from "../types";
import {
  emptyCollection,
  saveInProgressRun,
  loadInProgressRun,
} from "./persistence";
import { createRun, formatRunCode, parseRunCode } from "./run";
import { gameReducer } from "./useGame";
import { RUN_KEY } from "./constants";

type State = Parameters<typeof gameReducer>[0];

const initial = (): State => ({
  screen: "title",
  run: null,
  offer: null,
  resolution: null,
  collection: emptyCollection(""),
  prophecyPending: false,
  resumable: null,
  preset: null,
  pendingPreset: null,
  unlockedTheme: null,
});

const preset: SeedPreset = {
  seed: 0x0000abcd,
  originId: content.origins[1].id,
  eraCount: 12,
  challenge: { kind: "daily", day: 20747 },
};

const create = (state: State, p: SeedPreset | null) =>
  gameReducer(state, {
    type: "create",
    name: "Mord",
    epithet: "the Patient",
    originId: p?.originId ?? content.origins[0].id,
    eraCount: p?.eraCount ?? 16,
    seed: p?.seed ?? 99,
    challenge: p?.challenge,
    content,
  });

describe("run codes", () => {
  it("pads to eight digits and round-trips", () => {
    expect(formatRunCode(0xabcd)).toBe("0000abcd");
    expect(parseRunCode(formatRunCode(0xabcd))).toBe(0xabcd);
    expect(parseRunCode(formatRunCode(0xffffffff))).toBe(0xffffffff);
  });
  it("rejects anything that is not eight hex digits", () => {
    for (const bad of ["abcd", "0000abcg", "000000000", "", " "])
      expect(parseRunCode(bad)).toBeNull();
  });
});

describe("seeded start", () => {
  it("opens creation with the preset and builds the exact opening", () => {
    const s = gameReducer(initial(), { type: "startSeeded", preset });
    expect(s.screen).toBe("creation");
    expect(s.preset).toEqual(preset);
    const a = create(s, preset).run!;
    const b = create(s, preset).run!;
    expect(a.seed).toBe(preset.seed);
    expect(a.originId).toBe(preset.originId);
    expect(a.eraCount).toBe(12);
    expect(a.challenge).toEqual(preset.challenge);
    // Same opening, same first offer.
    expect(create(s, preset).offer?.id).toBe(create(s, preset).offer?.id);
    expect(b.eraIndex).toBe(0);
  });

  it("an ordinary career is challenge none", () => {
    expect(create(initial(), null).run!.challenge).toEqual({ kind: "none" });
    expect(
      createRun(
        { wizardName: "x", originId: content.origins[0].id, eraCount: 16 },
        content,
      ).challenge,
    ).toEqual({ kind: "none" });
  });

  it("waits behind a resumable career instead of discarding it", () => {
    const live = create(initial(), null).run!;
    const s = gameReducer(
      { ...initial(), resumable: live },
      { type: "startSeeded", preset },
    );
    expect(s.screen).toBe("title");
    expect(s.resumable).toBe(live);
    expect(s.pendingPreset).toEqual(preset);
    expect(s.preset).toBeNull();
  });

  it("opens when the career ends and the player plays again", () => {
    const running = create(initial(), null);
    const waiting = gameReducer(running, { type: "startSeeded", preset });
    expect(waiting.screen).toBe("run");
    expect(waiting.run).toBe(running.run);
    const again = gameReducer(waiting, { type: "playAgain" });
    expect(again.preset).toEqual(preset);
    expect(again.pendingPreset).toBeNull();
  });

  it("a plain begin clears any shown preset", () => {
    const s = gameReducer(
      gameReducer(initial(), { type: "startSeeded", preset }),
      { type: "begin" },
    );
    expect(s.preset).toBeNull();
  });
});

describe("saved careers without a challenge", () => {
  it("load as challenge none, with no save-version bump", () => {
    const run = create(initial(), null).run!;
    saveInProgressRun(run);
    const raw = JSON.parse(localStorage.getItem(RUN_KEY)!);
    delete raw.run.challenge;
    localStorage.setItem(RUN_KEY, JSON.stringify(raw));
    expect(loadInProgressRun()?.challenge).toEqual({ kind: "none" });
  });
});
