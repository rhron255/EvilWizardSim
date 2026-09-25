/**
 * `relicPowerText` on its own, with LITERAL expected strings.
 *
 * Issue #80 review (failure mode 11, "the check that graded its own
 * homework"): the only prior coverage of this function lived in
 * `NecrolexiconScreen.test.tsx`, which computed its expected value by calling
 * `relicPowerText` itself — a regression in the function under test would
 * pass against an expectation drawn from that same buggy function. These
 * tests instead hand-write the exact string, so a wording bug has something
 * independent to fail against.
 */
import { describe, expect, it } from 'vitest';
import type { RelicPower } from '../../types';
import { relicPowerText } from './relicPower';

describe('relicPowerText · literal strings', () => {
  it('combines watchesPositive AND if, rather than dropping if', () => {
    // The bug this pins: `gate = watchPhrase || ifPhrase(...)` silently threw
    // away `if` the instant `watchesPositive` was also set, so a power gated
    // on BOTH the choice and ambient state disclosed only half its condition
    // on every surface that renders it (the relic page, the creation screen,
    // the Necrolexicon).
    const power: RelicPower = {
      kind: 'trigger',
      when: 'onChoice',
      watchesPositive: 'pactDebt',
      if: [{ c: 'minNotoriety', v: 40 }],
      effects: [{ t: 'notoriety', v: 1 }],
    };
    expect(relicPowerText(power)).toBe(
      'At the choice you make, if the choice raises your Pact Debt and your Notoriety is 40+: +1 Notoriety.',
    );
  });

  it('combines watchesPositive AND if on a `once` power too', () => {
    const power: RelicPower = {
      kind: 'trigger',
      when: 'onChoice',
      once: true,
      watchesPositive: 'pactDebt',
      if: [{ c: 'minNotoriety', v: 40 }],
      effects: [{ t: 'pactDebt', v: -1 }],
    };
    expect(relicPowerText(power)).toBe(
      'Once, the first time the choice raises your Pact Debt and your Notoriety is 40+: −1 Pact Debt.',
    );
  });

  it('keeps the plain watchesPositive-only phrasing when there is no if', () => {
    // The Ashen Signature's real power (`src/content/artifacts.ts`) — pinned
    // literally so this branch, which the fix above must NOT change, has its
    // own independent anchor rather than relying on the Necrolexicon test.
    const power: RelicPower = {
      kind: 'trigger',
      when: 'onChoice',
      once: true,
      watchesPositive: 'pactDebt',
      effects: [{ t: 'pactDebt', v: -1 }],
    };
    expect(relicPowerText(power)).toBe('Once, the first choice that raises your Pact Debt: −1 Pact Debt.');
  });

  it('keeps the plain if-only phrasing when there is no watchesPositive', () => {
    // The Unpaid Purse's real gate shape (`if: [{ c: 'maxFollowers', ... }]`,
    // no `watchesPositive`) — the branch that already worked before the fix.
    const power: RelicPower = {
      kind: 'trigger',
      when: 'eraEnd',
      if: [{ c: 'maxFollowers', v: 9 }],
      effects: [{ t: 'followers', v: 10 }],
    };
    expect(relicPowerText(power)).toBe("At every era's end, if you have under 10 Followers: +10 Followers.");
  });
});
