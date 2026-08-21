/**
 * Every probe here drives a fresh browser profile, so every probe is a
 * first-time player: `localStorage` is empty, `tutorialSeen` is false, and the
 * three-card guide opens over the first era and blocks the choice cards.
 *
 * That is correct behaviour and it broke every script that plays a run — which
 * is the point of putting it in one place. A probe either walks the guide (as
 * a new player does) or declares itself a returning player.
 */

/** Walk the guide if it is up. Returns the number of cards seen. */
export async function dismissFirstRunGuide(page, { timeout = 1200 } = {}) {
  const dialog = page.getByRole('dialog').filter({ hasText: 'One era at a time' });
  const open = await dialog.isVisible({ timeout }).catch(() => false);
  if (!open) return 0;

  let seen = 0;
  for (let i = 0; i < 6; i++) {
    const button = page.getByRole('button', { name: /^(next|begin)$/i });
    if (!(await button.isVisible().catch(() => false))) break;
    await button.click();
    seen++;
    await page.waitForTimeout(240);
    if ((await page.getByRole('dialog').count()) === 0) break;
  }
  return seen;
}

/**
 * Mark the guide seen BEFORE the app mounts, for probes that are measuring the
 * run screen rather than a new player's first minute. Call after `goto` of the
 * origin, then reload.
 */
export async function skipFirstRunGuide(page) {
  await page.evaluate(() => {
    const KEY = 'evil-wizard-sim:collection';
    const raw = localStorage.getItem(KEY);
    const c = raw ? JSON.parse(raw) : { version: 2, discoveredArtifactIds: [], endingsSeen: [], runsCompleted: 0, bestNotoriety: 0 };
    localStorage.setItem(KEY, JSON.stringify({ ...c, version: 2, tutorialSeen: true }));
  });
}
