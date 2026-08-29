/**
 * Where does the identity line actually break?
 *
 * The header now reads "Name, epithet." as one run of text. A PNG showed the
 * comma orphaned at the head of line two in one era and correctly glued to the
 * name in another, which is exactly the kind of thing CLAUDE.md § 7 says not to
 * diagnose by squinting at a screenshot.
 *
 * This measures it: a Range around the single comma character, versus a Range
 * around the last character of the name. Same line box => glued. Different
 * top => the comma orphaned.
 *
 * It drives the real app so the real stylesheet, fonts and container query are
 * in play, then rewrites the two text nodes to sweep name/epithet lengths.
 */
import { chromium } from 'playwright';

const URL = process.env.EWS_URL ?? 'http://localhost:5173';
const WIDTH = Number(process.env.EWS_WIDTH ?? 393);

/* Every tier name, because the badge sits in an `auto` column and the tier is
   the widest thing in it — so the name's available width CHANGES as notoriety
   climbs. "Unknown" is era one and the roomiest case; measuring only that is
   how the orphaned comma got missed. */
const TIERS = ['Unknown', 'Local Menace', 'Named Threat', 'Kingdom-Level', 'Legend'];

const NAMES = [
  ['Malachar the Unpaid', 'the Locally Disliked'],
  ['Vex', 'the Unpleasant'],
  ['Grimhilde Ashgrave', 'the Locally Disliked'],
  ['Bartholomew Nightshade', 'the Insufficiently Feared'],
  ['Aaaaaaaaaaaaaaaaaaaaaaaa', 'the Locally Disliked'],
];

const CASES = TIERS.flatMap((tier) => NAMES.map(([n, e]) => [n, e, tier]));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: 852 },
  deviceScaleFactor: 2,
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).first().click();
const field = page.getByRole('textbox').first();
await field.waitFor({ state: 'visible', timeout: 5000 });
await field.fill('Malachar the Unpaid');
await page.getByRole('button', { name: /begin the career/i }).first().click();
await page.waitForTimeout(600);

const rows = await page.evaluate((cases) => {
  const h1 = document.querySelector('h1');
  if (!h1) return [{ error: 'no h1 on the run screen' }];
  const line = h1.parentElement;
  // The epithet is the inline span immediately after the name.
  const epithet = h1.nextElementSibling;
  if (!epithet) return [{ error: 'no epithet span after the name' }];

  /** Bounding rect of one character inside a text node. */
  const charRect = (node, index) => {
    const r = document.createRange();
    r.setStart(node, index);
    r.setEnd(node, index + 1);
    return r.getBoundingClientRect();
  };

  // The tier caption inside the badge — the last child of the badge element.
  const badge = document.querySelector('header [aria-label^="Notoriety"]')?.parentElement;
  const tierEl = badge?.lastElementChild ?? null;

  const out = [];
  for (const [name, ep, tier] of cases) {
    h1.textContent = name;
    h1.style.setProperty('--name-len', String(name.length));
    epithet.textContent = `, ${ep}.`;
    if (tierEl) tierEl.textContent = tier;

    // Force layout, then measure.
    void line.offsetHeight;

    const nameNode = h1.firstChild;
    const epNode = epithet.firstChild;
    const lastName = charRect(nameNode, name.length - 1);
    const comma = charRect(epNode, 0);
    const lineRect = line.getBoundingClientRect();

    out.push({
      name,
      ep,
      nameSize: parseFloat(getComputedStyle(h1).fontSize).toFixed(1),
      /*
       * Same line box iff the two rects OVERLAP VERTICALLY.
       *
       * Not `top === top`: the name is 28px and the epithet ~17px, so on a
       * single shared line their tops differ by the size gap while their
       * baselines agree. Comparing tops reported every case as orphaned,
       * including "Vex · the Unpleasant" — one 30px-tall line.
       */
      glued: comma.top < lastName.bottom - 1 && lastName.top < comma.bottom - 1,
      nameTop: Math.round(lastName.top),
      nameBottom: Math.round(lastName.bottom),
      commaTop: Math.round(comma.top),
      commaLeft: Math.round(comma.left),
      nameRight: Math.round(lastName.right),
      tier,
      identityWidth: Math.round(line.getBoundingClientRect().width),
      lineHeight: Math.round(lineRect.height),
      overflows: Math.round(lineRect.right) > Math.round(line.parentElement.getBoundingClientRect().right) + 1,
    });
  }
  return out;
}, CASES);

console.log(`\n  identity line @${WIDTH}px\n`);
for (const r of rows) {
  if (r.error) {
    console.log(`  ! ${r.error}`);
    continue;
  }
  const flag = r.glued ? '  ok  ' : ' ORPH ';
  const over = r.overflows ? '  OVERFLOWS' : '';
  console.log(
    `${flag} ${String(r.nameSize).padStart(5)}px  h=${String(r.lineHeight).padStart(3)}  ` +
      `w=${String(r.identityWidth).padStart(3)}  tier="${r.tier}"`.padEnd(28) + `  ` +
      `comma y${r.commaTop} x${r.commaLeft}  "${r.name}" + "${r.ep}"${over}`,
  );
}
const bad = rows.filter((r) => !r.error && !r.glued).length;
const over = rows.filter((r) => !r.error && r.overflows).length;
console.log(`\n  ${rows.length} cases · ${bad} orphaned comma · ${over} overflowing\n`);

await browser.close();
process.exit(bad || over ? 1 : 0);
