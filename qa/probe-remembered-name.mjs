/**
 * Does the second career open on the first career's name?
 *
 * Asserted in the hook already; this checks the half a hook test cannot — that
 * the value reaches the input, and that it arrives SELECTED, so a player who
 * wants a different wizard types over it instead of clearing it by hand.
 */
import { chromium } from 'playwright';
import { dismissFirstRunGuide } from './first-run.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

// ---- first career, named by hand -----------------------------------------
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(300);
const firstFieldValue = await page.getByRole('textbox').first().inputValue();
await page.getByRole('textbox').first().fill('Vashter of the Long Arrears');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);
await dismissFirstRunGuide(page);

// ---- leave, come back -----------------------------------------------------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.getByRole('button', { name: /begin a career|another career/i }).first().click();
await page.waitForTimeout(400);

const field = page.getByRole('textbox').first();
const remembered = await field.inputValue();
const selection = await page.evaluate(() => {
  const el = document.querySelector('input');
  return { start: el.selectionStart, end: el.selectionEnd, len: el.value.length };
});

// Typing must replace the whole remembered name, not append to it.
await page.keyboard.type('Nine');
const afterTyping = await field.inputValue();

console.log(
  JSON.stringify(
    {
      firstFieldValue,
      remembered,
      selectedWholeName: selection.start === 0 && selection.end === selection.len,
      afterTyping,
      problems,
    },
    null,
    2,
  ),
);
await browser.close();
process.exit(
  firstFieldValue === '' &&
    remembered === 'Vashter of the Long Arrears' &&
    afterTyping === 'Nine' &&
    problems.length === 0
    ? 0
    : 1,
);
