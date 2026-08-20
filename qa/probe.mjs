/** Dump the interactive DOM at each stage so the harness can use real selectors. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE.ERR:', m.text()));

const dump = async (label) => {
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, input, [role="button"]')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 58),
      disabled: el.hasAttribute('disabled'),
      attrs: [...el.attributes]
        .filter((a) => a.name.startsWith('data-') || a.name === 'type' || a.name === 'aria-label')
        .map((a) => `${a.name}=${a.value}`)
        .join(' '),
    }));
    return { title: document.title, count: btns.length, btns };
  });
  console.log(`\n===== ${label} (${info.count} interactive) =====`);
  for (const b of info.btns) {
    console.log(`  ${b.disabled ? '[x]' : '[ ]'} <${b.tag}> "${b.text}" | ${b.attrs}`);
  }
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await dump('TITLE');

await page.getByRole('button', { name: /begin|new run|start/i }).first().click();
await page.waitForTimeout(500);
await dump('CREATION');

const tb = page.getByRole('textbox').first();
await tb.fill('Malachar the Unpaid');
await page.waitForTimeout(300);
await dump('CREATION (name filled)');

await browser.close();
